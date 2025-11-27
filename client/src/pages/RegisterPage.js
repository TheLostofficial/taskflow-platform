import React, { useState } from 'react';
import { Form, Button, Card, Container, Row, Col, Alert } from 'react-bootstrap';
import { LinkContainer } from 'react-router-bootstrap';
import { useDispatch, useSelector } from 'react-redux';
import { registerUser } from '../store/slices/authSlice';
import { useNavigate } from 'react-router-dom';

const RegisterPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
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
  
  if (formData.password !== formData.confirmPassword) {
    alert('Пароли не совпадают');
    return;
  }

  try {
    const result = await dispatch(registerUser({
      name: formData.name,
      email: formData.email,
      password: formData.password
    })).unwrap();
    
    if (result) {
      navigate('/dashboard');
    }
  } catch (error) {
    console.error('Registration failed:', error);
  }
};

  return (
    <Container>
      <Row className="justify-content-center">
        <Col md={6} lg={4}>
          <Card className="shadow">
            <Card.Body>
              <div className="text-center mb-4">
                <h2>Регистрация</h2>
                <p className="text-muted">Создайте новый аккаунт</p>
              </div>

              {error && <Alert variant="danger">{error}</Alert>}

              <Form onSubmit={handleSubmit}>
                <Form.Group className="mb-3">
                  <Form.Label>Имя</Form.Label>
                  <Form.Control
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    placeholder="Введите ваше имя"
                  />
                </Form.Group>

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
                    placeholder="Введите пароль"
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Подтверждение пароля</Form.Label>
                  <Form.Control
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                    placeholder="Повторите пароль"
                  />
                </Form.Group>

                <Button 
                  variant="primary" 
                  type="submit" 
                  className="w-100" 
                  disabled={loading}
                >
                  {loading ? 'Регистрация...' : 'Зарегистрироваться'}
                </Button>
              </Form>

              <div className="text-center mt-3">
                <p>
                  Уже есть аккаунт?{' '}
                  <LinkContainer to="/login">
                    <a href="/login" className="text-decoration-none">Войти</a>
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

export default RegisterPage;
