import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Navbar, Nav, Container, Dropdown, Badge, Button } from 'react-bootstrap';
import { useSelector, useDispatch } from 'react-redux';
import { logout } from '../../store/slices/authSlice';
import { clearTasks } from '../../store/slices/tasksSlice';
import websocketService from '../../services/websocket';

const Header = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [socketStatus, setSocketStatus] = useState('disconnected');
  
  const { user } = useSelector(state => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // Инициализация WebSocket и подписка на уведомления
  useEffect(() => {
    if (!user) return;

    // Загружаем существующие уведомления из localStorage
    loadNotifications();

    // Подписываемся на события WebSocket
    websocketService.on('connect', () => {
      console.log('✅ Header: WebSocket подключен');
      setSocketStatus('connected');
    });

    websocketService.on('disconnect', () => {
      console.log('❌ Header: WebSocket отключен');
      setSocketStatus('disconnected');
    });

    websocketService.on('connect_error', () => {
      setSocketStatus('disconnected');
    });

    // Подписываемся на уведомления
    websocketService.on('userMentioned', (data) => {
      console.log('📢 Header: Получено уведомление об упоминании:', data);
      addNotification({
        id: Date.now(),
        title: 'Вас упомянули',
        message: `Вас упомянули в комментарии к задаче "${data.taskTitle}"`,
        type: 'mention',
        timestamp: new Date().toISOString(),
        read: false,
        link: `/projects/${data.projectId}/tasks/${data.taskId}`
      });
    });

    websocketService.on('taskAssigned', (data) => {
      console.log('📢 Header: Получено уведомление о назначении:', data);
      addNotification({
        id: Date.now(),
        title: 'Новая задача',
        message: 'Вам назначена новая задача',
        type: 'assignment',
        timestamp: new Date().toISOString(),
        read: false,
        link: `/projects/${data.projectId}/tasks/${data.taskId}`
      });
    });

    websocketService.on('commentAdded', (data) => {
      console.log('📢 Header: Получено уведомление о комментарии:', data);
      // Добавляем уведомление только если это не наш комментарий
      if (data.commentedBy !== user._id) {
        addNotification({
          id: Date.now(),
          title: 'Новый комментарий',
          message: `Новый комментарий к задаче`,
          type: 'comment',
          timestamp: new Date().toISOString(),
          read: false,
          link: `/projects/${data.projectId}/tasks/${data.taskId}`
        });
      }
    });

    // Подключаем WebSocket если еще не подключен
    if (!websocketService.isConnected) {
      setSocketStatus('connecting');
    }

    return () => {
      // Отписываемся от событий
      websocketService.off('userMentioned');
      websocketService.off('taskAssigned');
      websocketService.off('commentAdded');
      websocketService.off('connect');
      websocketService.off('disconnect');
      websocketService.off('connect_error');
    };
  }, [user]);

  const loadNotifications = () => {
    try {
      const savedNotifications = localStorage.getItem('notifications');
      if (savedNotifications) {
        const parsed = JSON.parse(savedNotifications);
        setNotifications(parsed);
        setUnreadCount(parsed.filter(n => !n.read).length);
      }
    } catch (error) {
      console.error('Ошибка загрузки уведомлений:', error);
    }
  };

  const addNotification = (notification) => {
    const updatedNotifications = [notification, ...notifications.slice(0, 19)];
    setNotifications(updatedNotifications);
    setUnreadCount(prev => prev + 1);
    localStorage.setItem('notifications', JSON.stringify(updatedNotifications));
  };

  const markAsRead = (id) => {
    const updatedNotifications = notifications.map(notification =>
      notification.id === id ? { ...notification, read: true } : notification
    );
    setNotifications(updatedNotifications);
    setUnreadCount(updatedNotifications.filter(n => !n.read).length);
    localStorage.setItem('notifications', JSON.stringify(updatedNotifications));
  };

  const markAllAsRead = () => {
    const updatedNotifications = notifications.map(notification => ({
      ...notification,
      read: true
    }));
    setNotifications(updatedNotifications);
    setUnreadCount(0);
    localStorage.setItem('notifications', JSON.stringify(updatedNotifications));
  };

  const clearNotifications = () => {
    setNotifications([]);
    setUnreadCount(0);
    localStorage.removeItem('notifications');
  };

  const handleLogout = () => {
    // Отключаем WebSocket перед выходом
    websocketService.disconnect();
    
    dispatch(logout());
    dispatch(clearTasks());
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const getSocketStatusBadge = () => {
    switch (socketStatus) {
      case 'connected':
        return <Badge bg="success" className="ms-2">🟢 Онлайн</Badge>;
      case 'connecting':
        return <Badge bg="warning" className="ms-2">🟡 Подключение...</Badge>;
      case 'disconnected':
        return <Badge bg="danger" className="ms-2">🔴 Офлайн</Badge>;
      default:
        return <Badge bg="secondary" className="ms-2">⚪ Неизвестно</Badge>;
    }
  };

  const formatNotificationTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'только что';
    if (diffMins < 60) return `${diffMins} мин. назад`;
    if (diffHours < 24) return `${diffHours} ч. назад`;
    if (diffDays < 7) return `${diffDays} дн. назад`;
    
    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short'
    });
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'mention': return '@';
      case 'assignment': return '📋';
      case 'comment': return '💬';
      case 'task': return '📝';
      case 'project': return '📂';
      default: return '🔔';
    }
  };

  if (!user) return null;

  return (
    <Navbar bg="dark" variant="dark" expand="lg" className="header">
      <Container>
        <Navbar.Brand as={Link} to="/dashboard" className="fw-bold">
          🚀 TaskFlow
        </Navbar.Brand>
        
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="me-auto">
            <Nav.Link as={Link} to="/dashboard">Дашборд</Nav.Link>
            <Nav.Link as={Link} to="/projects">Проекты</Nav.Link>
            <Nav.Link as={Link} to="/notifications">
              Уведомления {unreadCount > 0 && (
                <Badge bg="danger" pill className="ms-1">{unreadCount}</Badge>
              )}
            </Nav.Link>
          </Nav>
          
          <Nav className="align-items-center">
            {/* Статус WebSocket */}
            <div className="text-light me-3 d-flex align-items-center">
              {getSocketStatusBadge()}
            </div>
            
            {/* Уведомления */}
            <Dropdown align="end" className="me-3">
              <Dropdown.Toggle variant="outline-light" id="dropdown-notifications" className="position-relative">
                <i className="bi bi-bell"></i>
                {unreadCount > 0 && (
                  <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
                    {unreadCount}
                  </span>
                )}
              </Dropdown.Toggle>
              
              <Dropdown.Menu style={{ width: '350px', maxHeight: '400px', overflowY: 'auto' }}>
                <div className="p-2 border-bottom">
                  <div className="d-flex justify-content-between align-items-center">
                    <h6 className="mb-0">Уведомления</h6>
                    <div>
                      {notifications.length > 0 && (
                        <>
                          <Button 
                            variant="link" 
                            size="sm" 
                            onClick={markAllAsRead}
                            className="text-decoration-none p-0"
                          >
                            Прочитать все
                          </Button>
                          <Button 
                            variant="link" 
                            size="sm" 
                            onClick={clearNotifications}
                            className="text-decoration-none p-0 ms-2"
                          >
                            Очистить
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                
                {notifications.length === 0 ? (
                  <div className="p-3 text-center text-muted">
                    <i className="bi bi-bell-slash fs-4"></i>
                    <p className="mt-2 mb-0">Нет уведомлений</p>
                  </div>
                ) : (
                  notifications.map(notification => (
                    <Dropdown.Item 
                      key={notification.id} 
                      className={`p-3 ${!notification.read ? 'bg-light' : ''}`}
                      onClick={() => {
                        markAsRead(notification.id);
                        if (notification.link) {
                          navigate(notification.link);
                        }
                      }}
                    >
                      <div className="d-flex align-items-start">
                        <div className="me-2" style={{ fontSize: '20px' }}>
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-grow-1">
                          <div className="fw-medium">{notification.title}</div>
                          <small className="text-muted">{notification.message}</small>
                          <div className="text-muted small mt-1">
                            {formatNotificationTime(notification.timestamp)}
                          </div>
                        </div>
                        {!notification.read && (
                          <span className="badge bg-primary rounded-pill ms-2">Новое</span>
                        )}
                      </div>
                    </Dropdown.Item>
                  ))
                )}
              </Dropdown.Menu>
            </Dropdown>
            
            {/* Профиль пользователя */}
            <Dropdown align="end">
              <Dropdown.Toggle variant="outline-light" id="dropdown-profile">
                <div className="d-flex align-items-center">
                  {user.avatar ? (
                    <img 
                      src={`/uploads/avatars/${user.avatar}`}
                      alt={user.name}
                      className="rounded-circle me-2"
                      style={{ width: '32px', height: '32px' }}
                    />
                  ) : (
                    <div 
                      className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center me-2"
                      style={{ width: '32px', height: '32px', fontSize: '14px' }}
                    >
                      {user.name?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                  )}
                  <span>{user.name || user.email}</span>
                </div>
              </Dropdown.Toggle>
              
              <Dropdown.Menu>
                <Dropdown.Item as={Link} to="/profile">
                  <i className="bi bi-person me-2"></i>Профиль
                </Dropdown.Item>
                <Dropdown.Item as={Link} to="/settings">
                  <i className="bi bi-gear me-2"></i>Настройки
                </Dropdown.Item>
                <Dropdown.Item as={Link} to="/help">
                  <i className="bi bi-question-circle me-2"></i>Помощь
                </Dropdown.Item>
                <Dropdown.Divider />
                <Dropdown.Item onClick={handleLogout}>
                  <i className="bi bi-box-arrow-right me-2"></i>Выйти
                </Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown>
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
};

export default Header;
