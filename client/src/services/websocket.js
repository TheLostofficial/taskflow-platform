import { io } from 'socket.io-client';
import { API_URL, WS_URL } from '../utils/constants';

class WebSocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.listeners = new Map();
    this.subscribedProjects = new Set();
    this.subscribedTasks = new Set();
  }

  connect() {
    if (this.socket && this.isConnected) {
      console.log('🔌 WebSocket уже подключен');
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      console.error('❌ WebSocket: Токен отсутствует');
      return;
    }

    console.log('🔌 WebSocket: Попытка подключения к', WS_URL);

    this.socket = io(WS_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: this.reconnectDelay,
      timeout: 10000,
      query: {
        client: 'web',
        version: '1.0'
      }
    });

    this.setupEventHandlers();
  }

  setupEventHandlers() {
    this.socket.on('connect', () => {
      console.log('✅ WebSocket: Подключение установлено');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      
      // Восстанавливаем подписки после переподключения
      this.restoreSubscriptions();
      
      // Отправляем событие о подключении
      this.emit('socket_connected', { timestamp: Date.now() });
    });

    this.socket.on('disconnect', (reason) => {
      console.log(`❌ WebSocket: Отключен. Причина: ${reason}`);
      this.isConnected = false;
      
      if (reason === 'io server disconnect') {
        // Переподключение по инициативе сервера
        setTimeout(() => {
          this.socket.connect();
        }, 1000);
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ WebSocket: Ошибка подключения:', error.message);
      this.isConnected = false;
      this.reconnectAttempts++;
      
      if (this.reconnectAttempts <= this.maxReconnectAttempts) {
        console.log(`🔄 WebSocket: Попытка переподключения ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
      }
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log(`✅ WebSocket: Успешное переподключение (попытка ${attemptNumber})`);
      this.isConnected = true;
      this.restoreSubscriptions();
    });

    this.socket.on('reconnect_failed', () => {
      console.error('❌ WebSocket: Не удалось переподключиться');
      this.isConnected = false;
    });

    // Обработка входящих событий
    this.socket.on('taskCreated', (data) => {
      console.log('📡 WebSocket: Получено событие taskCreated:', data);
      this.dispatchEvent('taskCreated', data);
    });

    this.socket.on('taskUpdated', (data) => {
      console.log('📡 WebSocket: Получено событие taskUpdated:', data);
      this.dispatchEvent('taskUpdated', data);
    });

    this.socket.on('taskDeleted', (data) => {
      console.log('📡 WebSocket: Получено событие taskDeleted:', data);
      this.dispatchEvent('taskDeleted', data);
    });

    this.socket.on('commentAdded', (data) => {
      console.log('📡 WebSocket: Получено событие commentAdded:', data);
      this.dispatchEvent('commentAdded', data);
    });

    this.socket.on('commentUpdated', (data) => {
      console.log('📡 WebSocket: Получено событие commentUpdated:', data);
      this.dispatchEvent('commentUpdated', data);
    });

    this.socket.on('commentDeleted', (data) => {
      console.log('📡 WebSocket: Получено событие commentDeleted:', data);
      this.dispatchEvent('commentDeleted', data);
    });

    this.socket.on('checklistUpdated', (data) => {
      console.log('📡 WebSocket: Получено событие checklistUpdated:', data);
      this.dispatchEvent('checklistUpdated', data);
    });

    this.socket.on('taskStatusChanged', (data) => {
      console.log('📡 WebSocket: Получено событие taskStatusChanged:', data);
      this.dispatchEvent('taskStatusChanged', data);
    });

    this.socket.on('taskAssigned', (data) => {
      console.log('📡 WebSocket: Получено событие taskAssigned:', data);
      this.dispatchEvent('taskAssigned', data);
    });

    this.socket.on('userMentioned', (data) => {
      console.log('📡 WebSocket: Получено событие userMentioned:', data);
      this.dispatchEvent('userMentioned', data);
    });

    // Пинг-понг для поддержания соединения
    this.socket.on('pong', (data) => {
      console.log('🏓 WebSocket: Получен pong', data);
    });
  }

  // Восстановление подписок после переподключения
  restoreSubscriptions() {
    console.log('🔄 WebSocket: Восстановление подписок...');
    
    this.subscribedProjects.forEach(projectId => {
      this.subscribeToProject(projectId);
    });
    
    this.subscribedTasks.forEach(taskId => {
      this.subscribeToTask(taskId);
    });
  }

  // Подписка на проект
  subscribeToProject(projectId) {
    if (!this.isConnected || !projectId) return;
    
    console.log(`📡 WebSocket: Подписка на проект ${projectId}`);
    this.socket.emit('subscribeToProject', projectId);
    this.subscribedProjects.add(projectId);
  }

  // Отписка от проекта
  unsubscribeFromProject(projectId) {
    if (!this.isConnected || !projectId) return;
    
    console.log(`📡 WebSocket: Отписка от проекта ${projectId}`);
    this.socket.emit('unsubscribeFromProject', projectId);
    this.subscribedProjects.delete(projectId);
  }

  // Подписка на задачу
  subscribeToTask(taskId) {
    if (!this.isConnected || !taskId) return;
    
    console.log(`📡 WebSocket: Подписка на задачу ${taskId}`);
    this.socket.emit('subscribeToTask', taskId);
    this.subscribedTasks.add(taskId);
  }

  // Отписка от задачи
  unsubscribeFromTask(taskId) {
    if (!this.isConnected || !taskId) return;
    
    console.log(`📡 WebSocket: Отписка от задачи ${taskId}`);
    this.socket.emit('unsubscribeFromTask', taskId);
    this.subscribedTasks.delete(taskId);
  }

  // Отправка события
  emit(event, data) {
    if (!this.isConnected || !this.socket) {
      console.warn('⚠️ WebSocket: Не удалось отправить событие, соединение не установлено');
      return false;
    }
    
    console.log(`📤 WebSocket: Отправка события ${event}:`, data);
    return this.socket.emit(event, data);
  }

  // Подписка на событие
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
    
    // Также подписываемся на событие через socket.io
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  // Отписка от события
  off(event, callback) {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.delete(callback);
      if (eventListeners.size === 0) {
        this.listeners.delete(event);
      }
    }
    
    // Также отписываемся от события через socket.io
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }

  // Диспатч события всем слушателям
  dispatchEvent(event, data) {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`❌ WebSocket: Ошибка в обработчике события ${event}:`, error);
        }
      });
    }
  }

  // Отправка комментария через WebSocket
  sendComment(taskId, comment) {
    return this.emit('sendComment', {
      taskId,
      comment,
      timestamp: Date.now()
    });
  }

  // Отправка пинга
  ping() {
    if (this.isConnected) {
      this.emit('ping', { timestamp: Date.now() });
    }
  }

  // Отключение
  disconnect() {
    if (this.socket) {
      console.log('🔌 WebSocket: Отключение...');
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.listeners.clear();
      this.subscribedProjects.clear();
      this.subscribedTasks.clear();
    }
  }

  // Получение статуса подключения
  getStatus() {
    return {
      isConnected: this.isConnected,
      subscribedProjects: Array.from(this.subscribedProjects),
      subscribedTasks: Array.from(this.subscribedTasks),
      reconnectAttempts: this.reconnectAttempts
    };
  }
}

// Создаем singleton экземпляр
const websocketService = new WebSocketService();

// Экспортируем и как default, и как именованный экспорт для совместимости
export { websocketService };
export default websocketService;