import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, Spinner } from 'react-bootstrap';
import { useDispatch, useSelector } from 'react-redux';
import { getCurrentUser, updateUserProfile } from '../store/slices/authSlice';

const ProfilePage = () => {
  const dispatch = useDispatch();
  const { user, profileLoading, error } = useSelector(state => state.auth);
  
  const [formData, setFormData] = useState({
    name: '',
    bio: '',
    skills: ''
  });
  const [success, setSuccess] = useState('');
  const [localError, setLocalError] = useState('');

  useEffect(() => {
    if (!user) {
      dispatch(getCurrentUser());
    } else {
      setFormData({
        name: user.name || '',
        bio: user.bio || '',
        skills: Array.isArray(user.skills) ? user.skills.join(', ') : ''
      });
    }
  }, [user, dispatch]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');
    setSuccess('');

    if (!formData.name.trim()) {
      setLocalError('Имя обязательно для заполнения');
      return;
    }

    try {
      const skillsArray = formData.skills.split(',').map(skill => skill.trim()).filter(skill => skill);
      
      await dispatch(updateUserProfile({
        name: formData.name,
        bio: formData.bio,
        skills: skillsArray
      })).unwrap();

      setSuccess('Профиль успешно обновлен!');
    } catch (error) {
      setLocalError(error.message || 'Ошибка при обновлении профиля');
    }
  };

  if (!user && profileLoading) {
    return (
      <Container className="text-center py-5">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Загрузка профиля...</span>
        </Spinner>
      </Container>
    );
  }

  return (
    <Container>
      <Row className="justify-content-center">
        <Col md={8} lg={6}>
          <Card className="shadow">
            <Card.Header className="bg-primary text-white">
              <h4 className="mb-0">Мой профиль</h4>
            </Card.Header>
            <Card.Body className="p-4">
              {(error || localError) && (
                <Alert variant="danger">
                  {error || localError}
                </Alert>
              )}
              
              {success && (
                <Alert variant="success">
                  {success}
                </Alert>
              )}

              <Form onSubmit={handleSubmit}>
                <Form.Group className="mb-3">
                  <Form.Label>Email</Form.Label>
                  <Form.Control
                    type="email"
                    value={user?.email || ''}
                    disabled
                    className="bg-light"
                  />
                  <Form.Text className="text-muted">
                    Email нельзя изменить
                  </Form.Text>
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Имя *</Form.Label>
                  <Form.Control
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Введите ваше имя"
                    required
                  />
                </Form.Group>

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

                <Form.Group className="mb-4">
                  <Form.Label>Навыки (через запятую)</Form.Label>
                  <Form.Control
                    type="text"
                    name="skills"
                    value={formData.skills}
                    onChange={handleChange}
                    placeholder="JavaScript, React, Node.js..."
                  />
                </Form.Group>

                <div className="d-grid">
                  <Button 
                    variant="primary" 
                    type="submit" 
                    size="lg"
                    disabled={profileLoading}
                  >
                    {profileLoading ? (
                      <>
                        <Spinner animation="border" size="sm" className="me-2" />
                        Сохранение...
                      </>
                    ) : (
                      'Сохранить изменения'
                    )}
                  </Button>
                </div>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default ProfilePage;
