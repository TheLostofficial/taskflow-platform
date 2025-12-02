import Task from '../models/Task.js';
import Project from '../models/Project.js';

export const createTask = async (req, res) => {
  try {
    const { title, description, project, status, priority = 'medium', assignee, dueDate, labels } = req.body;

    if (!title || !project) {
      return res.status(400).json({ message: 'Title and project are required' });
    }

    // Проверяем доступ к проекту
    const projectDoc = await Project.findById(project);
    
    if (!projectDoc) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const isMember = projectDoc.members.some(member => 
      member.user.toString() === req.user._id.toString()
    );

    if (!isMember) {
      return res.status(403).json({ message: 'No access to this project' });
    }

    // Проверяем права на редактирование
    const member = projectDoc.members.find(m => 
      m.user.toString() === req.user._id.toString()
    );

    if (!member || !member.permissions.canEdit) {
      return res.status(403).json({ message: 'No permission to create tasks' });
    }

    const task = new Task({
      title,
      description: description || '',
      project,
      creator: req.user._id,
      status: status || projectDoc.settings.columns[0] || 'To Do',
      priority,
      assignee: assignee || null,
      dueDate: dueDate || null,
      labels: labels || [],
      position: 0 // Будет обновлено позже
    });

    await task.save();

    // Отправляем событие через WebSocket
    const socketServer = req.app.get('socketServer');
    if (socketServer) {
      socketServer.notifyTaskCreated(project, task, req.user._id);
    }

    res.status(201).json({
      message: 'Task created successfully',
      task
    });
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({ message: 'Error creating task', error: error.message });
  }
};

export const getProjectTasks = async (req, res) => {
  try {
    const { projectId } = req.params;

    // Проверяем доступ к проекту
    const project = await Project.findById(projectId);
    
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const isMember = project.members.some(member => 
      member.user.toString() === req.user._id.toString()
    );

    if (!isMember && !project.settings.isPublic) {
      return res.status(403).json({ message: 'No access to this project' });
    }

    const tasks = await Task.find({ project: projectId })
      .populate('creator', 'name email avatar')
      .populate('assignee', 'name email avatar')
      .populate('comments.author', 'name email avatar')
      .sort({ position: 1, createdAt: -1 });

    res.json({
      message: 'Tasks fetched successfully',
      tasks
    });
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({ message: 'Error fetching tasks', error: error.message });
  }
};

export const getTaskById = async (req, res) => {
  try {
    const { taskId } = req.params;

    const task = await Task.findById(taskId)
      .populate('creator', 'name email avatar')
      .populate('assignee', 'name email avatar')
      .populate('comments.author', 'name email avatar')
      .populate('comments.mentions', 'name email');

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Проверяем доступ к проекту
    const project = await Project.findById(task.project);
    
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const isMember = project.members.some(member => 
      member.user.toString() === req.user._id.toString()
    );

    if (!isMember && !project.settings.isPublic) {
      return res.status(403).json({ message: 'No access to this task' });
    }

    res.json({
      message: 'Task fetched successfully',
      task
    });
  } catch (error) {
    console.error('Get task error:', error);
    res.status(500).json({ message: 'Error fetching task', error: error.message });
  }
};

export const updateTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const updateData = req.body;

    const task = await Task.findById(taskId);

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Проверяем доступ к проекту
    const project = await Project.findById(task.project);
    
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const member = project.members.find(m => 
      m.user.toString() === req.user._id.toString()
    );

    if (!member || !member.permissions.canEdit) {
      return res.status(403).json({ message: 'No permission to update tasks' });
    }

    // Сохраняем старые значения для WebSocket уведомления
    const oldTask = { ...task.toObject() };

    // Обновляем поля
    Object.keys(updateData).forEach(key => {
      if (key !== '_id' && key !== 'creator' && key !== 'project') {
        task[key] = updateData[key];
      }
    });

    await task.save();

    // Отправляем событие через WebSocket
    const socketServer = req.app.get('socketServer');
    if (socketServer) {
      socketServer.notifyTaskUpdated(task.project, task, req.user._id);
    }

    res.json({
      message: 'Task updated successfully',
      task
    });
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({ message: 'Error updating task', error: error.message });
  }
};

export const deleteTask = async (req, res) => {
  try {
    const { taskId } = req.params;

    const task = await Task.findById(taskId);

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Проверяем доступ к проекту
    const project = await Project.findById(task.project);
    
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const member = project.members.find(m => 
      m.user.toString() === req.user._id.toString()
    );

    // Только владелец задачи или администратор проекта может удалить
    const isOwner = task.creator.toString() === req.user._id.toString();
    const canDelete = member && member.permissions.canDelete;

    if (!isOwner && !canDelete) {
      return res.status(403).json({ message: 'No permission to delete this task' });
    }

    await task.deleteOne();

    // Отправляем событие через WebSocket
    const socketServer = req.app.get('socketServer');
    if (socketServer) {
      socketServer.notifyTaskDeleted(task.project, taskId, req.user._id);
    }

    res.json({
      message: 'Task deleted successfully'
    });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({ message: 'Error deleting task', error: error.message });
  }
};

export const addComment = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { content, mentions = [] } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ message: 'Comment content is required' });
    }

    const task = await Task.findById(taskId);

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Проверяем доступ к проекту
    const project = await Project.findById(task.project);
    
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const isMember = project.members.some(member => 
      member.user.toString() === req.user._id.toString()
    );

    if (!isMember && !project.settings.isPublic) {
      return res.status(403).json({ message: 'No access to this task' });
    }

    const comment = await task.addComment({
      author: req.user._id,
      content: content.trim(),
      mentions
    });

    // Отправляем событие через WebSocket
    const socketServer = req.app.get('socketServer');
    if (socketServer) {
      socketServer.notifyCommentAdded(taskId, comment, task.project, req.user._id);
      
      // Отправляем уведомления упомянутым пользователям
      if (mentions && mentions.length > 0) {
        mentions.forEach(userId => {
          if (userId.toString() !== req.user._id.toString()) {
            socketServer.notifyUserMentioned(userId, {
              taskId,
              taskTitle: task.title,
              commentId: comment._id,
              commentedBy: req.user._id
            });
          }
        });
      }
    }

    const populatedComment = await Task.findById(taskId)
      .populate({
        path: 'comments',
        populate: {
          path: 'author',
          select: 'name email avatar'
        }
      });

    res.json({
      message: 'Comment added successfully',
      comment: populatedComment.comments.id(comment._id)
    });
  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({ message: 'Error adding comment', error: error.message });
  }
};

export const updateComment = async (req, res) => {
  try {
    const { taskId, commentId } = req.params;
    const { content, mentions } = req.body;

    const task = await Task.findById(taskId);

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const comment = await task.updateComment(commentId, { content, mentions }, req.user._id);

    res.json({
      message: 'Comment updated successfully',
      comment
    });
  } catch (error) {
    console.error('Update comment error:', error);
    if (error.message.includes('Not authorized')) {
      return res.status(403).json({ message: error.message });
    }
    res.status(500).json({ message: 'Error updating comment', error: error.message });
  }
};

export const deleteComment = async (req, res) => {
  try {
    const { taskId, commentId } = req.params;

    const task = await Task.findById(taskId);

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    await task.deleteComment(commentId, req.user._id);

    res.json({
      message: 'Comment deleted successfully'
    });
  } catch (error) {
    console.error('Delete comment error:', error);
    if (error.message.includes('Not authorized')) {
      return res.status(403).json({ message: error.message });
    }
    res.status(500).json({ message: 'Error deleting comment', error: error.message });
  }
};

export const updateTaskStatus = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { status, position } = req.body;

    if (!status) {
      return res.status(400).json({ message: 'Status is required' });
    }

    const task = await Task.findById(taskId);

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Проверяем доступ к проекту
    const project = await Project.findById(task.project);
    
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const member = project.members.find(m => 
      m.user.toString() === req.user._id.toString()
    );

    if (!member || !member.permissions.canEdit) {
      return res.status(403).json({ message: 'No permission to update task' });
    }

    task.status = status;
    if (position !== undefined) {
      task.position = position;
    }

    await task.save();

    // Отправляем событие через WebSocket
    const socketServer = req.app.get('socketServer');
    if (socketServer) {
      socketServer.notifyTaskUpdated(task.project, task, req.user._id);
    }

    res.json({
      message: 'Task status updated successfully',
      task
    });
  } catch (error) {
    console.error('Update task status error:', error);
    res.status(500).json({ message: 'Error updating task status', error: error.message });
  }
};

export const updateChecklist = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { checklist } = req.body;

    const task = await Task.findById(taskId);

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Проверяем доступ к проекту
    const project = await Project.findById(task.project);
    
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const member = project.members.find(m => 
      m.user.toString() === req.user._id.toString()
    );

    if (!member || !member.permissions.canEdit) {
      return res.status(403).json({ message: 'No permission to update task' });
    }

    task.checklist = checklist;
    await task.save();

    res.json({
      message: 'Checklist updated successfully',
      task
    });
  } catch (error) {
    console.error('Update checklist error:', error);
    res.status(500).json({ message: 'Error updating checklist', error: error.message });
  }
};