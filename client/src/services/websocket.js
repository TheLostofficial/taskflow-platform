import { io } from 'socket.io-client';
import { store } from '../store/store';
import { 
  fetchProjects,
  fetchProjectById
} from '../store/slices/projectsSlice';
import { 
  addTaskFromSocket,
  updateTaskFromSocket,
  deleteTaskFromSocket
} from '../store/slices/tasksSlice';

class WebSocketService {
  constructor() {
    this.socket = null;
    this.isConnecting = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.notificationQueue = [];
    this.isShowingNotification = false;
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
      this.showNotification('WebSocket', 'Подключение установлено', 'success');
    });

    this.socket.on('connected', (data) => {
      console.log('📡 WebSocket: Authenticated', data);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('🔌 WebSocket: Disconnected', reason);
      this.isConnecting = false;
      
      if (reason === 'io server disconnect') {
        this.showNotification('WebSocket', 'Соединение разорвано сервером. Попытка переподключения...', 'warning');
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
        this.showNotification('WebSocket', 'Не удалось подключиться. Проверьте интернет-соединение.', 'error');
        console.warn('⚠️ WebSocket: Max reconnection attempts reached');
      } else {
        this.showNotification('WebSocket', `Попытка подключения ${this.reconnectAttempts}/${this.maxReconnectAttempts}`, 'warning');
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
      
      // Показываем уведомление, если обновление сделано не текущим пользователем
      if (data.updatedBy && data.updatedBy !== store.getState().auth.user?._id) {
        this.showNotification('Проект обновлен', `Проект "${data.project?.name}" был обновлен другим пользователем`, 'info');
      }
    });

    this.socket.on('project_deleted', (data) => {
      console.log('🗑️ WebSocket: Project deleted', data);
      // Обновляем список проектов
      store.dispatch(fetchProjects());
      
      // Показываем уведомление
      this.showNotification('Проект удален', `Проект был удален`, 'warning');
    });

    this.socket.on('project_invite', (data) => {
      console.log('📨 WebSocket: Project invite received', data);
      this.showNotification('Приглашение в проект', `Вас приглашают в проект "${data.project.name}" от ${data.invitedBy.name}`, 'info');
    });

    this.socket.on('project_joined', (data) => {
      console.log('🎯 WebSocket: Joined project room', data);
    });

    // Task events
    this.socket.on('task_created', (data) => {
      console.log('📝 WebSocket: Task created', data);
      
      // Добавляем задачу в Redux store через socket action
      if (data.task) {
        store.dispatch(addTaskFromSocket(data.task));
      }
      
      // Обновляем проект, чтобы задачи обновились
      if (data.task && data.task.project) {
        store.dispatch(fetchProjectById(data.task.project));
      }
      
      // Показываем уведомление, если задача создана другим пользователем
      if (data.createdBy && data.createdBy !== store.getState().auth.user?._id) {
        this.showNotification('Новая задача', `Добавлена задача "${data.task?.title}"`, 'info');
      }
    });

    this.socket.on('task_updated', (data) => {
      console.log('✏️ WebSocket: Task updated', data);
      
      // Обновляем задачу в Redux store
      if (data.task) {
        store.dispatch(updateTaskFromSocket(data.task));
      }
      
      // Обновляем проект при изменении задачи
      if (data.task && data.task.project) {
        store.dispatch(fetchProjectById(data.task.project));
      }
      
      // Показываем уведомление, если обновление сделано не текущим пользователем
      if (data.updatedBy && data.updatedBy !== store.getState().auth.user?._id) {
        this.showNotification('Задача обновлена', `Задача "${data.task?.title}" была обновлена`, 'info');
      }
    });

    this.socket.on('task_deleted', (data) => {
      console.log('🗑️ WebSocket: Task deleted', data);
      
      // Удаляем задачу из Redux store
      if (data.taskId) {
        store.dispatch(deleteTaskFromSocket(data.taskId));
      }
      
      // Обновляем проект при удалении задачи
      if (data.projectId) {
        store.dispatch(fetchProjectById(data.projectId));
      }
      
      // Показываем уведомление
      if (data.deletedBy && data.deletedBy !== store.getState().auth.user?._id) {
        this.showNotification('Задача удалена', 'Задача была удалена другим пользователем', 'warning');
      }
    });

    this.socket.on('task_commented', (data) => {
      console.log('💬 WebSocket: Task commented', data);
      // Обновляем проект при добавлении комментария
      if (data.projectId) {
        store.dispatch(fetchProjectById(data.projectId));
      }
      
      // Показываем уведомление, если комментарий добавлен другим пользователем
      if (data.addedBy && data.addedBy !== store.getState().auth.user?._id) {
        this.showNotification('Новый комментарий', 'Добавлен комментарий к задаче', 'info');
      }
    });

    this.socket.on('comment_added', (data) => {
      console.log('💬 WebSocket: Comment added to task', data);
      // Можно добавить более специфичную логику для комментариев
    });

    // User events
    this.socket.on('mentioned', (data) => {
      console.log('🔔 WebSocket: You were mentioned', data);
      this.showNotification('Упоминание', `Вас упомянули в комментарии к задаче`, 'warning');
    });

    // Utility events
    this.socket.on('pong', (data) => {
      console.log('🏓 WebSocket: Pong received', data);
    });

    // Member events
    this.socket.on('member_joined', (data) => {
      console.log('👤 WebSocket: Member joined project', data);
      if (data.userId !== store.getState().auth.user?._id) {
        this.showNotification('Новый участник', `К проекту присоединился новый участник`, 'info');
      }
    });

    this.socket.on('member_left', (data) => {
      console.log('👋 WebSocket: Member left project', data);
      this.showNotification('Участник вышел', `Участник покинул проект`, 'warning');
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
      this.showNotification('WebSocket', 'Соединение закрыто', 'info');
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
    const notification = this.createNotificationElement(title, message, type);
    
    // Добавляем в очередь
    this.notificationQueue.push({ notification, type });
    
    // Показываем следующее уведомление, если не показываем сейчас
    if (!this.isShowingNotification) {
      this.showNextNotification();
    }
  }

  createNotificationElement(title, message, type) {
    const notification = document.createElement('div');
    
    const typeClasses = {
      success: 'alert-success',
      error: 'alert-danger',
      warning: 'alert-warning',
      info: 'alert-info'
    };

    const icons = {
      success: '✅',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️'
    };

    notification.className = `alert ${typeClasses[type] || 'alert-info'} alert-dismissible fade show position-fixed`;
    notification.style.cssText = `
      top: 20px;
      right: 20px;
      z-index: 9999;
      min-width: 300px;
      max-width: 400px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      transform: translateX(100%);
      opacity: 0;
      transition: transform 0.3s ease, opacity 0.3s ease;
    `;

    notification.innerHTML = `
      <div class="d-flex align-items-start">
        <div class="me-2" style="font-size: 1.2rem;">
          ${icons[type] || 'ℹ️'}
        </div>
        <div class="flex-grow-1">
          <h6 class="alert-heading mb-1" style="font-size: 0.9rem;">${title}</h6>
          <p class="mb-0" style="font-size: 0.8rem;">${message}</p>
        </div>
        <button type="button" class="btn-close" style="padding: 0.5rem; margin-left: 0.5rem;"></button>
      </div>
    `;

    // Добавляем в body
    document.body.appendChild(notification);

    // Анимация появления
    setTimeout(() => {
      notification.style.transform = 'translateX(0)';
      notification.style.opacity = '1';
    }, 10);

    // Автоматическое скрытие через 5 секунд
    setTimeout(() => {
      this.hideNotification(notification);
    }, 5000);

    // Обработчик закрытия
    const closeBtn = notification.querySelector('.btn-close');
    closeBtn.addEventListener('click', () => {
      this.hideNotification(notification);
    });

    return notification;
  }

  hideNotification(notification) {
    notification.style.transform = 'translateX(100%)';
    notification.style.opacity = '0';
    
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
      this.isShowingNotification = false;
      this.showNextNotification();
    }, 300);
  }

  showNextNotification() {
    if (this.notificationQueue.length === 0) {
      this.isShowingNotification = false;
      return;
    }

    this.isShowingNotification = true;
    const { notification } = this.notificationQueue.shift();
    
    // Уведомление уже показано при создании
    // Просто обновляем флаг, что показываем следующее
    setTimeout(() => {
      this.isShowingNotification = false;
      this.showNextNotification();
    }, 100);
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