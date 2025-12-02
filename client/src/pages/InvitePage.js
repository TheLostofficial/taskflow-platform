import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Container, Row, Col, Card, Button, Alert, Spinner, Badge } from 'react-bootstrap';
import { useDispatch, useSelector } from 'react-redux';
import { inviteService } from '../services/inviteService';

const InvitePage = () => {
  const { code } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { isAuthenticated, user } = useSelector(state => state.auth);
  
  const [inviteInfo, setInviteInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchInviteInfo();
  }, [code]);

  const fetchInviteInfo = async () => {
    try {
      setLoading(true);
      const endpoint = isAuthenticated 
        ? `/api/invites/${code}`
        : `/api/public-invites/${code}`;
      
      const response = await fetch(`http://localhost:5000${endpoint}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Ошибка загрузки инвайта');
      }
      
      const data = await response.json();
      setInviteInfo(data);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptInvite = async () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: `/invite/${code}` } });
      return;
    }

    try {
      setAccepting(true);
      setError('');
      
      const response = await fetch(`http://localhost:5000/api/invites/${code}/accept`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Ошибка при принятии приглашения');
      }

      const data = await response.json();
      setSuccess('Приглашение успешно принято!');
      
      setTimeout(() => {
        navigate(`/projects/${data.project._id}`);
      }, 2000);
    } catch (error) {
      setError(error.message);
    } finally {
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <Container className="text-center py-5">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Загрузка...</span>
        </Spinner>
        <p className="mt-2">Загрузка информации о приглашении...</p>
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <Row className="justify-content-center mt-5">
          <Col md={6}>
            <Card className="text-center">
              <Card.Body>
                <h3 className="text-danger">Ошибка</h3>
                <p>{error}</p>
                <Link to="/">
                  <Button variant="primary">На главную</Button>
                </Link>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    );
  }

  if (!inviteInfo) {
    return null;
  }

  const { project, invite } = inviteInfo;

  return (
    <Container className="py-5">
      <Row className="justify-content-center">
        <Col md={8} lg={6}>
          <Card className="shadow">
            <Card.Header className="bg-primary text-white text-center">
              <h4 className="mb-0">Приглашение в проект</h4>
            </Card.Header>
            <Card.Body className="p-4">
              {success && (
                <Alert variant="success">
                  {success}
                  <div className="mt-2">
                    Перенаправление в проект...
                  </div>
                </Alert>
              )}

              {!success && (
                <>
                  <div className="text-center mb-4">
                    <div className="display-1 mb-3">🎯</div>
                    <h3>Вас приглашают в проект</h3>
                  </div>

                  <Card className="mb-4">
                    <Card.Body>
                      <h5>{project.name}</h5>
                      {project.description && (
                        <p className="text-muted">{project.description}</p>
                      )}
                      
                      <div className="mt-3">
                        <p>
                          <strong>Владелец:</strong> {project.owner?.name || 'Неизвестно'}
                        </p>
                        <p>
                          <strong>Роль при приглашении:</strong>{' '}
                          <Badge bg={invite.role === 'admin' ? 'warning' : invite.role === 'member' ? 'info' : 'secondary'}>
                            {invite.role === 'admin' ? 'Администратор' : 
                             invite.role === 'member' ? 'Участник' : 'Наблюдатель'}
                          </Badge>
                        </p>
                      </div>
                    </Card.Body>
                  </Card>

                  <div className="text-center">
                    {isAuthenticated ? (
                      <>
                        {invite.isAlreadyMember ? (
                          <Alert variant="info">
                            Вы уже являетесь участником этого проекта
                            <div className="mt-2">
                              <Link to={`/projects/${project._id}`}>
                                <Button variant="primary">Перейти в проект</Button>
                              </Link>
                            </div>
                          </Alert>
                        ) : (
                          <>
                            <p className="mb-4">
                              Принять приглашение от <strong>{project.owner?.name}</strong>?
                            </p>
                            <Button 
                              variant="success" 
                              size="lg"
                              onClick={handleAcceptInvite}
                              disabled={accepting}
                              className="mb-3"
                            >
                              {accepting ? (
                                <>
                                  <Spinner animation="border" size="sm" className="me-2" />
                                  Принятие...
                                </>
                              ) : (
                                'Принять приглашение'
                              )}
                            </Button>
                          </>
                        )}
                      </>
                    ) : (
                      <Alert variant="warning">
                        <h5>Требуется вход в систему</h5>
                        <p>Для принятия приглашения необходимо войти в систему</p>
                        <div className="d-flex gap-2 justify-content-center">
                          <Link to="/login" state={{ from: `/invite/${code}` }}>
                            <Button variant="primary">Войти</Button>
                          </Link>
                          <Link to="/register" state={{ from: `/invite/${code}` }}>
                            <Button variant="outline-primary">Зарегистрироваться</Button>
                          </Link>
                        </div>
                      </Alert>
                    )}
                  </div>
                </>
              )}
            </Card.Body>
            <Card.Footer className="text-center text-muted">
              <small>Приняв приглашение, вы получите доступ ко всем задачам и материалам проекта</small>
            </Card.Footer>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default InvitePage;