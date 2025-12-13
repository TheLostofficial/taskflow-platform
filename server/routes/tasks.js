import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import Task from '../models/Task.js';
import Project from '../models/Project.js';
import * as taskController from '../controllers/taskController.js';

const router = express.Router();

// Функции для WebSocket уведомлений (оставляем как было)
const notifyTaskCreated = (req, task) => {
  if (req.app.get('socketServer')) {
    req.app.get('socketServer').notifyTaskCreated(
      task.project, 
      task, 
      req.user._id
    );
  }
};

const notifyTaskUpdated = (req, task) => {
  if (req.app.get('socketServer')) {
    req.app.get('socketServer').notifyTaskUpdated(
      task.project, 
      task, 
      req.user._id
    );
  }
};

const notifyTaskDeleted = (req, projectId, taskId) => {
  if (req.app.get('socketServer')) {
    req.app.get('socketServer').notifyTaskDeleted(
      projectId, 
      taskId, 
      req.user._id
    );
  }
};

// СУЩЕСТВУЮЩИЕ МАРШРУТЫ (оставляем как было, но используем контроллер)
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

    // Отправляем WebSocket уведомление
    notifyTaskCreated(req, task);

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

    // Отправляем WebSocket уведомление
    notifyTaskUpdated(req, task);

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

    const projectId = task.project;

    await Task.findByIdAndDelete(taskId);

    // Отправляем WebSocket уведомление
    notifyTaskDeleted(req, projectId, taskId);

    res.json({
      message: 'Task deleted successfully'
    });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({ message: 'Server error while deleting task' });
  }
});

// НОВЫЕ МАРШРУТЫ ДЛЯ КОММЕНТАРИЕВ (используем контроллер)
router.post('/:taskId/comments', authenticateToken, taskController.addComment);
router.put('/:taskId/comments/:commentId', authenticateToken, taskController.updateComment);
router.delete('/:taskId/comments/:commentId', authenticateToken, taskController.deleteComment);

// НОВЫЕ МАРШРУТЫ ДЛЯ СТАТУСА И ЧЕКЛИСТА (используем контроллер)
router.patch('/:taskId/status', authenticateToken, taskController.updateTaskStatus);
router.patch('/:taskId/checklist', authenticateToken, taskController.updateChecklist);

// НОВЫЕ МАРШРУТЫ ДЛЯ СТАТИСТИКИ (используем контроллер)
router.get('/stats/user', authenticateToken, taskController.getUserTaskStats);
router.get('/stats/project/:projectId', authenticateToken, taskController.getProjectStats);
router.get('/activity/recent', authenticateToken, taskController.getRecentActivity);

// МАРШРУТ ДЛЯ ПОЛУЧЕНИЯ ЗАДАЧИ ПО ID (используем контроллер)
router.get('/:taskId', authenticateToken, taskController.getTaskById);

export default router;
