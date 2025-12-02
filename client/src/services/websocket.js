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
    this.maxReconnectAttempts = 10;
    this.reconnectDelay = 2000;
    this.connectionTimeout = 10000;
    this.heartbeatInterval = null;
    this._connectionStatus = false;
    this.userId = null;
  }

  connect(token) {
    // Если уже подключаемся или уже подключены, выходим
    if (this.isConnecting || (this.socket?.connected && this._connectionStatus)) {
      console.log('🔄 WebSocket: Уже подключен или подключается');
      return;
    }

    // Если есть старый сокет, отключаем его
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    this.isConnecting = true;
    this.reconnectAttempts = 0;
    
    console.log(`🔗 WebSocket: Начинаем подключение...`);

    try {
      // ИСПРАВЛЕНО: Используем WS URL вместо HTTP API URL
      const wsUrl = process.env.REACT_APP_WS_URL || 'ws://localhost:5000';
      console.log(`🔗 WebSocket: Подключение к ${wsUrl}...`);
      
      this.socket = io(wsUrl, {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: this.reconnectDelay,
        reconnectionDelayMax: 10000,
        timeout: this.connectionTimeout,
        withCredentials: true,
        // Явно указываем путь WebSocket
        path: '/socket.io/'
      });

      this.setupEventListeners();
      
      // Таймаут подключения
      setTimeout(() => {
        if (this.isConnecting && !this._connectionStatus) {
          console.warn('⏰ WebSocket: Таймаут подключения');
          this.isConnecting = false;
          this.showNotification('WebSocket', 'Таймаут подключения', 'warning');
        }
      }, this.connectionTimeout);
      
    } catch (error) {
      console.error('❌ WebSocket: Ошибка при создании подключения:', error);
      this.isConnecting = false;
      this.handleReconnect();
    }
  }

  setupEventListeners() {
    if (!this.socket) return;

    // Успешное подключение
    this.socket.on('connect', () => {
      console.log('✅ WebSocket: Подключено, socket ID:', this.socket.id);
      console.log('🔌 WebSocket URL:', this.socket.io.uri);
      this.isConnecting = false;
      this._connectionStatus = true;
      this.reconnectAttempts = 0;
      
      this.startHeartbeat();
      
      this.showNotification('WebSocket', 'Подключение установлено', 'success');
    });

    // Подтверждение аутентификации
    this.socket.on('connected', (data) => {
      console.log('📡 WebSocket: Аутентифицирован', data);
      this.userId = data.userId;
      
      // Тестовое сообщение после подключения
      setTimeout(() => {
        this.sendTestMessage();
      }, 1000);
    });

    // Отключение
    this.socket.on('disconnect', (reason) => {
      console.log('🔌 WebSocket: Отключено, причина:', reason);
      this.isConnecting = false;
      this._connectionStatus = false;
      this.userId = null;
      
      this.stopHeartbeat();
      
      if (reason === 'io server disconnect' || reason === 'transport close') {
        this.showNotification('WebSocket', 'Соединение разорвано. Попытка переподключения...', 'warning');
        setTimeout(() => {
          if (this.socket) {
            this.socket.connect();
          }
        }, 1000);
      }
    });

    // Ошибка подключения
    this.socket.on('connect_error', (error) => {
      console.error('❌ WebSocket: Ошибка подключения:', error.message);
      console.error('❌ WebSocket error details:', error);
      this.isConnecting = false;
      this._connectionStatus = false;
      this.reconnectAttempts++;
      
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        this.showNotification('WebSocket', 'Не удалось подключиться. Проверьте интернет-соединение.', 'error');
        console.warn('⚠️ WebSocket: Достигнут лимит попыток переподключения');
      } else {
        console.log(`🔄 WebSocket: Попытка переподключения ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
      }
    });

    this.socket.on('error', (error) => {
      console.error('❌ WebSocket: Ошибка:', error);
      this.showNotification('WebSocket', `Ошибка: ${error.message || 'Неизвестная ошибка'}`, 'error');
    });

    this.socket.on('pong', (data) => {
      console.log('🏓 WebSocket: Pong получен', data);
    });

    this.socket.on('test_response', (data) => {
      console.log('🧪 WebSocket: Тестовый ответ:', data);
    });

    this.socket.on('test_notification', (data) => {
      console.log('🔔 WebSocket: Тестовое уведомление:', data);
      this.showNotification('Тест WebSocket', data.message, 'info');
    });

    // Присоединение к комнате проекта
    this.socket.on('project_joined', (data) => {
      console.log('🎯 WebSocket: Присоединен к проекту', data);
    });

    // Бизнес-события
    this.socket.on('project_updated', (data) => {
      console.log('📤 WebSocket: Проект обновлен', data);
      
      store.dispatch(fetchProjects());
      
      if (data.project && data.project._id) {
        store.dispatch(fetchProjectById(data.project._id));
      }
      
      const currentUserId = store.getState().auth.user?._id;
      if (data.updatedBy && data.updatedBy !== currentUserId) {
        this.showNotification('Проект обновлен', `Проект "${data.project?.name}" был обновлен`, 'info');
      }
    });

    this.socket.on('project_deleted', (data) => {
      console.log('🗑️ WebSocket: Проект удален', data);
      store.dispatch(fetchProjects());
      this.showNotification('Проект удален', `Проект был удален`, 'warning');
    });

    this.socket.on('project_invite', (data) => {
      console.log('📨 WebSocket: Приглашение в проект', data);
      this.showNotification('Приглашение в проект', 
        `Вас приглашают в проект "${data.project.name}" от ${data.invitedBy.name}`, 
        'info');
    });

    this.socket.on('task_created', (data) => {
      console.log('📝 WebSocket: Задача создана', data);
      
      if (data.task) {
        store.dispatch(addTaskFromSocket(data.task));
      }
      
      if (data.task && data.task.project) {
        store.dispatch(fetchProjectById(data.task.project));
      }
      
      const currentUserId = store.getState().auth.user?._id;
      if (data.createdBy && data.createdBy !== currentUserId) {
        this.showNotification('Новая задача', `Добавлена задача "${data.task?.title}"`, 'info');
      }
    });

    this.socket.on('task_updated', (data) => {
      console.log('✏️ WebSocket: Задача обновлена', data);
      
      if (data.task) {
        store.dispatch(updateTaskFromSocket(data.task));
      }
      
      const currentUserId = store.getState().auth.user?._id;
      if (data.updatedBy && data.updatedBy !== currentUserId) {
        this.showNotification('Задача обновлена', `Задача "${data.task?.title}" была обновлена`, 'info');
      }
    });

    this.socket.on('task_deleted', (data) => {
      console.log('🗑️ WebSocket: Задача удалена', data);
      
      if (data.taskId) {
        store.dispatch(deleteTaskFromSocket(data.taskId));
      }
      
      const currentUserId = store.getState().auth.user?._id;
      if (data.deletedBy && data.deletedBy !== currentUserId) {
        this.showNotification('Задача удалена', 'Задача была удалена другим пользователем', 'warning');
      }
    });

    this.socket.on('task_commented', (data) => {
      console.log('💬 WebSocket: Комментарий к задаче', data);
      
      if (data.projectId) {
        store.dispatch(fetchProjectById(data.projectId));
      }
      
      const currentUserId = store.getState().auth.user?._id;
      if (data.addedBy && data.addedBy !== currentUserId) {
        this.showNotification('Новый комментарий', 'Добавлен комментарий к задаче', 'info');
      }
    });

    this.socket.on('comment_added', (data) => {
      console.log('💬 WebSocket: Комментарий добавлен', data);
    });

    this.socket.on('member_joined', (data) => {
      console.log('👤 WebSocket: Участник присоединился', data);
      const currentUserId = store.getState().auth.user?._id;
      if (data.userId !== currentUserId) {
        this.showNotification('Новый участник', 'К проекту присоединился новый участник', 'info');
      }
    });

    this.socket.on('member_left', (data) => {
      console.log('👋 WebSocket: Участник покинул', data);
      this.showNotification('Участник вышел', 'Участник покинул проект', 'warning');
    });

    this.socket.on('mentioned', (data) => {
      console.log('🔔 WebSocket: Вас упомянули', data);
      this.showNotification('Упоминание', 'Вас упомянули в комментарии', 'warning');
    });

    this.socket.on('notification', (data) => {
      console.log('🔔 WebSocket: Уведомление:', data);
      this.showNotification(data.title || 'Уведомление', data.message, data.type || 'info');
    });
  }

  startHeartbeat() {
    this.stopHeartbeat();
    
    this.heartbeatInterval = setInterval(() => {
      if (this.socket?.connected) {
        this.sendPing();
      }
    }, 30000);
  }

  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  joinProject(projectId) {
    if (this.socket?.connected && projectId) {
      this.socket.emit('join_project', projectId);
      console.log(`📡 WebSocket: Присоединяемся к проекту ${projectId}`);
    } else {
      console.warn(`⚠️ WebSocket: Не могу присоединиться к проекту ${projectId} - сокет не подключен`);
    }
  }

  leaveProject(projectId) {
    if (this.socket?.connected && projectId) {
      this.socket.emit('leave_project', projectId);
      console.log(`👋 WebSocket: Покидаем проект ${projectId}`);
    }
  }

  joinTask(taskId) {
    if (this.socket?.connected && taskId) {
      this.socket.emit('join_task', taskId);
      console.log(`📡 WebSocket: Присоединяемся к задаче ${taskId}`);
    }
  }

  leaveTask(taskId) {
    if (this.socket?.connected && taskId) {
      this.socket.emit('leave_task', taskId);
      console.log(`👋 WebSocket: Покидаем задачу ${taskId}`);
    }
  }

  sendPing() {
    if (this.socket?.connected) {
      this.socket.emit('ping', { 
        timestamp: Date.now(),
        clientTime: new Date().toISOString()
      });
    }
  }

  sendTestMessage() {
    if (this.socket?.connected) {
      this.socket.emit('test_message', { 
        message: 'Тестовое сообщение от клиента',
        timestamp: new Date().toISOString()
      });
      console.log('🧪 WebSocket: Отправлено тестовое сообщение');
    } else {
      console.warn('⚠️ WebSocket: Не могу отправить тестовое сообщение - сокет не подключен');
    }
  }

  disconnect() {
    if (this.socket) {
      this.stopHeartbeat();
      this.socket.disconnect();
      this.socket = null;
      this._connectionStatus = false;
      this.userId = null;
      console.log('🔌 WebSocket: Соединение закрыто вручную');
      this.showNotification('WebSocket', 'Соединение закрыто', 'info');
    }
  }

  isConnected() {
    return this.socket?.connected && this._connectionStatus;
  }

  getSocketId() {
    return this.socket?.id;
  }

  getUserId() {
    return this.userId;
  }

  handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      setTimeout(() => {
        const token = localStorage.getItem('token');
        if (token) {
          console.log(`🔄 WebSocket: Попытка переподключения ${this.reconnectAttempts + 1}/${this.maxReconnectAttempts}`);
          this.connect(token);
        }
      }, this.reconnectDelay);
    }
  }

  showNotification(title, message, type = 'info') {
    console.log(`🔔 [${type.toUpperCase()}] ${title}: ${message}`);
    
    if (type === 'error') {
      console.error(title, message);
    } else if (type === 'warning') {
      console.warn(title, message);
    }
    
    // Создаем уведомление в DOM
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

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.style.transform = 'translateX(0)';
      notification.style.opacity = '1';
    }, 10);

    setTimeout(() => {
      notification.style.transform = 'translateX(100%)';
      notification.style.opacity = '0';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 5000);

    const closeBtn = notification.querySelector('.btn-close');
    closeBtn.addEventListener('click', () => {
      notification.style.transform = 'translateX(100%)';
      notification.style.opacity = '0';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    });
  }

  requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        console.log('Notification permission:', permission);
      });
    }
  }

  // Метод для отладки
  debug() {
    return {
      connected: this.isConnected(),
      socketId: this.getSocketId(),
      userId: this.getUserId(),
      isConnecting: this.isConnecting,
      reconnectAttempts: this.reconnectAttempts,
      socket: this.socket ? {
        id: this.socket.id,
        connected: this.socket.connected,
        disconnected: this.socket.disconnected,
        uri: this.socket.io?.uri
      } : null
    };
  }
}

const websocketService = new WebSocketService();
export default websocketService;