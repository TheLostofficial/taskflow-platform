import React, { useState, useEffect, useRef } from 'react';
import { Navbar, Nav, Container, Button, Dropdown, Badge, Image } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logout, getCurrentUser } from '../../store/slices/authSlice';
import { websocketService } from '../../services/websocket';

const Header = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useSelector(state => state.auth || {});
  const [showDropdown, setShowDropdown] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [socketStatus, setSocketStatus] = useState('disconnected');

  useEffect(() => {
    if (isAuthenticated && !user) {
      dispatch(getCurrentUser());
    }
  }, [isAuthenticated, user, dispatch]);

  // WebSocket подписки для real-time обновлений
  useEffect(() => {
    if (!isAuthenticated || !user) return;

    // Подписываемся на WebSocket события
    const handleTaskCreated = (data) => {
      console.log('New task created:', data);
      if (data.userId !== user._id) {
        setNotificationCount(prev => prev + 1);
      }
    };

    const handleCommentAdded = (data) => {
      console.log('New comment added:', data);
      setNotificationCount(prev => prev + 1);
    };

    const handleUserMentioned = (data) => {
      console.log('You were mentioned:', data);
      if (data.userId === user._id) {
        setNotificationCount(prev => prev + 2); // Упоминание важнее
      }
    };

    const handleProjectUpdated = (data) => {
      console.log('Project updated:', data);
      setNotificationCount(prev => prev + 1);
    };

    websocketService.on('taskCreated', handleTaskCreated);
    websocketService.on('commentAdded', handleCommentAdded);
    websocketService.on('userMentioned', handleUserMentioned);
    websocketService.on('projectUpdated', handleProjectUpdated);

    // Мониторинг состояния подключения
    const interval = setInterval(() => {
      setSocketStatus(websocketService.isConnected() ? 'connected' : 'disconnected');
    }, 5000);

    return () => {
      websocketService.off('taskCreated', handleTaskCreated);
      websocketService.off('commentAdded', handleCommentAdded);
      websocketService.off('userMentioned', handleUserMentioned);
      websocketService.off('projectUpdated', handleProjectUpdated);
      clearInterval(interval);
    };
  }, [isAuthenticated, user]);

  const handleLogout = () => {
    dispatch(logout());
    setShowDropdown(false);
    navigate('/login');
  };

  const clearNotifications = () => {
    setNotificationCount(0);
    setUnreadMessages(0);
  };

  const getUserInitials = () => {
    if (!user?.name) return 'U';
    return user.name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getAvatarUrl = () => {
    if (user?.avatar && user.avatar !== 'default-avatar.png') {
      if (user.avatar.startsWith('http')) {
        return user.avatar;
      } else {
        return `/uploads/avatars/${user.avatar}`;
      }
    }
    return null;
  };

  const totalNotifications = notificationCount + unreadMessages;

  // Если пользователь не авторизован
  if (!isAuthenticated) {
    return (
      <Navbar bg="dark" variant="dark" expand="lg" className="shadow-sm" sticky="top">
        <Container fluid="lg">
          <Navbar.Brand as={Link} to="/" className="fw-bold d-flex align-items-center">
            <span className="me-2">🚀</span>
            <span className="text-white">TaskFlow</span>
          </Navbar.Brand>
          
          <Navbar.Toggle aria-controls="basic-navbar-nav" />
          <Navbar.Collapse id="basic-navbar-nav">
            <Nav className="me-auto">
              <Nav.Link as={Link} to="/">Главная</Nav.Link>
            </Nav>
            
            <Nav className="align-items-center">
              <div className="d-flex gap-2">
                <Button 
                  variant="outline-light" 
                  as={Link} 
                  to="/login"
                  size="sm"
                  className="px-3"
                >
                  🔑 Войти
                </Button>
                <Button 
                  variant="primary" 
                  as={Link} 
                  to="/register"
                  size="sm"
                  className="px-3"
                >
                  📝 Регистрация
                </Button>
              </div>
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>
    );
  }

  // Если пользователь авторизован
  return (
    <Navbar bg="dark" variant="dark" expand="lg" className="shadow-sm" sticky="top">
      <Container fluid="lg">
        <Navbar.Brand as={Link} to="/dashboard" className="fw-bold d-flex align-items-center">
          <span className="me-2">🚀</span>
          <span className="text-white">TaskFlow</span>
          <Badge 
            bg={socketStatus === 'connected' ? 'success' : 'danger'} 
            className="ms-2" 
            title={socketStatus === 'connected' ? 'WebSocket подключен' : 'WebSocket отключен'}
            style={{ fontSize: '0.5rem', padding: '2px 4px' }}
          >
            ●
          </Badge>
        </Navbar.Brand>
        
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="me-auto">
            <Nav.Link as={Link} to="/dashboard">📊 Дашборд</Nav.Link>
            <Nav.Link as={Link} to="/projects">📁 Проекты</Nav.Link>
          </Nav>
          
          <Nav className="align-items-center">
            <div className="d-flex align-items-center">
              {/* Уведомления с WebSocket */}
              <Dropdown 
                align="end" 
                className="me-3"
                onToggle={() => clearNotifications()}
              >
                <Dropdown.Toggle 
                  variant="dark" 
                  id="dropdown-notifications" 
                  className="position-relative border-0 bg-transparent"
                  title="Уведомления"
                >
                  🔔
                  {totalNotifications > 0 && (
                    <Badge 
                      bg="danger" 
                      pill 
                      className="position-absolute top-0 start-100 translate-middle"
                      style={{ fontSize: '0.6rem' }}
                    >
                      {totalNotifications > 9 ? '9+' : totalNotifications}
                    </Badge>
                  )}
                </Dropdown.Toggle>
                
                <Dropdown.Menu className="shadow border-0 mt-2" style={{ width: '320px' }}>
                  <Dropdown.Header className="text-center bg-light">
                    <div className="d-flex justify-content-between align-items-center">
                      <span className="fw-bold">Уведомления</span>
                      {totalNotifications > 0 && (
                        <Button 
                          variant="link" 
                          size="sm" 
                          className="p-0 text-decoration-none"
                          onClick={clearNotifications}
                        >
                          Очистить все
                        </Button>
                      )}
                    </div>
                  </Dropdown.Header>
                  
                  {totalNotifications === 0 ? (
                    <Dropdown.ItemText className="text-center text-muted py-3">
                      Нет новых уведомлений
                    </Dropdown.ItemText>
                  ) : (
                    <>
                      {notificationCount > 0 && (
                        <Dropdown.Item as={Link} to="/notifications" className="d-flex align-items-center py-2">
                          <span className="me-3 text-primary">📝</span>
                          <div>
                            <div>Новые уведомления</div>
                            <small className="text-muted">
                              У вас {notificationCount} новых {notificationCount === 1 ? 'уведомление' : 
                              notificationCount < 5 ? 'уведомления' : 'уведомлений'}
                            </small>
                          </div>
                        </Dropdown.Item>
                      )}
                      
                      {unreadMessages > 0 && (
                        <Dropdown.Item as={Link} to="/notifications" className="d-flex align-items-center py-2">
                          <span className="me-3 text-success">💬</span>
                          <div>
                            <div>Новые сообщения</div>
                            <small className="text-muted">
                              У вас {unreadMessages} новых {unreadMessages === 1 ? 'сообщение' : 
                              unreadMessages < 5 ? 'сообщения' : 'сообщений'}
                            </small>
                          </div>
                        </Dropdown.Item>
                      )}
                    </>
                  )}
                  
                  <Dropdown.Divider />
                  <Dropdown.Item as={Link} to="/notifications" className="text-center">
                    Перейти ко всем уведомлениям
                  </Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown>
              
              {/* Выпадающее меню профиля */}
              <Dropdown 
                align="end" 
                show={showDropdown}
                onToggle={(isOpen) => setShowDropdown(isOpen)}
              >
                <Dropdown.Toggle 
                  variant="dark" 
                  id="user-dropdown"
                  className="d-flex align-items-center border-0 bg-transparent"
                >
                  {getAvatarUrl() ? (
                    <Image 
                      src={getAvatarUrl()} 
                      roundedCircle 
                      width="36" 
                      height="36"
                      className="me-2 border border-light"
                      alt={user?.name}
                      onError={(e) => {
                        e.target.style.display = 'none';
                        const initialsDiv = e.target.parentElement.querySelector('.initials-avatar');
                        if (initialsDiv) initialsDiv.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  
                  <div 
                    className="rounded-circle bg-primary d-flex align-items-center justify-content-center me-2 initials-avatar"
                    style={{ 
                      width: '36px', 
                      height: '36px',
                      display: getAvatarUrl() ? 'none' : 'flex'
                    }}
                  >
                    <span className="text-white fw-bold small">{getUserInitials()}</span>
                  </div>
                  
                  <span className="text-light me-2">{user?.name || 'Пользователь'}</span>
                  <span className="text-light">▼</span>
                </Dropdown.Toggle>
                
                <Dropdown.Menu className="shadow border-0 mt-2">
                  <Dropdown.Header className="text-center bg-light">
                    <div className="fw-bold">{user?.name}</div>
                    <small className="text-muted">{user?.email}</small>
                  </Dropdown.Header>
                  <Dropdown.Divider />
                  
                  {/* Мой профиль */}
                  <Dropdown.Item 
                    as={Link} 
                    to="/profile" 
                    onClick={() => setShowDropdown(false)}
                    className="d-flex align-items-center py-2"
                  >
                    <span className="me-3">👤</span>
                    <div>
                      <div>Мой профиль</div>
                      <small className="text-muted">Основная информация</small>
                    </div>
                  </Dropdown.Item>
                  
                  {/* Настройки */}
                  <Dropdown.Item 
                    as={Link} 
                    to="/settings" 
                    onClick={() => setShowDropdown(false)}
                    className="d-flex align-items-center py-2"
                  >
                    <span className="me-3">⚙️</span>
                    <div>
                      <div>Настройки безопасности</div>
                      <small className="text-muted">Смена пароля и безопасность</small>
                    </div>
                  </Dropdown.Item>
                  
                  {/* Уведомления */}
                  <Dropdown.Item 
                    as={Link} 
                    to="/notifications" 
                    onClick={() => setShowDropdown(false)}
                    className="d-flex align-items-center py-2"
                  >
                    <span className="me-3">🔔</span>
                    <div>
                      <div>Уведомления</div>
                      <small className="text-muted">
                        {totalNotifications > 0 ? `${totalNotifications} новых` : 'Настройки уведомлений'}
                      </small>
                    </div>
                  </Dropdown.Item>
                  
                  <Dropdown.Divider />
                  
                  {/* Помощь */}
                  <Dropdown.Item 
                    as={Link} 
                    to="/help" 
                    onClick={() => setShowDropdown(false)}
                    className="d-flex align-items-center py-2"
                  >
                    <span className="me-3">❓</span>
                    <div>
                      <div>Помощь</div>
                      <small className="text-muted">FAQ и поддержка</small>
                    </div>
                  </Dropdown.Item>
                  
                  <Dropdown.Divider />
                  
                  {/* Выйти */}
                  <Dropdown.Item 
                    onClick={handleLogout}
                    className="d-flex align-items-center py-2 text-danger"
                  >
                    <span className="me-3">🚪</span>
                    <div>
                      <div>Выйти</div>
                      <small className="text-muted">Завершить сеанс</small>
                    </div>
                  </Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown>
            </div>
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
};

export default Header;
