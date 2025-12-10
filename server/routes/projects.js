import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import Project from '../models/Project.js';
import Task from '../models/Task.js';
import mongoose from 'mongoose';

const router = express.Router();

// Middleware для валидации ObjectId
const validateObjectId = (req, res, next) => {
  const { id } = req.params;
  
  if (!id || id === 'undefined') {
    return res.status(400).json({ message: 'Project ID is required' });
  }
  
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'Invalid project ID format' });
  }
  
  next();
};

// Получить проекты с количеством задач
router.get('/', authenticateToken, async (req, res) => {
  try {
    const projects = await Project.find({
      $or: [
        { owner: req.user._id },
        { 'members.user': req.user._id }
      ]
    })
    .populate('owner', 'name email')
    .populate('members.user', 'name email')
    .sort({ createdAt: -1 });

    // Добавляем количество задач для каждого проекта
    const projectsWithTaskCount = await Promise.all(
      projects.map(async (project) => {
        const taskCount = await Task.countDocuments({ project: project._id });
        const projectObj = project.toObject();
        return {
          ...projectObj,
          taskCount
        };
      })
    );

    res.json({
      message: 'Projects retrieved successfully',
      projects: projectsWithTaskCount
    });
  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({ message: 'Server error while fetching projects' });
  }
});

// Создать проект с выбранным шаблоном
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, description, settings, tags, isPublic, template = 'kanban' } = req.body;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ message: 'Project name is required' });
    }

    // Определяем колонки по шаблону
    let columns = ['To Do', 'In Progress', 'Done'];
    if (template === 'scrum') {
      columns = ['Backlog', 'Sprint Planning', 'In Progress', 'Review', 'Done'];
    } else if (template === 'custom') {
      columns = settings?.columns || ['To Do', 'In Progress', 'Done'];
    }

    const project = new Project({
      name: name.trim(),
      description: description?.trim() || '',
      owner: req.user._id,
      members: [{
        user: req.user._id,
        role: 'owner',
        permissions: {
          canEdit: true,
          canDelete: true,
          canInvite: true
        }
      }],
      settings: {
        template: template,
        columns: columns,
        isPublic: isPublic || false,
        ...settings
      },
      tags: tags || []
    });

    await project.save();
    await project.populate('owner', 'name email avatar');
    await project.populate('members.user', 'name email avatar');

    res.status(201).json({
      message: 'Project created successfully',
      project: project.toObject()
    });
  } catch (error) {
    console.error('Create project error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Project with this name already exists' });
    }
    res.status(500).json({ message: 'Server error while creating project' });
  }
});

router.get('/:id', authenticateToken, validateObjectId, async (req, res) => {
  try {
    const project = await Project.findOne({
      _id: req.params.id,
      $or: [
        { owner: req.user._id },
        { 'members.user': req.user._id }
      ]
    })
    .populate('owner', 'name email avatar')
    .populate('members.user', 'name email avatar');

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Получаем количество задач
    const taskCount = await Task.countDocuments({ project: project._id });
    const projectObj = project.toObject();
    projectObj.taskCount = taskCount;

    res.json({
      message: 'Project retrieved successfully',
      project: projectObj
    });
  } catch (error) {
    console.error('Get project error:', error);
    res.status(500).json({ message: 'Server error while fetching project' });
  }
});

router.put('/:id', authenticateToken, validateObjectId, async (req, res) => {
  try {
    const { name, description, settings, tags, status, template } = req.body;
    
    const project = await Project.findOne({
      _id: req.params.id,
      $or: [
        { owner: req.user._id },
        { 'members.user': req.user._id, 'members.permissions.canEdit': true }
      ]
    });

    if (!project) {
      return res.status(404).json({ message: 'Project not found or access denied' });
    }

    if (name) project.name = name.trim();
    if (description !== undefined) project.description = description.trim();
    if (settings) project.settings = { ...project.settings, ...settings };
    if (tags) project.tags = tags;
    if (status) project.status = status;
    if (template) {
      project.settings.template = template;
      // Обновляем колонки по шаблону
      if (template === 'scrum') {
        project.settings.columns = ['Backlog', 'Sprint Planning', 'In Progress', 'Review', 'Done'];
      } else if (template === 'kanban') {
        project.settings.columns = ['To Do', 'In Progress', 'Done'];
      }
    }

    await project.save();
    await project.populate('owner', 'name email avatar');
    await project.populate('members.user', 'name email avatar');

    res.json({
      message: 'Project updated successfully',
      project
    });
  } catch (error) {
    console.error('Update project error:', error);
    res.status(500).json({ message: 'Server error while updating project' });
  }
});

router.delete('/:id', authenticateToken, validateObjectId, async (req, res) => {
  try {
    const project = await Project.findOne({
      _id: req.params.id,
      $or: [
        { owner: req.user._id },
        { 'members.user': req.user._id, 'members.permissions.canDelete': true }
      ]
    });

    if (!project) {
      return res.status(404).json({ message: 'Project not found or access denied' });
    }

    // Удаляем все задачи проекта
    await Task.deleteMany({ project: project._id });
    
    // Удаляем проект
    await Project.findByIdAndDelete(req.params.id);

    res.json({
      message: 'Project deleted successfully'
    });
  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({ message: 'Server error while deleting project' });
  }
});

// Архивировать проект
router.patch('/:id/archive', authenticateToken, validateObjectId, async (req, res) => {
  try {
    const project = await Project.findOne({
      _id: req.params.id,
      owner: req.user._id
    });

    if (!project) {
      return res.status(404).json({ message: 'Project not found or access denied' });
    }

    project.status = project.status === 'archived' ? 'active' : 'archived';
    await project.save();

    res.json({
      message: `Project ${project.status === 'archived' ? 'archived' : 'restored'} successfully`,
      project
    });
  } catch (error) {
    console.error('Archive project error:', error);
    res.status(500).json({ message: 'Server error while archiving project' });
  }
});

// Изменить роль участника
router.patch('/:id/members/:userId/role', authenticateToken, validateObjectId, async (req, res) => {
  try {
    const { role } = req.body;
    const { id: projectId, userId } = req.params;

    const project = await Project.findOne({
      _id: projectId,
      owner: req.user._id
    });

    if (!project) {
      return res.status(404).json({ message: 'Project not found or access denied' });
    }

    const member = project.members.find(m => m.user.toString() === userId);
    if (!member) {
      return res.status(404).json({ message: 'Member not found' });
    }

    // Нельзя изменить роль владельца
    if (member.role === 'owner') {
      return res.status(400).json({ message: 'Cannot change owner role' });
    }

    member.role = role;
    member.permissions = project.getPermissionsByRole(role);
    
    await project.save();
    await project.populate('members.user', 'name email avatar');

    res.json({
      message: 'Member role updated successfully',
      members: project.members
    });
  } catch (error) {
    console.error('Update member role error:', error);
    res.status(500).json({ message: 'Server error while updating member role' });
  }
});

export default router;
