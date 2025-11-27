// client/src/components/common/Header.js
import React from 'react';
import { Navbar, Nav, Container, Button, Dropdown } from 'react-bootstrap';
import { LinkContainer } from 'react-router-bootstrap';
import { useSelector, useDispatch } from 'react-redux';
import { logout } from '../../store/slices/authSlice';
import { useNavigate } from 'react-router-dom';

const Header = () => {
  const { isAuthenticated, user } = useSelector(state => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleLogout = () => {
    dispatch(logout());
    navigate('/');
  };

  return (
    <Navbar bg="dark" variant="dark" expand="lg" className="shadow">
      <Container>
        <Navbar.Brand href="/" className="fw-bold">
          🚀 TaskFlow
        </Navbar.Brand>
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="me-auto">
            <LinkContainer to="/">
              <Nav.Link>Главная</Nav.Link>
            </LinkContainer>
            {isAuthenticated && (
              <LinkContainer to="/projects">
                <Nav.Link>Проекты</Nav.Link>
              </LinkContainer>
            )}
          </Nav>
          <Nav>
            {isAuthenticated ? (
              <Dropdown align="end">
                <Dropdown.Toggle 
                  variant="outline-light" 
                  id="dropdown-basic"
                  className="d-flex align-items-center"
                >
                  👤 {user?.name || 'Пользователь'}
                </Dropdown.Toggle>
                <Dropdown.Menu>
                  <Dropdown.Item onClick={() => navigate('/dashboard')}>
                    📊 Панель управления
                  </Dropdown.Item>
                  <Dropdown.Item onClick={() => navigate('/profile')}>
                    ⚙️ Настройки профиля
                  </Dropdown.Item>
                  <Dropdown.Divider />
                  <Dropdown.Item onClick={handleLogout} className="text-danger">
                    🚪 Выйти
                  </Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown>
            ) : (
              <>
                <LinkContainer to="/login">
                  <Nav.Link>
                    <Button variant="outline-light" size="sm" className="me-2">
                      Вход
                    </Button>
                  </Nav.Link>
                </LinkContainer>
                <LinkContainer to="/register">
                  <Nav.Link>
                    <Button variant="primary" size="sm">
                      Регистрация
                    </Button>
                  </Nav.Link>
                </LinkContainer>
              </>
            )}
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
};

export default Header;
