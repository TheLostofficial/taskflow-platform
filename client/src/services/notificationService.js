class NotificationService {
  constructor() {
    this.notificationQueue = [];
    this.isShowing = false;
    this.notificationContainer = null;
  }

  init() {
    this.createNotificationContainer();
  }

  createNotificationContainer() {
    // Создаем контейнер для уведомлений
    this.notificationContainer = document.createElement('div');
    this.notificationContainer.id = 'notification-container';
    this.notificationContainer.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: 10px;
      max-width: 400px;
    `;
    
    document.body.appendChild(this.notificationContainer);
  }

  showNotification({ title, message, type = 'info', duration = 5000 }) {
    const notification = this.createNotificationElement({ title, message, type, duration });
    
    // Добавляем в контейнер
    this.notificationContainer.appendChild(notification);
    
    // Анимация появления
    setTimeout(() => {
      notification.style.transform = 'translateX(0)';
      notification.style.opacity = '1';
    }, 10);

    // Автоматическое скрытие
    if (duration > 0) {
      setTimeout(() => {
        this.hideNotification(notification);
      }, duration);
    }

    return notification;
  }

  createNotificationElement({ title, message, type, duration }) {
    const notification = document.createElement('div');
    
    const typeClasses = {
      success: 'alert-success',
      error: 'alert-danger',
      warning: 'alert-warning',
      info: 'alert-info'
    };

    notification.className = `alert ${typeClasses[type] || 'alert-info'} alert-dismissible fade show`;
    notification.style.cssText = `
      transform: translateX(100%);
      opacity: 0;
      transition: transform 0.3s ease, opacity 0.3s ease;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      margin: 0;
      padding: 0.75rem 1rem;
    `;

    notification.innerHTML = `
      <div class="d-flex align-items-start">
        <div class="me-2">
          ${this.getIcon(type)}
        </div>
        <div class="flex-grow-1">
          <h6 class="alert-heading mb-1" style="font-size: 0.9rem;">${title}</h6>
          <p class="mb-0" style="font-size: 0.8rem;">${message}</p>
        </div>
        <button type="button" class="btn-close" style="padding: 0.5rem; margin-left: 0.5rem;"></button>
      </div>
    `;

    // Обработчик закрытия
    const closeBtn = notification.querySelector('.btn-close');
    closeBtn.addEventListener('click', () => {
      this.hideNotification(notification);
    });

    return notification;
  }

  getIcon(type) {
    const icons = {
      success: '✅',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️'
    };
    return icons[type] || 'ℹ️';
  }

  hideNotification(notification) {
    notification.style.transform = 'translateX(100%)';
    notification.style.opacity = '0';
    
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }

  success(title, message, duration = 5000) {
    return this.showNotification({ title, message, type: 'success', duration });
  }

  error(title, message, duration = 7000) {
    return this.showNotification({ title, message, type: 'error', duration });
  }

  warning(title, message, duration = 6000) {
    return this.showNotification({ title, message, type: 'warning', duration });
  }

  info(title, message, duration = 5000) {
    return this.showNotification({ title, message, type: 'info', duration });
  }

  clearAll() {
    const notifications = this.notificationContainer.querySelectorAll('.alert');
    notifications.forEach(notification => {
      this.hideNotification(notification);
    });
  }
}

// Экспортируем singleton instance
const notificationService = new NotificationService();
export default notificationService;