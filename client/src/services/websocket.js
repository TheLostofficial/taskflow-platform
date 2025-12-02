import { io } from 'socket.io-client';
import { store } from '../store/store';
import { 
  addTask as addTaskAction, 
  updateTask as updateTaskAction, 
  deleteTask as deleteTaskAction 
} from '../store/slices/tasksSlice';
import { 
  updateProject as updateProjectAction,
  deleteProject as deleteProjectAction
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
      if (data.project) {
        store.dispatch(updateProjectAction(data.project));
      }
    });

    this.socket.on('project_deleted', (data) => {
      console.log('🗑️ WebSocket: Project deleted', data);
      if (data.projectId) {
        store.dispatch(deleteProjectAction(data.projectId));
      }
    });

    this.socket.on('project_invite', (data) => {
      console.log('📨 WebSocket: Project invite received', data);
      this.showNotification('Приглашение в проект', `Вас приглашают в проект "${data.project.name}"`, 'info');
    });

    // Task events
    this.socket.on('task_created', (data) => {
      console.log('📝 WebSocket: Task created', data);
      if (data.task) {
        store.dispatch(addTaskAction(data.task));
      }
    });

    this.socket.on('task_updated', (data) => {
      console.log('✏️ WebSocket: Task updated', data);
      if (data.task) {
        store.dispatch(updateTaskAction(data.task));
      }
    });

    this.socket.on('task_deleted', (data) => {
      console.log('🗑️ WebSocket: Task deleted', data);
      if (data.taskId) {
        store.dispatch(deleteTaskAction(data.taskId));
      }
    });

    this.socket.on('task_commented', (data) => {
      console.log('💬 WebSocket: Task commented', data);
    });

    // Comment events
    this.socket.on('comment_added', (data) => {
      console.log('💬 WebSocket: Comment added', data);
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

  showNotification(title, message, type = 'info') {
    console.log(`🔔 Notification [${type}]: ${title} - ${message}`);
    
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body: message,
        icon: '/favicon.ico'
      });
    }
  }

  requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        console.log('Notification permission:', permission);
      });
    }
  }
}

const websocketService = new WebSocketService();
export default websocketService;