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
      position: 0
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

    const totalEstimatedHours = tasks.reduce((sum, t) => sum + (t.estimatedHours || 0), 0);
    const totalActualHours = tasks.reduce((sum, t) => sum + (t.actualHours || 0), 0);

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
    console.error('Get user task stats error:', error);
    res.status(500).json({ message: 'Error retrieving user task statistics', error: error.message });
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
      .populate('comments.author', 'name email avatar');

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
      totalEstimated: tasks.reduce((sum, t) => sum + (t.estimatedHours || 0), 0),
      totalActual: tasks.reduce((sum, t) => sum + (t.actualHours || 0), 0),
      averageEstimate: tasks.length > 0 ? 
        (tasks.reduce((sum, t) => sum + (t.estimatedHours || 0), 0) / tasks.length).toFixed(1) : 0,
      averageActual: tasks.length > 0 ? 
        (tasks.reduce((sum, t) => sum + (t.actualHours || 0), 0) / tasks.length).toFixed(1) : 0
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
    console.error('Get project stats error:', error);
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
      .populate('assignee', 'name email avatar');

    const activities = recentTasks.map(task => {
      let action = '';
      let icon = '📝';
      
      if (task.creator._id.toString() === userId.toString()) {
        action = `создал(а) задачу`;
        icon = '🆕';
      } else if (task.assignee && task.assignee._id.toString() === userId.toString()) {
        action = `назначен(а) на задачу`;
        icon = '👤';
      } else {
        action = `участвует в задаче`;
        icon = '👥';
      }

      return {
        id: task._id,
        type: 'task',
        icon,
        action,
        taskTitle: task.title,
        projectName: task.project?.name || 'Неизвестный проект',
        user: task.creator,
        date: task.updatedAt,
        status: task.status,
        priority: task.priority
      };
    });

    const recentComments = await Task.aggregate([
      {
        $match: {
          project: { $in: projectIds },
          'comments.author': userId
        }
      },
      { $unwind: '$comments' },
      { $match: { 'comments.author': userId } },
      { $sort: { 'comments.createdAt': -1 } },
      { $limit: 10 },
      {
        $project: {
          taskTitle: '$title',
          comment: '$comments.content',
          date: '$comments.createdAt',
          taskId: '$_id'
        }
      }
    ]);

    const commentActivities = recentComments.map(comment => ({
      id: comment.taskId,
      type: 'comment',
      icon: '💬',
      action: 'прокомментировал(а) задачу',
      taskTitle: comment.taskTitle,
      commentPreview: comment.comment.substring(0, 100) + (comment.comment.length > 100 ? '...' : ''),
      date: comment.date
    }));

    const allActivities = [...activities, ...commentActivities]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 15);

    res.json({
      message: 'Recent activity retrieved',
      activities: allActivities
    });
  } catch (error) {
    console.error('Get recent activity error:', error);
    res.status(500).json({ message: 'Error retrieving recent activity', error: error.message });
  }
};