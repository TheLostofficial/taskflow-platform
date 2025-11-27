import React, { useState } from 'react';
import { Form, Button, Card, Container, Row, Col, Alert } from 'react-bootstrap';
import { LinkContainer } from 'react-router-bootstrap';
import { useDispatch, useSelector } from 'react-redux';
import { loginUser } from '../store/slices/authSlice';
import { useNavigate } from 'react-router-dom';

const LoginPage = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error } = useSelector(state => state.auth);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
  e.preventDefault();
  
  try {
    const result = await dispatch(loginUser(formData)).unwrap();
    if (result) {
      navigate('/dashboard');
    }
  } catch (error) {
    console.error('Login failed:', error);
  }
};

  return (
    <Container>
      <Row className="justify-content-center">
        <Col md={6} lg={4}>
          <Card className="shadow">
            <Card.Body>
              <div className="text-center mb-4">
                <h2>Вход в систему</h2>
                <p className="text-muted">Введите ваши учетные данные</p>
              </div>

              {error && <Alert variant="danger">{error}</Alert>}

              <Form onSubmit={handleSubmit}>
                <Form.Group className="mb-3">
                  <Form.Label>Email</Form.Label>
                  <Form.Control
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    placeholder="Введите ваш email"
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Пароль</Form.Label>
                  <Form.Control
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    placeholder="Введите ваш пароль"
                  />
                </Form.Group>

                <Button 
                  variant="primary" 
                  type="submit" 
                  className="w-100" 
                  disabled={loading}
                >
                  {loading ? 'Вход...' : 'Войти'}
                </Button>
              </Form>

              <div className="text-center mt-3">
                <p>
                  Нет аккаунта?{' '}
                  <LinkContainer to="/register">
                    <a href="/register" className="text-decoration-none">Зарегистрироваться</a>
                  </LinkContainer>
                </p>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default LoginPage;
