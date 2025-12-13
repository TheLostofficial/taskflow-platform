// websocket/socketServer.js

/**
 * Инициализация WebSocket сервера
 * @param {Server} io - Экземпляр Socket.IO сервера
 * @returns {Object} - Объект с методами для отправки уведомлений
 */
export function initSocketServer(io) {
  console.log('🔄 Инициализация WebSocket сервера...');

  // Хранилище подключенных пользователей
  const connectedUsers = new Map();

  io.on('connection', (socket) => {
    console.log(`🔗 Новое подключение: ${socket.id}`);

    // Обработка аутентификации пользователя
    socket.on('authenticate', (userId) => {
      if (userId) {
        connectedUsers.set(socket.id, userId);
        console.log(`👤 Пользователь ${userId} аутентифицирован (socket: ${socket.id})`);
        
        // Присоединяем пользователя к его персональной комнате
        socket.join(`user_${userId}`);
      }
    });

    // Присоединение к проекту
    socket.on('join_project', (projectId) => {
      if (projectId) {
        socket.join(`project_${projectId}`);
        console.log(`👥 Клиент ${socket.id} присоединился к проекту ${projectId}`);
      }
    });

    // Выход из проекта
    socket.on('leave_project', (projectId) => {
      if (projectId) {
        socket.leave(`project_${projectId}`);
        console.log(`👋 Клиент ${socket.id} покинул проект ${projectId}`);
      }
    });

    // Присоединение к задаче
    socket.on('join_task', (taskId) => {
      if (taskId) {
        socket.join(`task_${taskId}`);
        console.log(`📋 Клиент ${socket.id} присоединился к задаче ${taskId}`);
      }
    });

    // Выход из задачи
    socket.on('leave_task', (taskId) => {
      if (taskId) {
        socket.leave(`task_${taskId}`);
        console.log(`👋 Клиент ${socket.id} покинул задачу ${taskId}`);
      }
    });

    // Отключение
    socket.on('disconnect', () => {
      const userId = connectedUsers.get(socket.id);
      if (userId) {
        console.log(`❌ Отключение: пользователь ${userId} (socket: ${socket.id})`);
        connectedUsers.delete(socket.id);
      } else {
        console.log(`❌ Отключение: ${socket.id}`);
      }
    });

    // Ping/Pong для поддержания соединения
    socket.on('ping', (callback) => {
      if (typeof callback === 'function') {
        callback('pong');
      }
    });
  });

  // Методы для использования в контроллерах
  return {
    // Уведомление о создании задачи
    notifyTaskCreated: (projectId, task, userId) => {
      if (projectId && task) {
        io.to(`project_${projectId}`).emit('task_created', {
          task,
          createdBy: userId
        });
      }
    },
    
    // Уведомление об обновлении задачи
    notifyTaskUpdated: (projectId, task, userId) => {
      if (projectId && task) {
        io.to(`project_${projectId}`).emit('task_updated', {
          task,
          updatedBy: userId
        });
        
        io.to(`task_${task._id}`).emit('task_updated', {
          task,
          updatedBy: userId
        });
      }
    },
    
    // Уведомление об удалении задачи
    notifyTaskDeleted: (projectId, taskId, userId) => {
      if (projectId && taskId) {
        io.to(`project_${projectId}`).emit('task_deleted', {
          taskId,
          deletedBy: userId
        });
        
        io.to(`task_${taskId}`).emit('task_deleted', {
          taskId,
          deletedBy: userId
        });
      }
    },
    
    // Уведомление о добавлении комментария
    notifyCommentAdded: (taskId, comment, projectId, userId) => {
      if (taskId && comment) {
        io.to(`task_${taskId}`).emit('comment_added', {
          taskId,
          comment,
          addedBy: userId
        });
        
        if (projectId) {
          io.to(`project_${projectId}`).emit('comment_added', {
            taskId,
            comment,
            addedBy: userId
          });
        }
      }
    },
    
    // Уведомление упомянутого пользователя
    notifyUserMentioned: (userId, notification) => {
      io.to(`user_${userId}`).emit('user_mentioned', notification);
    },
    
    // Получить количество подключенных пользователей
    getConnectedUsersCount: () => {
      return connectedUsers.size;
    },
    
    // Получить ID сокета пользователя
    getUserSocketId: (userId) => {
      for (const [socketId, uid] of connectedUsers.entries()) {
        if (uid === userId) {
          return socketId;
        }
      }
      return null;
    }
  };
}

export default initSocketServer;