// client/src/pages/ProfilePage.js
import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert } from 'react-bootstrap';
import { useSelector } from 'react-redux';

const ProfilePage = () => {
  const { user } = useSelector(state => state.auth);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    bio: ''
  });
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        bio: user.bio || ''
      });
    }
  }, [user]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Здесь будет обновление профиля
    setMessage('Профиль обновлен!');
  };

  if (!user) {
    return <div>Загрузка...</div>;
  }

  return (
    <Container>
      <Row className="justify-content-center">
        <Col md={8}>
          <Card className="shadow">
            <Card.Body>
              <h2 className="text-center mb-4">Настройки профиля</h2>
              
              {message && <Alert variant="success">{message}</Alert>}

              <Form onSubmit={handleSubmit}>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Имя</Form.Label>
                      <Form.Control
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        required
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Email</Form.Label>
                      <Form.Control
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        disabled
                      />
                      <Form.Text className="text-muted">
                        Email нельзя изменить
                      </Form.Text>
                    </Form.Group>
                  </Col>
                </Row>

                <Form.Group className="mb-3">
                  <Form.Label>О себе</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    name="bio"
                    value={formData.bio}
                    onChange={handleChange}
                    placeholder="Расскажите о себе..."
                  />
                </Form.Group>

                <div className="text-center">
                  <Button variant="primary" type="submit" size="lg">
                    Сохранить изменения
                  </Button>
                </div>
              </Form>

              <hr className="my-4" />

              <div className="text-center">
                <h5>Статистика аккаунта</h5>
                <p className="text-muted">
                  Зарегистрирован: {new Date().toLocaleDateString('ru-RU')}
                </p>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default ProfilePage;
