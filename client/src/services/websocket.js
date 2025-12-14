import { io } from 'socket.io-client';
import { WS_URL } from '../utils/constants';

class WebSocketService {
  constructor() {
    this.socket = null;
    this.connected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.listeners = new Map();
    this.userId = null;
  }

  // Подключение к WebSocket серверу
  connect(userId) {
    if (this.socket && this.connected) {
      console.log('WebSocket уже подключен');
      return;
    }

    this.userId = userId;
    const token = localStorage.getItem('token');
    
    if (!token) {
      console.error('❌ Нет токена для подключения WebSocket');
      return;
    }

    try {
      // Подключаемся к WebSocket серверу с использованием socket.io
      this.socket = io(WS_URL, {
        query: { token },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: this.reconnectDelay
      });
      
      this.socket.on('connect', () => {
        console.log('✅ WebSocket подключен, ID:', this.socket.id);
        this.connected = true;
        this.reconnectAttempts = 0;
        
        // Аутентифицируем пользователя
        this.authenticate(userId);
        
        // Показываем статус подключения
        this.showNotification({
          title: 'WebSocket',
          message: 'Подключение установлено',
          type: 'success'
        });
      });

      this.socket.on('connect_error', (error) => {
        console.error('❌ Ошибка подключения WebSocket:', error.message);
        this.connected = false;
      });

      this.socket.on('disconnect', (reason) => {
        console.log('❌ WebSocket отключен, причина:', reason);
        this.connected = false;
        
        if (reason === 'io server disconnect') {
          // Сервер принудительно отключил, нужно переподключиться вручную
          setTimeout(() => {
            if (this.userId) {
              this.connect(this.userId);
            }
          }, 1000);
        }
      });

      // Обработка входящих сообщений
      this.socket.onAny((event, data) => {
        this.handleMessage(event, data);
      });

    } catch (error) {
      console.error('Ошибка подключения WebSocket:', error);
      this.handleReconnect();
    }
  }

  // Аутентификация пользователя
  authenticate(userId) {
    if (this.socket && this.connected && userId) {
      this.socket.emit('authenticate', userId);
    }
  }

  // Присоединение к проекту
  joinProject(projectId) {
    if (this.socket && this.connected && projectId) {
      this.socket.emit('join_project', projectId);
    }
  }

  // Выход из проекта
  leaveProject(projectId) {
    if (this.socket && this.connected && projectId) {
      this.socket.emit('leave_project', projectId);
    }
  }

  // Присоединение к задаче
  joinTask(taskId) {
    if (this.socket && this.connected && taskId) {
      this.socket.emit('join_task', taskId);
    }
  }

  // Выход из задачи
  leaveTask(taskId) {
    if (this.socket && this.connected && taskId) {
      this.socket.emit('leave_task', taskId);
    }
  }

  // Обработка входящих сообщений
  handleMessage(event, data) {
    // Вызываем обработчики для этого типа события
    const handlers = this.listeners.get(event) || [];
    handlers.forEach(handler => {
      try {
        handler(data);
      } catch (error) {
        console.error(`Ошибка в обработчике события ${event}:`, error);
      }
    });

    // Обрабатываем системные события
    switch (event) {
      case 'notification':
        this.handleNotification(data);
        break;
      case 'user_mentioned':
        this.handleUserMention(data);
        break;
      case 'pong':
        // Ответ на пинг
        break;
    }
  }

  // Обработка уведомлений
  handleNotification(notification) {
    console.log('📢 Уведомление:', notification);
    
    // Показываем уведомление в UI
    this.showNotification(notification);
  }

  // Обработка упоминаний
  handleUserMention(mention) {
    console.log('👤 Вас упомянули:', mention);
    
    // Показываем уведомление об упоминании
    this.showNotification({
      title: 'Вас упомянули',
      message: `Вы упомянуты в комментарии к задаче "${mention.taskTitle}"`,
      type: 'info',
      data: mention
    });
  }

  // Отправка события
  emit(event, data) {
    if (this.socket && this.connected) {
      this.socket.emit(event, data);
    }
  }

  // Подписка на события
  on(event, handler) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(handler);
  }

  // Отписка от событий
  off(event, handler) {
    if (this.listeners.has(event)) {
      const handlers = this.listeners.get(event);
      const index = handlers.indexOf(handler);
      if (index !== -1) {
        handlers.splice(index, 1);
      }
    }
  }

  // Показать уведомление
  showNotification(notification) {
    // Проверяем поддержку Notification API
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.message,
        icon: '/favicon.ico'
      });
    } else if ('Notification' in window && Notification.permission !== 'denied') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          new Notification(notification.title, {
            body: notification.message,
            icon: '/favicon.ico'
          });
        }
      });
    }
    
    // Также отправляем событие для UI
    const uiEvent = new CustomEvent('websocket-notification', {
      detail: notification
    });
    window.dispatchEvent(uiEvent);
  }

  // Обработка переподключения
  handleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Превышено максимальное количество попыток переподключения');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`Попытка переподключения ${this.reconnectAttempts} через ${delay}ms`);
    
    setTimeout(() => {
      if (this.userId) {
        this.connect(this.userId);
      }
    }, delay);
  }

  // Отключение
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
      this.listeners.clear();
      console.log('WebSocket отключен');
    }
  }

  // Проверка статуса подключения
  isConnected() {
    return this.connected && this.socket?.connected;
  }

  // Получить статус подключения
  getStatus() {
    if (!this.socket) return 'disconnected';
    return this.socket.connected ? 'connected' : 'disconnected';
  }

  // Отправить событие об обновлении задачи
  sendTaskUpdated(taskId, projectId, task, userId) {
    this.emit('task_updated', {
      projectId,
      taskId,
      task,
      updatedBy: userId
    });
  }

  // Отправить событие о создании задачи
  sendTaskCreated(projectId, task, userId) {
    this.emit('task_created', {
      projectId,
      task,
      createdBy: userId
    });
  }

  // Отправить событие об удалении задачи
  sendTaskDeleted(projectId, taskId, userId) {
    this.emit('task_deleted', {
      projectId,
      taskId,
      deletedBy: userId
    });
  }

  // Отправить событие о добавлении комментария
  sendCommentAdded(taskId, projectId, comment, userId) {
    this.emit('comment_added', {
      projectId,
      taskId,
      comment,
      addedBy: userId
    });
  }

  // Пинг для поддержания соединения
  ping() {
    if (this.socket && this.connected) {
      this.socket.emit('ping');
    }
  }
}

// Создаем единственный экземпляр сервиса
const websocketService = new WebSocketService();

// Экспортируем функции для совместимости
export const initializeWebSocket = (userId) => {
  websocketService.connect(userId);
};

export const disconnectWebSocket = () => {
  websocketService.disconnect();
};

export { websocketService };