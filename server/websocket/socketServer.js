import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';

class SocketServer {
  constructor(server) {
    this.io = new Server(server, {
      cors: {
        origin: process.env.CLIENT_URL || 'http://localhost:3000',
        methods: ['GET', 'POST'],
        credentials: true
      }
    });
    
    this.users = new Map(); // userId -> socketId
    
    this.io.use(this.authenticateSocket.bind(this));
    this.setupEventHandlers();
    
    console.log('✅ WebSocket сервер инициализирован');
  }

  // Аутентификация WebSocket соединения
  authenticateSocket(socket, next) {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
    
    if (!token) {
      console.log('❌ WebSocket: Токен не предоставлен');
      return next(new Error('Authentication error'));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.userId;
      socket.user = decoded;
      next();
    } catch (error) {
      console.log('❌ WebSocket: Неверный токен', error.message);
      next(new Error('Authentication error'));
    }
  }

  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`✅ WebSocket: Пользователь ${socket.userId} подключен (socketId: ${socket.id})`);
      
      // Сохраняем связь userId -> socketId
      if (socket.userId) {
        this.users.set(socket.userId, socket.id);
      }

      // Подписка на проект
      socket.on('subscribeToProject', (projectId) => {
        console.log(`📡 WebSocket: Пользователь ${socket.userId} подписался на проект ${projectId}`);
        socket.join(`project:${projectId}`);
      });

      // Отписка от проекта
      socket.on('unsubscribeFromProject', (projectId) => {
        console.log(`📡 WebSocket: Пользователь ${socket.userId} отписался от проекта ${projectId}`);
        socket.leave(`project:${projectId}`);
      });

      // Подписка на задачу
      socket.on('subscribeToTask', (taskId) => {
        console.log(`📡 WebSocket: Пользователь ${socket.userId} подписался на задачу ${taskId}`);
        socket.join(`task:${taskId}`);
      });

      // Отписка от задачи
      socket.on('unsubscribeFromTask', (taskId) => {
        console.log(`📡 WebSocket: Пользователь ${socket.userId} отписался от задачи ${taskId}`);
        socket.leave(`task:${taskId}`);
      });

      // Отправка комментария через WebSocket
      socket.on('sendComment', (data) => {
        console.log('📡 WebSocket: Получен комментарий через сокет:', data);
        // Рассылаем всем подписанным на задачу, кроме отправителя
        socket.to(`task:${data.taskId}`).emit('commentAdded', {
          ...data,
          timestamp: new Date()
        });
      });

      // Отключение пользователя
      socket.on('disconnect', () => {
        console.log(`❌ WebSocket: Пользователь ${socket.userId} отключен`);
        if (socket.userId) {
          this.users.delete(socket.userId);
        }
      });

      // Пинг для поддержания соединения
      socket.on('ping', () => {
        socket.emit('pong', { timestamp: Date.now() });
      });
    });
  }

  // Уведомления о создании задачи
  notifyTaskCreated(projectId, task, userId) {
    console.log(`📢 WebSocket: Уведомление о создании задачи в проекте ${projectId}`);
    this.io.to(`project:${projectId}`).emit('taskCreated', {
      task,
      createdBy: userId,
      timestamp: new Date()
    });
  }

  // Уведомления об обновлении задачи
  notifyTaskUpdated(projectId, task, userId) {
    console.log(`📢 WebSocket: Уведомление об обновлении задачи ${task._id} в проекте ${projectId}`);
    
    // Отправляем в комнату проекта
    this.io.to(`project:${projectId}`).emit('taskUpdated', {
      task,
      updatedBy: userId,
      timestamp: new Date()
    });
    
    // Отправляем в комнату задачи
    this.io.to(`task:${task._id}`).emit('taskUpdated', {
      task,
      updatedBy: userId,
      timestamp: new Date()
    });
  }

  // Уведомления об удалении задачи
  notifyTaskDeleted(projectId, taskId, userId) {
    console.log(`📢 WebSocket: Уведомление об удалении задачи ${taskId} из проекта ${projectId}`);
    this.io.to(`project:${projectId}`).emit('taskDeleted', {
      taskId,
      deletedBy: userId,
      timestamp: new Date()
    });
  }

  // Уведомления о добавлении комментария
  notifyCommentAdded(taskId, comment, projectId, userId) {
    console.log(`📢 WebSocket: Уведомление о добавлении комментария к задаче ${taskId}`);
    
    const notification = {
      taskId,
      comment,
      commentedBy: userId,
      timestamp: new Date()
    };

    // Отправляем всем подписанным на задачу
    this.io.to(`task:${taskId}`).emit('commentAdded', notification);
    
    // Отправляем всем подписанным на проект
    this.io.to(`project:${projectId}`).emit('commentAdded', notification);
  }

  // Уведомления об обновлении комментария
  notifyCommentUpdated(taskId, comment, userId) {
    console.log(`📢 WebSocket: Уведомление об обновлении комментария ${comment._id}`);
    this.io.to(`task:${taskId}`).emit('commentUpdated', {
      taskId,
      comment,
      updatedBy: userId,
      timestamp: new Date()
    });
  }

  // Уведомления об удалении комментария
  notifyCommentDeleted(taskId, commentId, userId) {
    console.log(`📢 WebSocket: Уведомление об удалении комментария ${commentId}`);
    this.io.to(`task:${taskId}`).emit('commentDeleted', {
      taskId,
      commentId,
      deletedBy: userId,
      timestamp: new Date()
    });
  }

  // Уведомления об упоминании пользователя
  notifyUserMentioned(userId, data) {
    console.log(`📢 WebSocket: Уведомление об упоминании пользователя ${userId}`);
    const socketId = this.users.get(userId.toString());
    if (socketId) {
      this.io.to(socketId).emit('userMentioned', {
        ...data,
        timestamp: new Date()
      });
    }
  }

  // Уведомления об изменении чеклиста
  notifyChecklistUpdated(taskId, checklist, projectId, userId) {
    console.log(`📢 WebSocket: Уведомление об обновлении чеклиста задачи ${taskId}`);
    
    this.io.to(`task:${taskId}`).emit('checklistUpdated', {
      taskId,
      checklist,
      updatedBy: userId,
      timestamp: new Date()
    });

    this.io.to(`project:${projectId}`).emit('taskUpdated', {
      taskId,
      checklist,
      updatedBy: userId,
      timestamp: new Date(),
      type: 'checklist_updated'
    });
  }

  // Уведомления об изменении статуса задачи
  notifyTaskStatusChanged(projectId, taskId, oldStatus, newStatus, userId) {
    console.log(`📢 WebSocket: Уведомление об изменении статуса задачи ${taskId} с ${oldStatus} на ${newStatus}`);
    
    this.io.to(`project:${projectId}`).emit('taskStatusChanged', {
      taskId,
      oldStatus,
      newStatus,
      changedBy: userId,
      timestamp: new Date()
    });
  }

  // Уведомления о назначении исполнителя
  notifyTaskAssigned(projectId, taskId, assigneeId, userId) {
    console.log(`📢 WebSocket: Уведомление о назначении исполнителя ${assigneeId} на задачу ${taskId}`);
    
    this.io.to(`project:${projectId}`).emit('taskAssigned', {
      taskId,
      assigneeId,
      assignedBy: userId,
      timestamp: new Date()
    });
  }

  // Отправка уведомления конкретному пользователю
  notifyUser(userId, event, data) {
    const socketId = this.users.get(userId.toString());
    if (socketId) {
      console.log(`📢 WebSocket: Отправка уведомления пользователю ${userId} (${event})`);
      this.io.to(socketId).emit(event, {
        ...data,
        timestamp: new Date()
      });
    }
  }

  // Получить активных пользователей
  getActiveUsers() {
    return Array.from(this.users.keys());
  }

  // Проверить, онлайн ли пользователь
  isUserOnline(userId) {
    return this.users.has(userId.toString());
  }
}

export default SocketServer;