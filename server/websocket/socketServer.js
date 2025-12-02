import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

class SocketServer {
  constructor(server) {
    this.io = new Server(server, {
      cors: {
        origin: process.env.CLIENT_URL || 'http://localhost:3000',
        methods: ['GET', 'POST'],
        credentials: true
      },
      path: '/socket.io/',
      pingTimeout: 60000,
      pingInterval: 25000,
      transports: ['websocket', 'polling']
    });

    this.users = new Map(); // userId -> socketId
    this.projectRooms = new Map(); // projectId -> Set of socketIds

    this.setupMiddleware();
    this.setupConnection();
    
    console.log('✅ WebSocket сервер инициализирован');
    console.log('📡 WebSocket путь: /socket.io/');
    console.log('🌐 CORS origin:', process.env.CLIENT_URL || 'http://localhost:3000');
  }

  setupMiddleware() {
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];
        
        console.log('🔐 WebSocket: Попытка подключения, токен:', token ? 'предоставлен' : 'отсутствует');
        
        if (!token) {
          console.warn('⚠️ WebSocket: Токен не предоставлен');
          // В режиме разработки разрешаем подключение без токена для тестирования
          if (process.env.NODE_ENV === 'development') {
            console.log('🛠️ WebSocket: Разрешаем подключение без токена в dev режиме');
            socket.userId = 'anonymous_' + socket.id;
            socket.user = { 
              _id: 'anonymous', 
              email: 'anonymous@dev.local',
              name: 'Anonymous User'
            };
            return next();
          }
          return next(new Error('Authentication error: Token required'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId).select('-password');
        
        if (!user) {
          console.log(`❌ WebSocket: Пользователь не найден: ${decoded.userId}`);
          return next(new Error('User not found'));
        }

        socket.userId = user._id.toString();
        socket.user = user;
        
        console.log(`✅ WebSocket: Аутентификация успешна для пользователя ${user.email} (ID: ${user._id})`);
        next();
      } catch (error) {
        console.error('❌ WebSocket auth error:', error.message);
        
        if (error.name === 'JsonWebTokenError') {
          console.error('❌ WebSocket: Неверный токен');
          return next(new Error('Invalid token'));
        }
        
        if (error.name === 'TokenExpiredError') {
          console.error('❌ WebSocket: Токен истек');
          return next(new Error('Token expired'));
        }

        console.error('❌ WebSocket: Ошибка аутентификации');
        next(new Error('Authentication failed'));
      }
    });
  }

  setupConnection() {
    this.io.on('connection', (socket) => {
      console.log(`⚡ Новое подключение: ${socket.userId} (socket: ${socket.id})`);

      // Сохраняем связь userId -> socket.id
      this.users.set(socket.userId, socket.id);
      
      // Присоединяем пользователя к его личной комнате
      socket.join(`user_${socket.userId}`);
      
      // Отправляем подтверждение подключения
      socket.emit('connected', {
        message: 'Connected to TaskFlow WebSocket',
        userId: socket.userId,
        socketId: socket.id,
        timestamp: new Date().toISOString(),
        serverTime: new Date().toISOString()
      });

      console.log(`📊 Активных подключений: ${this.io.engine.clientsCount}`);

      // Обработка событий от клиента
      this.setupEventHandlers(socket);

      // Отправляем статистику о подключениях
      this.sendConnectionStats();

      socket.on('disconnect', (reason) => {
        console.log(`🔌 Отключение: ${socket.userId} (${socket.id}), причина: ${reason}`);
        this.handleDisconnect(socket);
      });

      socket.on('error', (error) => {
        console.error(`❌ Socket error для ${socket.userId}:`, error);
      });
    });
  }

  setupEventHandlers(socket) {
    // Присоединение к проекту
    socket.on('join_project', (projectId) => {
      if (!projectId) {
        console.log(`⚠️  Попытка присоединения к проекту без ID от пользователя ${socket.userId}`);
        return;
      }

      const roomName = `project_${projectId}`;
      socket.join(roomName);
      
      if (!this.projectRooms.has(projectId)) {
        this.projectRooms.set(projectId, new Set());
      }
      this.projectRooms.get(projectId).add(socket.id);
      
      console.log(`🎯 Пользователь ${socket.userId} присоединился к проекту ${projectId}`);
      
      // Отправляем подтверждение клиенту
      socket.emit('project_joined', { 
        projectId, 
        room: roomName,
        timestamp: new Date().toISOString(),
        message: `Присоединен к проекту ${projectId}`
      });
    });

    // Выход из проекта
    socket.on('leave_project', (projectId) => {
      if (!projectId) return;
      
      const roomName = `project_${projectId}`;
      socket.leave(roomName);
      
      if (this.projectRooms.has(projectId)) {
        this.projectRooms.get(projectId).delete(socket.id);
        if (this.projectRooms.get(projectId).size === 0) {
          this.projectRooms.delete(projectId);
        }
      }
      
      console.log(`👋 Пользователь ${socket.userId} покинул проект ${projectId}`);
    });

    // Присоединение к задаче
    socket.on('join_task', (taskId) => {
      if (!taskId) return;
      
      const roomName = `task_${taskId}`;
      socket.join(roomName);
      console.log(`📋 Пользователь ${socket.userId} присоединился к задаче ${taskId}`);
    });

    // Выход из задачи
    socket.on('leave_task', (taskId) => {
      if (!taskId) return;
      
      const roomName = `task_${taskId}`;
      socket.leave(roomName);
      console.log(`👋 Пользователь ${socket.userId} покинул задачу ${taskId}`);
    });

    // Ping/Pong для проверки соединения
    socket.on('ping', (data) => {
      socket.emit('pong', {
        ...data,
        serverTime: new Date().toISOString(),
        message: 'pong',
        receivedAt: new Date().toISOString()
      });
    });

    // Тестовое сообщение
    socket.on('test_message', (data) => {
      console.log(`📨 Тестовое сообщение от ${socket.userId}:`, data);
      socket.emit('test_response', {
        received: data,
        timestamp: new Date().toISOString(),
        serverTime: new Date().toISOString(),
        message: 'Тестовое сообщение получено сервером'
      });
      
      // Отправляем тестовое уведомление
      socket.emit('test_notification', {
        message: 'Тестовое уведомление с сервера!',
        timestamp: new Date().toISOString(),
        userId: socket.userId
      });
    });
  }

  handleDisconnect(socket) {
    // Удаляем из мапы пользователей
    this.users.delete(socket.userId);
    
    // Удаляем из всех комнат проектов
    for (const [projectId, socketSet] of this.projectRooms) {
      socketSet.delete(socket.id);
      if (socketSet.size === 0) {
        this.projectRooms.delete(projectId);
      }
    }
    
    console.log(`📊 Осталось подключений: ${this.io.engine.clientsCount}`);
    this.sendConnectionStats();
  }

  sendConnectionStats() {
    const stats = this.getStats();
    console.log('📊 Статистика WebSocket:', stats);
  }

  // Методы для отправки уведомлений
  sendToUser(userId, event, data) {
    const socketId = this.users.get(userId);
    if (socketId) {
      this.io.to(socketId).emit(event, data);
      console.log(`📤 Отправлено ${event} пользователю ${userId}`);
      return true;
    }
    console.log(`⚠️  Пользователь ${userId} не подключен`);
    return false;
  }

  sendToProject(projectId, event, data, excludeUserId = null) {
    const roomName = `project_${projectId}`;
    
    if (excludeUserId) {
      const excludeSocketId = this.users.get(excludeUserId);
      if (excludeSocketId) {
        this.io.to(excludeSocketId).to(roomName).emit(event, data);
      } else {
        this.io.to(roomName).emit(event, data);
      }
    } else {
      this.io.to(roomName).emit(event, data);
    }
    
    console.log(`📤 Отправлено ${event} в проект ${projectId}`);
    return true;
  }

  sendToTask(taskId, event, data, excludeUserId = null) {
    const roomName = `task_${taskId}`;
    
    if (excludeUserId) {
      const excludeSocketId = this.users.get(excludeUserId);
      if (excludeSocketId) {
        this.io.to(excludeSocketId).to(roomName).emit(event, data);
      } else {
        this.io.to(roomName).emit(event, data);
      }
    } else {
      this.io.to(roomName).emit(event, data);
    }
    
    console.log(`📤 Отправлено ${event} в задачу ${taskId}`);
    return true;
  }

  // Методы для бизнес-логики
  notifyTaskCreated(projectId, task, createdByUserId) {
    this.sendToProject(projectId, 'task_created', {
      task,
      createdBy: createdByUserId,
      timestamp: new Date().toISOString(),
      message: 'Новая задача создана'
    }, createdByUserId);
  }

  notifyTaskUpdated(projectId, task, updatedByUserId) {
    this.sendToProject(projectId, 'task_updated', {
      task,
      updatedBy: updatedByUserId,
      timestamp: new Date().toISOString(),
      message: 'Задача обновлена'
    }, updatedByUserId);
  }

  notifyTaskDeleted(projectId, taskId, deletedByUserId) {
    this.sendToProject(projectId, 'task_deleted', {
      taskId,
      deletedBy: deletedByUserId,
      timestamp: new Date().toISOString(),
      message: 'Задача удалена'
    }, deletedByUserId);
  }

  notifyCommentAdded(taskId, comment, projectId, addedByUserId) {
    // Отправляем в комнату задачи
    this.sendToTask(taskId, 'comment_added', {
      comment,
      taskId,
      addedBy: addedByUserId,
      timestamp: new Date().toISOString(),
      message: 'Добавлен комментарий'
    }, addedByUserId);

    // Отправляем в проект
    this.sendToProject(projectId, 'task_commented', {
      taskId,
      commentId: comment._id,
      addedBy: addedByUserId,
      timestamp: new Date().toISOString(),
      message: 'Добавлен комментарий к задаче'
    }, addedByUserId);
  }

  notifyProjectUpdated(project, updatedByUserId) {
    this.sendToProject(project._id, 'project_updated', {
      project,
      updatedBy: updatedByUserId,
      timestamp: new Date().toISOString(),
      message: 'Проект обновлен'
    }, updatedByUserId);
  }

  notifyProjectDeleted(projectId, deletedByUserId) {
    this.sendToProject(projectId, 'project_deleted', {
      projectId,
      deletedBy: deletedByUserId,
      timestamp: new Date().toISOString(),
      message: 'Проект удален'
    }, deletedByUserId);
  }

  notifyUserMentioned(userId, data) {
    this.sendToUser(userId, 'mentioned', {
      ...data,
      timestamp: new Date().toISOString(),
      message: 'Вас упомянули'
    });
  }

  notifyProjectInvite(userId, project, invitedBy) {
    this.sendToUser(userId, 'project_invite', {
      project,
      invitedBy,
      timestamp: new Date().toISOString(),
      message: 'Приглашение в проект'
    });
  }

  notifyMemberJoined(projectId, userId) {
    this.sendToProject(projectId, 'member_joined', {
      userId,
      projectId,
      timestamp: new Date().toISOString(),
      message: 'Новый участник присоединился'
    }, userId);
  }

  notifyMemberLeft(projectId, userId) {
    this.sendToProject(projectId, 'member_left', {
      userId,
      projectId,
      timestamp: new Date().toISOString(),
      message: 'Участник покинул проект'
    }, userId);
  }

  getStats() {
    return {
      totalUsers: this.users.size,
      totalProjectRooms: this.projectRooms.size,
      activeConnections: this.io.engine.clientsCount,
      timestamp: new Date().toISOString()
    };
  }

  // Отладочный метод для тестирования
  sendTestNotification(userId, message = 'Тестовое уведомление') {
    return this.sendToUser(userId, 'test_notification', {
      message,
      timestamp: new Date().toISOString(),
      type: 'info'
    });
  }
}

export default SocketServer;