import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, Spinner, Image } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { getCurrentUser, updateUserProfile, uploadAvatar } from '../store/slices/authSlice'; // ИСПРАВЛЕН ИМПОРТ

const ProfilePage = () => {
  const dispatch = useDispatch();
  const { user, profileLoading, error, success } = useSelector(state => state.auth);
  
  const [formData, setFormData] = useState({
    name: '',
    bio: '',
    skills: ''
  });
  const [localError, setLocalError] = useState('');
  const [localSuccess, setLocalSuccess] = useState('');
  const [avatarLoading, setAvatarLoading] = useState(false);

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
    setLocalSuccess('');

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

      setLocalSuccess('Профиль успешно обновлен!');
      setTimeout(() => setLocalSuccess(''), 3000);
    } catch (error) {
      setLocalError(error.message || 'Ошибка при обновлении профиля');
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setLocalError('Пожалуйста, выберите изображение');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setLocalError('Размер файла не должен превышать 5MB');
      return;
    }

    setAvatarLoading(true);
    try {
      await dispatch(uploadAvatar(file)).unwrap();
      setLocalSuccess('Аватар успешно обновлен!');
      setTimeout(() => setLocalSuccess(''), 3000);
    } catch (error) {
      setLocalError(error.message || 'Ошибка загрузки аватара');
    } finally {
      setAvatarLoading(false);
    }
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

  const getUserInitials = () => {
    if (!user?.name) return 'U';
    return user.name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
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
    <Container className="py-4">
      <Row className="justify-content-center">
        <Col md={10} lg={8}>
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h3>Мой профиль</h3>
            <div className="d-flex gap-2">
              <Button as={Link} to="/settings" variant="outline-primary" size="sm">
                ⚙️ Настройки безопасности
              </Button>
              <Button as={Link} to="/notifications" variant="outline-primary" size="sm">
                🔔 Настройки уведомлений
              </Button>
            </div>
          </div>

          {(error || localError) && (
            <Alert variant="danger" onClose={() => { setLocalError(''); }} dismissible className="mb-4">
              {error || localError}
            </Alert>
          )}
          
          {(success || localSuccess) && (
            <Alert variant="success" onClose={() => setLocalSuccess('')} dismissible className="mb-4">
              {success || localSuccess}
            </Alert>
          )}

          <Row>
            <Col md={4} className="mb-4">
              <Card className="shadow h-100">
                <Card.Body className="text-center">
                  <div className="mb-3 position-relative">
                    {getAvatarUrl() ? (
                      <Image 
                        src={getAvatarUrl()} 
                        roundedCircle 
                        width="150" 
                        height="150"
                        className="border border-3 border-primary"
                        alt={user?.name}
                        style={{ objectFit: 'cover' }}
                      />
                    ) : (
                      <div 
                        className="rounded-circle bg-primary d-flex align-items-center justify-content-center mx-auto"
                        style={{ width: '150px', height: '150px' }}
                      >
                        <span className="text-white fw-bold display-6">{getUserInitials()}</span>
                      </div>
                    )}
                    
                    <label htmlFor="avatar-upload" className="position-absolute bottom-0 end-0 btn btn-primary btn-sm rounded-circle" style={{ cursor: 'pointer' }}>
                      <i className="bi bi-camera"></i>
                      <input 
                        id="avatar-upload" 
                        type="file" 
                        accept="image/*" 
                        onChange={handleAvatarUpload}
                        style={{ display: 'none' }}
                        disabled={avatarLoading}
                      />
                    </label>
                  </div>
                  
                  {avatarLoading && (
                    <div className="mb-3">
                      <Spinner animation="border" size="sm" className="me-2" />
                      <small>Загрузка аватара...</small>
                    </div>
                  )}
                  
                  <h5 className="mt-3">{user?.name}</h5>
                  <p className="text-muted">{user?.email}</p>
                  
                  {user?.bio && (
                    <div className="mt-3 text-start">
                      <h6>О себе:</h6>
                      <p className="text-muted">{user.bio}</p>
                    </div>
                  )}
                  
                  {user?.skills && user.skills.length > 0 && (
                    <div className="mt-3 text-start">
                      <h6>Навыки:</h6>
                      <div className="d-flex flex-wrap gap-2">
                        {Array.isArray(user.skills) ? (
                          user.skills.map((skill, index) => (
                            <span key={index} className="badge bg-secondary">{skill}</span>
                          ))
                        ) : (
                          <span className="badge bg-secondary">{user.skills}</span>
                        )}
                      </div>
                    </div>
                  )}
                </Card.Body>
              </Card>
            </Col>
            
            <Col md={8}>
              <Card className="shadow">
                <Card.Body className="p-4">
                  <h5 className="mb-4">Редактирование профиля</h5>
                  
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
                      <Form.Text className="text-muted">
                        Перечислите ваши навыки через запятую
                      </Form.Text>
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
        </Col>
      </Row>
    </Container>
  );
};

export default ProfilePage;
