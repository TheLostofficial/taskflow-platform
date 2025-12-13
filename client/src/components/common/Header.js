import React, { useState, useEffect } from 'react';
import { Navbar, Nav, Container, Button, Dropdown, Badge, Image } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../../store/slices/authSlice';
import { getCurrentUser } from '../../store/slices/authSlice';

const Header = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useSelector(state => state.auth);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    if (isAuthenticated && !user) {
      dispatch(getCurrentUser());
    }
  }, [isAuthenticated, user, dispatch]);

  const handleLogout = () => {
    dispatch(logout());
    setShowDropdown(false);
    navigate('/login');
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
        return `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}${user.avatar}`;
      }
    }
    return null;
  };

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
            
            {isAuthenticated && (
              <>
                <Nav.Link as={Link} to="/dashboard">📊 Дашборд</Nav.Link>
                <Nav.Link as={Link} to="/projects">📁 Проекты</Nav.Link>
              </>
            )}
          </Nav>
          
          <Nav className="align-items-center">
            {isAuthenticated ? (
              <div className="d-flex align-items-center">
                {/* Уведомления - отдельная страница */}
                <Button 
                  variant="outline-light" 
                  size="sm" 
                  className="me-3 position-relative"
                  as={Link}
                  to="/notifications"
                  title="Уведомления"
                >
                  🔔
                  <Badge 
                    bg="danger" 
                    pill 
                    className="position-absolute top-0 start-100 translate-middle"
                    style={{ fontSize: '0.6rem' }}
                  >
                    0
                  </Badge>
                </Button>
                
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
                          e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    
                    <div 
                      className="rounded-circle bg-primary d-flex align-items-center justify-content-center me-2"
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
                    
                    {/* Мой профиль - отдельная страница */}
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
                    
                    {/* Настройки - отдельная страница */}
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
                    
                    <Dropdown.Divider />
                    
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
            ) : (
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
            )}
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
};

export default Header;
