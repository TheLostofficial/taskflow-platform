import { io } from 'socket.io-client';
import { store } from '../store/store';
import { 
  createTask, 
  updateTask, 
  deleteTask 
} from '../store/slices/tasksSlice';
import { 
  fetchProjects,
  fetchProjectById
} from '../store/slices/projectsSlice';

class WebSocketService {
  constructor() {
    this.socket = null;
    this.isConnecting = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
  }

  connect(token) {
    if (this.socket?.connected || this.isConnecting) {
      return;
    }

    this.isConnecting = true;
    
    try {
      this.socket = io(process.env.REACT_APP_WS_URL || 'ws://localhost:5000', {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: this.reconnectDelay,
      });

      this.setupEventListeners();
      
      console.log('🔄 WebSocket: Connecting...');
    } catch (error) {
      console.error('WebSocket connection error:', error);
      this.isConnecting = false;
    }
  }

  setupEventListeners() {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', () => {
      console.log('✅ WebSocket: Connected');
      this.isConnecting = false;
      this.reconnectAttempts = 0;
    });

    this.socket.on('connected', (data) => {
      console.log('📡 WebSocket: Authenticated', data);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('🔌 WebSocket: Disconnected', reason);
      this.isConnecting = false;
      
      if (reason === 'io server disconnect') {
        // Server initiated disconnect, need to manually reconnect
        setTimeout(() => {
          this.socket.connect();
        }, 1000);
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ WebSocket: Connection error', error.message);
      this.isConnecting = false;
      this.reconnectAttempts++;
      
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.warn('⚠️ WebSocket: Max reconnection attempts reached');
      }
    });

    // Project events
    this.socket.on('project_updated', (data) => {
      console.log('📤 WebSocket: Project updated', data);
      // Обновляем список проектов
      store.dispatch(fetchProjects());
      // Если открыт конкретный проект - обновляем его
      if (data.project && data.project._id) {
        store.dispatch(fetchProjectById(data.project._id));
      }
    });

    this.socket.on('project_deleted', (data) => {
      console.log('🗑️ WebSocket: Project deleted', data);
      // Обновляем список проектов
      store.dispatch(fetchProjects());
    });

    this.socket.on('project_invite', (data) => {
      console.log('📨 WebSocket: Project invite received', data);
      // Можно добавить уведомление в UI
      this.showNotification('Приглашение в проект', `Вас приглашают в проект "${data.project.name}"`, 'info');
    });

    // Task events
    this.socket.on('task_created', (data) => {
      console.log('📝 WebSocket: Task created', data);
      // При создании задачи на клиенте обновляем список задач проекта
      if (data.task && data.task.project) {
        // Обновляем проект, чтобы задачи обновились
        store.dispatch(fetchProjectById(data.task.project));
      }
    });

    this.socket.on('task_updated', (data) => {
      console.log('✏️ WebSocket: Task updated', data);
      // Обновляем задачу в проекте
      if (data.task && data.task.project) {
        store.dispatch(fetchProjectById(data.task.project));
      }
    });

    this.socket.on('task_deleted', (data) => {
      console.log('🗑️ WebSocket: Task deleted', data);
      // Обновляем проект при удалении задачи
      if (data.projectId) {
        store.dispatch(fetchProjectById(data.projectId));
      }
    });

    this.socket.on('task_commented', (data) => {
      console.log('💬 WebSocket: Task commented', data);
      // Обновляем проект при добавлении комментария
      if (data.projectId) {
        store.dispatch(fetchProjectById(data.projectId));
      }
    });

    // User events
    this.socket.on('mentioned', (data) => {
      console.log('🔔 WebSocket: You were mentioned', data);
      this.showNotification('Упоминание', `Вас упомянули в комментарии`, 'warning');
    });

    // Utility events
    this.socket.on('pong', (data) => {
      console.log('🏓 WebSocket: Pong received', data);
    });
  }

  // Public methods
  joinProject(projectId) {
    if (this.socket?.connected && projectId) {
      this.socket.emit('join_project', projectId);
      console.log(`📡 WebSocket: Joined project ${projectId}`);
    }
  }

  leaveProject(projectId) {
    if (this.socket?.connected && projectId) {
      this.socket.emit('leave_project', projectId);
      console.log(`👋 WebSocket: Left project ${projectId}`);
    }
  }

  joinTask(taskId) {
    if (this.socket?.connected && taskId) {
      this.socket.emit('join_task', taskId);
      console.log(`📡 WebSocket: Joined task ${taskId}`);
    }
  }

  leaveTask(taskId) {
    if (this.socket?.connected && taskId) {
      this.socket.emit('leave_task', taskId);
      console.log(`👋 WebSocket: Left task ${taskId}`);
    }
  }

  sendPing() {
    if (this.socket?.connected) {
      this.socket.emit('ping', { timestamp: Date.now() });
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      console.log('🔌 WebSocket: Disconnected manually');
    }
  }

  isConnected() {
    return this.socket?.connected || false;
  }

  getSocketId() {
    return this.socket?.id;
  }

  // Helper method for notifications
  showNotification(title, message, type = 'info') {
    console.log(`🔔 Notification [${type}]: ${title} - ${message}`);
    
    // Создаем кастомное уведомление
    if (typeof window !== 'undefined') {
      const notification = document.createElement('div');
      notification.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
      notification.style.cssText = `
        top: 20px;
        right: 20px;
        z-index: 9999;
        min-width: 300px;
        max-width: 400px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      `;
      
      notification.innerHTML = `
        <strong>${title}</strong><br>
        <small>${message}</small>
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
      `;
      
      document.body.appendChild(notification);
      
      // Автоматическое скрытие через 5 секунд
      setTimeout(() => {
        if (notification.parentNode) {
          notification.remove();
        }
      }, 5000);
    }
  }

  // Request notification permissions
  requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        console.log('Notification permission:', permission);
      });
    }
  }
}

// Экспортируем singleton instance
const websocketService = new WebSocketService();
export default websocketService;