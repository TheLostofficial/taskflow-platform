import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import Task from '../models/Task.js';
import Project from '../models/Project.js';

const router = express.Router();

router.get('/project/:projectId', authenticateToken, async (req, res) => {
  try {
    const project = await Project.findOne({
      _id: req.params.projectId,
      $or: [
        { owner: req.user._id },
        { 'members.user': req.user._id }
      ]
    });

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const tasks = await Task.find({ project: req.params.projectId })
      .populate('creator', 'name email')
      .populate('assignee', 'name email')
      .sort({ position: 1, createdAt: -1 });

    res.json({
      message: 'Tasks retrieved successfully',
      tasks
    });
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({ message: 'Server error while fetching tasks' });
  }
});

router.post('/', authenticateToken, async (req, res) => {
  try {
    const { title, description, project, status, priority } = req.body;

    if (!title || !project) {
      return res.status(400).json({ message: 'Title and project are required' });
    }

    const projectDoc = await Project.findOne({
      _id: project,
      $or: [
        { owner: req.user._id },
        { 'members.user': req.user._id, 'members.permissions.canEdit': true }
      ]
    });

    if (!projectDoc) {
      return res.status(404).json({ message: 'Project not found or edit access denied' });
    }

    const lastTask = await Task.findOne({ project, status }).sort({ position: -1 });
    const position = lastTask ? lastTask.position + 1 : 0;

    const task = new Task({
      title: title.trim(),
      description: description?.trim() || '',
      project,
      creator: req.user._id,
      status: status || 'To Do',
      priority: priority || 'medium',
      position
    });

    await task.save();
    await task.populate('creator', 'name email');
    await task.populate('assignee', 'name email');

    res.status(201).json({
      message: 'Task created successfully',
      task
    });
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({ message: 'Server error while creating task' });
  }
});

router.put('/:taskId', authenticateToken, async (req, res) => {
  try {
    const { taskId } = req.params;
    const updateData = req.body;

    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const project = await Project.findOne({
      _id: task.project,
      $or: [
        { owner: req.user._id },
        { 'members.user': req.user._id, 'members.permissions.canEdit': true }
      ]
    });

    if (!project) {
      return res.status(404).json({ message: 'Project not found or edit access denied' });
    }

    const allowedUpdates = ['title', 'description', 'status', 'priority', 'assignee', 'dueDate', 'position'];
    allowedUpdates.forEach(field => {
      if (updateData[field] !== undefined) {
        task[field] = updateData[field];
      }
    });

    await task.save();
    await task.populate('creator', 'name email');
    await task.populate('assignee', 'name email');

    res.json({
      message: 'Task updated successfully',
      task
    });
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({ message: 'Server error while updating task' });
  }
});

router.delete('/:taskId', authenticateToken, async (req, res) => {
  try {
    const { taskId } = req.params;

    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const project = await Project.findOne({
      _id: task.project,
      $or: [
        { owner: req.user._id },
        { 'members.user': req.user._id, 'members.permissions.canDelete': true }
      ]
    });

    if (!project) {
      return res.status(404).json({ message: 'Project not found or delete access denied' });
    }

    await Task.findByIdAndDelete(taskId);

    res.json({
      message: 'Task deleted successfully'
    });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({ message: 'Server error while deleting task' });
  }
});

export default router;
