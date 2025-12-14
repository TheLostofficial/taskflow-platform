import io from 'socket.io-client';
import { API_URL } from '../utils/constants';

class WebSocketService {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
  }

  connect() {
    const token = localStorage.getItem('token');
    
    if (!token) {
      console.log('No token found, WebSocket connection skipped');
      return;
    }

    if (this.socket?.connected) {
      console.log('WebSocket already connected');
      return;
    }

    try {
      this.socket = io(API_URL, {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: this.reconnectDelay,
      });

      this.setupEventListeners();
      console.log('WebSocket connecting...');
    } catch (error) {
      console.error('WebSocket connection error:', error);
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.reconnectAttempts = 0;
      console.log('WebSocket disconnected');
    }
  }

  setupEventListeners() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('✅ WebSocket connected successfully');
      this.reconnectAttempts = 0;
    });

    this.socket.on('disconnect', (reason) => {
      console.log('⚠️ WebSocket disconnected:', reason);
      if (reason === 'io server disconnect') {
        // Сервер отключил сокет, нужно переподключиться
        this.socket.connect();
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ WebSocket connection error:', error);
      this.reconnectAttempts++;
      
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('Max reconnection attempts reached');
      }
    });

    // Пользовательские события
    this.socket.on('taskCreated', (data) => {
      this.emitToListeners('taskCreated', data);
      console.log('📝 Task created via WebSocket:', data);
    });

    this.socket.on('taskUpdated', (data) => {
      this.emitToListeners('taskUpdated', data);
      console.log('📝 Task updated via WebSocket:', data);
    });

    this.socket.on('taskDeleted', (data) => {
      this.emitToListeners('taskDeleted', data);
      console.log('🗑️ Task deleted via WebSocket:', data);
    });

    this.socket.on('commentAdded', (data) => {
      this.emitToListeners('commentAdded', data);
      console.log('💬 Comment added via WebSocket:', data);
    });

    this.socket.on('commentUpdated', (data) => {
      this.emitToListeners('commentUpdated', data);
      console.log('💬 Comment updated via WebSocket:', data);
    });

    this.socket.on('commentDeleted', (data) => {
      this.emitToListeners('commentDeleted', data);
      console.log('🗑️ Comment deleted via WebSocket:', data);
    });

    this.socket.on('userMentioned', (data) => {
      this.emitToListeners('userMentioned', data);
      console.log('👤 User mentioned via WebSocket:', data);
    });

    // Проектные события
    this.socket.on('projectUpdated', (data) => {
      this.emitToListeners('projectUpdated', data);
      console.log('📁 Project updated via WebSocket:', data);
    });

    this.socket.on('memberAdded', (data) => {
      this.emitToListeners('memberAdded', data);
      console.log('👥 Member added via WebSocket:', data);
    });

    this.socket.on('memberRemoved', (data) => {
      this.emitToListeners('memberRemoved', data);
      console.log('👋 Member removed via WebSocket:', data);
    });
  }

  emitToListeners(event, data) {
    const listeners = this.listeners.get(event) || [];
    listeners.forEach(listener => listener(data));
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
    
    // Если сокет уже подключен, подписываемся на событие
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  off(event, callback) {
    if (!this.listeners.has(event)) return;
    
    const listeners = this.listeners.get(event);
    const index = listeners.indexOf(callback);
    if (index !== -1) {
      listeners.splice(index, 1);
    }
    
    // Отписываемся от события сокета
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }

  emit(event, data) {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
      return true;
    }
    console.warn(`⚠️ Cannot emit ${event}: WebSocket not connected`);
    return false;
  }

  isConnected() {
    return this.socket?.connected || false;
  }

  getSocketId() {
    return this.socket?.id || null;
  }
}

export const websocketService = new WebSocketService();

// Инициализация WebSocket
export const initializeWebSocket = () => {
  websocketService.connect();
  
  // Автоматическое переподключение при изменении токена
  const originalSetItem = localStorage.setItem;
  localStorage.setItem = function(key, value) {
    if (key === 'token' && value) {
      originalSetItem.apply(this, arguments);
      setTimeout(() => {
        websocketService.disconnect();
        websocketService.connect();
      }, 100);
    } else {
      originalSetItem.apply(this, arguments);
    }
  };
};

// Отключение WebSocket
export const disconnectWebSocket = () => {
  websocketService.disconnect();
};

// Утилита для получения состояния подключения
export const getWebSocketStatus = () => {
  return {
    connected: websocketService.isConnected(),
    socketId: websocketService.getSocketId()
  };
};