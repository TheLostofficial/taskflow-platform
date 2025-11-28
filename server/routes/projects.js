import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import Project from '../models/Project.js';

const router = express.Router();

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

    res.json({
      message: 'Projects retrieved successfully',
      projects
    });
  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({ message: 'Server error while fetching projects' });
  }
});

router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, description, settings, tags, isPublic, template } = req.body;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ message: 'Project name is required' });
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
        template: template || 'kanban',
        columns: ['To Do', 'In Progress', 'Done'],
        isPublic: isPublic || false,
        ...settings
      },
      tags: tags || []
    });

    await project.save();
    await project.populate('owner', 'name email');
    await project.populate('members.user', 'name email');

    res.status(201).json({
      message: 'Project created successfully',
      project
    });
  } catch (error) {
    console.error('Create project error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Project with this name already exists' });
    }
    res.status(500).json({ message: 'Server error while creating project' });
  }
});

router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const project = await Project.findOne({
      _id: req.params.id,
      $or: [
        { owner: req.user._id },
        { 'members.user': req.user._id }
      ]
    })
    .populate('owner', 'name email')
    .populate('members.user', 'name email');

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    res.json({
      message: 'Project retrieved successfully',
      project
    });
  } catch (error) {
    console.error('Get project error:', error);
    res.status(500).json({ message: 'Server error while fetching project' });
  }
});

router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { name, description, settings, tags, status } = req.body;
    
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

    await project.save();
    await project.populate('owner', 'name email');
    await project.populate('members.user', 'name email');

    res.json({
      message: 'Project updated successfully',
      project
    });
  } catch (error) {
    console.error('Update project error:', error);
    res.status(500).json({ message: 'Server error while updating project' });
  }
});

router.delete('/:id', authenticateToken, async (req, res) => {
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

    await Project.findByIdAndDelete(req.params.id);

    res.json({
      message: 'Project deleted successfully'
    });
  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({ message: 'Server error while deleting project' });
  }
});

export default router;
