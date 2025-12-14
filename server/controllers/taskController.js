import Task from '../models/Task.js';
import Project from '../models/Project.js';
import path from 'path';
import fs from 'fs';

// Вспомогательная функция для записи истории
const addHistory = (task, userId, action, details, oldValue, newValue) => {
  task.history = task.history || [];
  task.history.push({
    user: userId,
    action,
    details: details || '',
    oldValue,
    newValue,
    timestamp: new Date()
  });
};

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
      columnIndex: 0,
      position: 0
    });

    // Добавляем запись в историю
    addHistory(task, req.user._id, 'created', `Задача "${title}" создана`, null, title);

    await task.save();

    // Загружаем с populate для WebSocket
    const populatedTask = await Task.findById(task._id)
      .populate('creator', 'name email avatar')
      .populate('assignee', 'name email avatar')
      .populate('history.user', 'name email avatar');

    // Отправляем событие через WebSocket
    const socketServer = req.app.get('socketServer');
    if (socketServer) {
      socketServer.notifyTaskCreated(project, populatedTask, req.user._id);
    }

    res.status(201).json({
      message: 'Task created successfully',
      task: populatedTask
    });
  } catch (error) {
    console.error('❌ [CONTROLLER] Create task error:', error);
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
      .populate('comments.user', 'name email avatar')
      .populate('history.user', 'name email avatar')
      .sort({ columnIndex: 1, position: 1, createdAt: -1 });

    res.json({
      message: 'Tasks fetched successfully',
      tasks
    });
  } catch (error) {
    console.error('❌ [CONTROLLER] Get tasks error:', error);
    res.status(500).json({ message: 'Error fetching tasks', error: error.message });
  }
};

export const getTaskById = async (req, res) => {
  try {
    const { taskId } = req.params;

    const task = await Task.findById(taskId)
      .populate('creator', 'name email avatar')
      .populate('assignee', 'name email avatar')
      .populate('comments.user', 'name email avatar')
      .populate('history.user', 'name email avatar');

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
    console.error('❌ [CONTROLLER] Get task error:', error);
    res.status(500).json({ message: 'Error fetching task', error: error.message });
  }
};

export const updateTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const updateData = req.body;

    console.log(`✏️ [CONTROLLER] Обновление задачи ${taskId}:`, updateData);

    const task = await Task.findById(taskId);

    if (!task) {
      console.log(`❌ [CONTROLLER] Задача ${taskId} не найдена`);
      return res.status(404).json({ message: 'Task not found' });
    }

    // Проверяем доступ к проекту
    const project = await Project.findById(task.project);
    
    if (!project) {
      console.log(`❌ [CONTROLLER] Проект задачи ${taskId} не найден`);
      return res.status(404).json({ message: 'Project not found' });
    }

    const member = project.members.find(m => 
      m.user.toString() === req.user._id.toString()
    );

    if (!member || !member.permissions.canEdit) {
      console.log(`❌ [CONTROLLER] Пользователь ${req.user._id} не имеет прав на обновление задачи ${taskId}`);
      return res.status(403).json({ message: 'No permission to update tasks' });
    }

    // Сохраняем старые значения для истории
    const oldTask = { ...task.toObject() };

    // Обновляем разрешенные поля и добавляем историю
    const allowedFields = ['title', 'description', 'status', 'priority', 'dueDate', 'assignee', 'labels', 'columnIndex', 'position', 'estimatedTime', 'actualTime', 'checklist'];
    
    allowedFields.forEach(field => {
      if (updateData[field] !== undefined) {
        const oldValue = task[field];
        const newValue = updateData[field];
        
        if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
          // Добавляем запись в историю для измененных полей
          switch (field) {
            case 'title':
              addHistory(task, req.user._id, 'updated', `Название изменено`, oldValue, newValue);
              break;
            case 'description':
              addHistory(task, req.user._id, 'updated', `Описание изменено`, null, null);
              break;
            case 'status':
              addHistory(task, req.user._id, 'status_changed', `Статус изменен`, oldValue, newValue);
              break;
            case 'priority':
              addHistory(task, req.user._id, 'updated', `Приоритет изменен`, oldValue, newValue);
              break;
            case 'assignee':
              addHistory(task, req.user._id, 'assigned', `Исполнитель изменен`, null, null);
              break;
            case 'dueDate':
              addHistory(task, req.user._id, 'updated', `Срок выполнения изменен`, oldValue, newValue);
              break;
            case 'checklist':
              addHistory(task, req.user._id, 'checklist_updated', `Чеклист обновлен`, null, null);
              break;
            default:
              addHistory(task, req.user._id, 'updated', `Поле "${field}" изменено`, oldValue, newValue);
          }
        }
        
        task[field] = newValue;
      }
    });

    await task.save();

    // Загружаем обновленную задачу с populate
    const updatedTask = await Task.findById(task._id)
      .populate('creator', 'name email avatar')
      .populate('assignee', 'name email avatar')
      .populate('comments.user', 'name email avatar')
      .populate('history.user', 'name email avatar');

    console.log(`✅ [CONTROLLER] Задача ${taskId} успешно обновлена`);

    // Отправляем событие через WebSocket
    const socketServer = req.app.get('socketServer');
    if (socketServer) {
      socketServer.notifyTaskUpdated(task.project, updatedTask, req.user._id);
    }

    res.json({
      message: 'Task updated successfully',
      task: updatedTask
    });
  } catch (error) {
    console.error('❌ [CONTROLLER] Ошибка обновления задачи:', error);
    res.status(500).json({ 
      message: 'Error updating task', 
      error: error.message 
    });
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
    console.error('❌ [CONTROLLER] Delete task error:', error);
    res.status(500).json({ message: 'Error deleting task', error: error.message });
  }
};

export const addComment = async (req, res) => {
  try {
    const { taskId } = req.params;
    const content = req.body.content;
    const mentions = req.body.mentions || [];
    let attachments = [];

    console.log(`💬 [CONTROLLER] Добавление комментария к задаче ${taskId}:`, { content, mentions });

    if (!content || !content.trim()) {
      return res.status(400).json({ message: 'Comment content is required' });
    }

    const task = await Task.findById(taskId);

    if (!task) {
      console.log(`❌ [CONTROLLER] Задача ${taskId} не найдена`);
      return res.status(404).json({ message: 'Task not found' });
    }

    // Проверяем доступ к проекту
    const project = await Project.findById(task.project);
    
    if (!project) {
      console.log(`❌ [CONTROLLER] Проект задачи ${taskId} не найден`);
      return res.status(404).json({ message: 'Project not found' });
    }

    const isMember = project.members.some(member => 
      member.user.toString() === req.user._id.toString()
    );

    if (!isMember && !project.settings.isPublic) {
      console.log(`❌ [CONTROLLER] Пользователь ${req.user._id} не имеет доступа к задаче ${taskId}`);
      return res.status(403).json({ message: 'No access to this task' });
    }

    // Создаем новый комментарий
    const newComment = {
      user: req.user._id,
      content: content.trim(),
      createdAt: new Date(),
      attachments: attachments
    };

    // Добавляем комментарий к задаче
    task.comments = task.comments || [];
    task.comments.push(newComment);

    // Добавляем запись в историю
    addHistory(task, req.user._id, 'commented', `Добавлен комментарий`, null, content.substring(0, 100));

    await task.save();

    // Загружаем комментарий с populate
    const updatedTask = await Task.findById(taskId)
      .populate('creator', 'name email avatar')
      .populate('assignee', 'name email avatar')
      .populate('comments.user', 'name email avatar')
      .populate('history.user', 'name email avatar');

    const addedComment = updatedTask.comments[updatedTask.comments.length - 1];

    console.log(`✅ [CONTROLLER] Комментарий добавлен к задаче ${taskId}:`, addedComment._id);

    // Отправляем событие через WebSocket
    const socketServer = req.app.get('socketServer');
    if (socketServer) {
      socketServer.notifyCommentAdded(taskId, addedComment, task.project, req.user._id);
      
      // Отправляем уведомления упомянутым пользователям
      if (mentions && mentions.length > 0) {
        mentions.forEach(userId => {
          if (userId.toString() !== req.user._id.toString()) {
            socketServer.notifyUserMentioned(userId, {
              taskId,
              taskTitle: task.title,
              commentId: addedComment._id,
              commentedBy: req.user._id
            });
          }
        });
      }
    }

    res.json({
      message: 'Comment added successfully',
      comment: addedComment
    });
  } catch (error) {
    console.error('❌ [CONTROLLER] Ошибка добавления комментария:', error);
    res.status(500).json({ 
      message: 'Error adding comment', 
      error: error.message 
    });
  }
};

export const updateComment = async (req, res) => {
  try {
    const { taskId, commentId } = req.params;
    const { content, mentions } = req.body;

    console.log(`✏️ [CONTROLLER] Обновление комментария ${commentId} задачи ${taskId}`);

    const task = await Task.findById(taskId);

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Ищем комментарий
    const commentIndex = task.comments.findIndex(c => c._id.toString() === commentId);
    
    if (commentIndex === -1) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    // Проверяем, является ли пользователь автором комментария
    if (task.comments[commentIndex].user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to update this comment' });
    }

    // Обновляем комментарий
    if (content !== undefined) {
      task.comments[commentIndex].content = content.trim();
      task.comments[commentIndex].edited = true;
      task.comments[commentIndex].editedAt = new Date();
    }

    await task.save();

    // Загружаем обновленный комментарий
    const updatedTask = await Task.findById(taskId)
      .populate('comments.user', 'name email avatar');

    const updatedComment = updatedTask.comments.find(c => c._id.toString() === commentId);

    console.log(`✅ [CONTROLLER] Комментарий ${commentId} обновлен`);

    // Отправляем событие через WebSocket
    const socketServer = req.app.get('socketServer');
    if (socketServer) {
      socketServer.notifyCommentUpdated(taskId, updatedComment, req.user._id);
    }

    res.json({
      message: 'Comment updated successfully',
      comment: updatedComment
    });
  } catch (error) {
    console.error('❌ [CONTROLLER] Ошибка обновления комментария:', error);
    if (error.message.includes('Not authorized')) {
      return res.status(403).json({ message: error.message });
    }
    res.status(500).json({ 
      message: 'Error updating comment', 
      error: error.message 
    });
  }
};

export const deleteComment = async (req, res) => {
  try {
    const { taskId, commentId } = req.params;

    console.log(`🗑️ [CONTROLLER] Удаление комментария ${commentId} задачи ${taskId}`);

    const task = await Task.findById(taskId);

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Ищем комментарий
    const commentIndex = task.comments.findIndex(c => c._id.toString() === commentId);
    
    if (commentIndex === -1) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    // Проверяем права: автор комментария или владелец задачи
    const isCommentAuthor = task.comments[commentIndex].user.toString() === req.user._id.toString();
    const isTaskOwner = task.creator.toString() === req.user._id.toString();
    
    if (!isCommentAuthor && !isTaskOwner) {
      return res.status(403).json({ message: 'Not authorized to delete this comment' });
    }

    // Удаляем комментарий
    task.comments.splice(commentIndex, 1);
    await task.save();

    console.log(`✅ [CONTROLLER] Комментарий ${commentId} удален`);

    // Отправляем событие через WebSocket
    const socketServer = req.app.get('socketServer');
    if (socketServer) {
      socketServer.notifyCommentDeleted(taskId, commentId, req.user._id);
    }

    res.json({
      message: 'Comment deleted successfully'
    });
  } catch (error) {
    console.error('❌ [CONTROLLER] Ошибка удаления комментария:', error);
    if (error.message.includes('Not authorized')) {
      return res.status(403).json({ message: error.message });
    }
    res.status(500).json({ 
      message: 'Error deleting comment', 
      error: error.message 
    });
  }
};

export const updateTaskStatus = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { status, position } = req.body;

    console.log(`🔄 [CONTROLLER] Обновление статуса задачи ${taskId} на ${status}, позиция: ${position}`);

    if (!status) {
      return res.status(400).json({ message: 'Status is required' });
    }

    const task = await Task.findById(taskId);

    if (!task) {
      console.log(`❌ [CONTROLLER] Задача ${taskId} не найдена`);
      return res.status(404).json({ message: 'Task not found' });
    }

    // Проверяем доступ к проекту
    const project = await Project.findById(task.project);
    
    if (!project) {
      console.log(`❌ [CONTROLLER] Проект задачи ${taskId} не найден`);
      return res.status(404).json({ message: 'Project not found' });
    }

    const member = project.members.find(m => 
      m.user.toString() === req.user._id.toString()
    );

    if (!member || !member.permissions.canEdit) {
      console.log(`❌ [CONTROLLER] Пользователь ${req.user._id} не имеет прав на обновление задачи ${taskId}`);
      return res.status(403).json({ message: 'No permission to update task' });
    }

    const oldStatus = task.status;
    task.status = status;
    if (position !== undefined) {
      task.position = position;
    }

    // Добавляем запись в историю
    if (oldStatus !== status) {
      addHistory(task, req.user._id, 'status_changed', `Статус изменен`, oldStatus, status);
    }

    await task.save();

    // Загружаем обновленную задачу с populate
    const updatedTask = await Task.findById(task._id)
      .populate('creator', 'name email avatar')
      .populate('assignee', 'name email avatar')
      .populate('history.user', 'name email avatar');

    console.log(`✅ [CONTROLLER] Статус задачи ${taskId} обновлен на ${status}`);

    // Отправляем событие через WebSocket
    const socketServer = req.app.get('socketServer');
    if (socketServer) {
      socketServer.notifyTaskUpdated(task.project, updatedTask, req.user._id);
    }

    res.json({
      message: 'Task status updated successfully',
      task: updatedTask
    });
  } catch (error) {
    console.error('❌ [CONTROLLER] Ошибка обновления статуса задачи:', error);
    res.status(500).json({ 
      message: 'Error updating task status', 
      error: error.message 
    });
  }
};

export const updateChecklist = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { checklist } = req.body;

    console.log(`✅ [CONTROLLER] Обновление чеклиста задачи ${taskId}`);

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
    
    // Добавляем запись в историю
    addHistory(task, req.user._id, 'checklist_updated', `Чеклист обновлен`, null, null);

    await task.save();

    console.log(`✅ [CONTROLLER] Чеклист задачи ${taskId} обновлен: ${checklist?.length || 0} пунктов`);

    // Отправляем событие через WebSocket
    const socketServer = req.app.get('socketServer');
    if (socketServer) {
      socketServer.notifyTaskUpdated(task.project, task, req.user._id);
    }

    res.json({
      message: 'Checklist updated successfully',
      task
    });
  } catch (error) {
    console.error('❌ [CONTROLLER] Update checklist error:', error);
    res.status(500).json({ message: 'Error updating checklist', error: error.message });
  }
};

export const getUserTaskStats = async (req, res) => {
  try {
    const userId = req.user._id;
    
    const tasks = await Task.find({
      $or: [
        { creator: userId },
        { assignee: userId }
      ]
    }).populate('project', 'name');

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'Done').length;
    const inProgressTasks = tasks.filter(t => t.status === 'In Progress').length;
    const todoTasks = tasks.filter(t => t.status === 'To Do').length;
    
    const priorityStats = {
      low: tasks.filter(t => t.priority === 'low').length,
      medium: tasks.filter(t => t.priority === 'medium').length,
      high: tasks.filter(t => t.priority === 'high').length,
      critical: tasks.filter(t => t.priority === 'critical').length
    };

    const now = new Date();
    const overdueTasks = tasks.filter(t => 
      t.dueDate && 
      new Date(t.dueDate) < now && 
      t.status !== 'Done'
    ).length;

    const projectStats = {};
    tasks.forEach(task => {
      if (task.project) {
        const projectId = task.project._id.toString();
        if (!projectStats[projectId]) {
          projectStats[projectId] = {
            name: task.project.name,
            total: 0,
            completed: 0,
            inProgress: 0,
            todo: 0
          };
        }
        projectStats[projectId].total++;
        if (task.status === 'Done') projectStats[projectId].completed++;
        if (task.status === 'In Progress') projectStats[projectId].inProgress++;
        if (task.status === 'To Do') projectStats[projectId].todo++;
      }
    });

    const totalEstimatedHours = tasks.reduce((sum, t) => sum + (t.estimatedTime || 0), 0);
    const totalActualHours = tasks.reduce((sum, t) => sum + (t.actualTime || 0), 0);

    res.json({
      message: 'User task statistics retrieved',
      stats: {
        total: totalTasks,
        completed: completedTasks,
        inProgress: inProgressTasks,
        todo: todoTasks,
        overdue: overdueTasks,
        priority: priorityStats,
        projects: Object.values(projectStats),
        time: {
          estimated: totalEstimatedHours,
          actual: totalActualHours,
          difference: totalActualHours - totalEstimatedHours
        },
        completionRate: totalTasks > 0 ? (completedTasks / totalTasks * 100).toFixed(1) : 0
      }
    });
  } catch (error) {
    console.error('❌ [CONTROLLER] Get user task stats error:', error);
    res.status(500).json({ message: 'Error retrieving user task statistics', error: error.message });
  }
};

export const getTaskComments = async (req, res) => {
  try {
    const { taskId } = req.params;

    const task = await Task.findById(taskId)
      .populate('comments.user', 'name email avatar');

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
      message: 'Task comments fetched successfully',
      comments: task.comments || []
    });
  } catch (error) {
    console.error('❌ [CONTROLLER] Get task comments error:', error);
    res.status(500).json({ message: 'Error fetching task comments', error: error.message });
  }
};

export const getProjectStats = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { timeRange = 'month' } = req.query;

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

    const now = new Date();
    let startDate;
    
    switch (timeRange) {
      case 'day':
        startDate = new Date(now.setDate(now.getDate() - 1));
        break;
      case 'week':
        startDate = new Date(now.setDate(now.getDate() - 7));
        break;
      case 'month':
        startDate = new Date(now.setMonth(now.getMonth() - 1));
        break;
      case 'year':
        startDate = new Date(now.setFullYear(now.getFullYear() - 1));
        break;
      default:
        startDate = new Date(now.setMonth(now.getMonth() - 1));
    }

    const tasks = await Task.find({ project: projectId })
      .populate('creator', 'name email avatar')
      .populate('assignee', 'name email avatar')
      .populate('comments.user', 'name email avatar');

    const recentTasks = tasks.filter(task => 
      new Date(task.createdAt) >= startDate
    );

    const statusStats = {
      todo: tasks.filter(t => t.status === 'To Do').length,
      inProgress: tasks.filter(t => t.status === 'In Progress').length,
      review: tasks.filter(t => t.status === 'Review').length,
      done: tasks.filter(t => t.status === 'Done').length,
      backlog: tasks.filter(t => t.status === 'Backlog').length
    };

    const priorityStats = {
      low: tasks.filter(t => t.priority === 'low').length,
      medium: tasks.filter(t => t.priority === 'medium').length,
      high: tasks.filter(t => t.priority === 'high').length,
      critical: tasks.filter(t => t.priority === 'critical').length
    };

    const overdueTasks = tasks.filter(t => 
      t.dueDate && 
      new Date(t.dueDate) < new Date() && 
      t.status !== 'Done'
    );

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'Done').length;
    const progress = totalTasks > 0 ? (completedTasks / totalTasks * 100).toFixed(1) : 0;

    const activityByDay = {};
    const last30Days = new Date();
    last30Days.setDate(last30Days.getDate() - 30);

    const recentActivities = tasks.flatMap(task => [
      { date: task.createdAt, type: 'created' },
      { date: task.updatedAt, type: 'updated' },
      ...(task.comments || []).map(comment => ({ date: comment.createdAt, type: 'commented' }))
    ]);

    recentActivities.forEach(activity => {
      if (new Date(activity.date) >= last30Days) {
        const dateStr = new Date(activity.date).toISOString().split('T')[0];
        if (!activityByDay[dateStr]) {
          activityByDay[dateStr] = { created: 0, updated: 0, commented: 0 };
        }
        activityByDay[dateStr][activity.type]++;
      }
    });

    const memberStats = {};
    project.members.forEach(member => {
      const memberTasks = tasks.filter(t => 
        t.creator.toString() === member.user.toString() || 
        t.assignee?.toString() === member.user.toString()
      );
      
      memberStats[member.user] = {
        tasks: memberTasks.length,
        completed: memberTasks.filter(t => t.status === 'Done').length,
        inProgress: memberTasks.filter(t => t.status === 'In Progress').length,
        overdue: memberTasks.filter(t => 
          t.dueDate && 
          new Date(t.dueDate) < new Date() && 
          t.status !== 'Done'
        ).length
      };
    });

    const timeStats = {
      totalEstimated: tasks.reduce((sum, t) => sum + (t.estimatedTime || 0), 0),
      totalActual: tasks.reduce((sum, t) => sum + (t.actualTime || 0), 0),
      averageEstimate: tasks.length > 0 ? 
        (tasks.reduce((sum, t) => sum + (t.estimatedTime || 0), 0) / tasks.length).toFixed(1) : 0,
      averageActual: tasks.length > 0 ? 
        (tasks.reduce((sum, t) => sum + (t.actualTime || 0), 0) / tasks.length).toFixed(1) : 0
    };

    res.json({
      message: 'Project statistics retrieved',
      stats: {
        overview: {
          totalTasks,
          completedTasks,
          progress,
          overdueTasks: overdueTasks.length,
          activeMembers: project.members.length
        },
        status: statusStats,
        priority: priorityStats,
        time: timeStats,
        members: memberStats,
        recentActivity: {
          tasks: recentTasks.length,
          byDay: Object.entries(activityByDay).map(([date, counts]) => ({
            date,
            ...counts
          })).sort((a, b) => new Date(a.date) - new Date(b.date))
        },
        timeline: {
          created: tasks.map(t => ({
            id: t._id,
            title: t.title,
            date: t.createdAt,
            type: 'task_created'
          })).sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 10)
        }
      }
    });
  } catch (error) {
    console.error('❌ [CONTROLLER] Get project stats error:', error);
    res.status(500).json({ message: 'Error retrieving project statistics', error: error.message });
  }
};

export const getRecentActivity = async (req, res) => {
  try {
    const userId = req.user._id;
    
    const userProjects = await Project.find({
      $or: [
        { owner: userId },
        { 'members.user': userId }
      ]
    }).select('_id');

    const projectIds = userProjects.map(p => p._id);

    const recentTasks = await Task.find({
      project: { $in: projectIds },
      $or: [
        { creator: userId },
        { assignee: userId }
      ]
    })
      .sort({ updatedAt: -1 })
      .limit(20)
      .populate('project', 'name')
      .populate('creator', 'name email avatar')
      .populate('assignee', 'name email avatar')
      .populate('history.user', 'name email avatar');

    const activities = recentTasks.flatMap(task => {
      const taskActivities = [];
      
      // Добавляем историю задачи
      if (task.history && task.history.length > 0) {
        task.history.forEach(historyItem => {
          taskActivities.push({
            id: `${task._id}-${historyItem._id}`,
            type: 'history',
            icon: getHistoryIcon(historyItem.action),
            action: getHistoryAction(historyItem.action),
            taskTitle: task.title,
            projectName: task.project?.name || 'Неизвестный проект',
            user: historyItem.user,
            date: historyItem.timestamp,
            details: historyItem.details
          });
        });
      }
      
      return taskActivities;
    });

    // Сортируем по дате и берем последние 15
    const allActivities = activities
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 15);

    res.json({
      message: 'Recent activity retrieved',
      activities: allActivities
    });
  } catch (error) {
    console.error('❌ [CONTROLLER] Get recent activity error:', error);
    res.status(500).json({ message: 'Error retrieving recent activity', error: error.message });
  }
};

// Вспомогательные функции
function getHistoryIcon(action) {
  switch (action) {
    case 'created': return '🆕';
    case 'updated': return '✏️';
    case 'status_changed': return '🔄';
    case 'assigned': return '👤';
    case 'commented': return '💬';
    case 'checklist_updated': return '✅';
    case 'attachment_added': return '📎';
    default: return '📝';
  }
}

function getHistoryAction(action) {
  switch (action) {
    case 'created': return 'создал(а) задачу';
    case 'updated': return 'обновил(а) задачу';
    case 'status_changed': return 'изменил(а) статус задачи';
    case 'assigned': return 'назначил(а) исполнителя';
    case 'commented': return 'прокомментировал(а) задачу';
    case 'checklist_updated': return 'обновил(а) чеклист';
    case 'attachment_added': return 'добавил(а) вложение';
    default: return 'выполнил(а) действие';
  }
}
