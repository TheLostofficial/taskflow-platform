import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Spinner, Alert } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import CreateProjectModal from '../components/projects/CreateProjectModal';

const ProjectsPage = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const { isAuthenticated } = useSelector(state => state.auth);

  useEffect(() => {
    if (isAuthenticated) {
      fetchProjects();
    }
  }, [isAuthenticated]);

  const fetchProjects = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/projects', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setProjects(data.projects || []);
      } else {
        setError('Failed to load projects');
      }
    } catch (error) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  const handleProjectCreated = (newProject) => {
    setProjects(prev => [newProject, ...prev]);
  };

  if (!isAuthenticated) {
    return (
      <Container>
        <Row className="justify-content-center">
          <Col md={6}>
            <Card className="text-center">
              <Card.Body>
                <h3>Доступ запрещен</h3>
                <p>Пожалуйста, войдите в систему чтобы просматривать проекты</p>
                <Link to="/login">
                  <Button variant="primary">Войти</Button>
                </Link>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    );
  }

  if (loading) {
    return (
      <Container className="text-center py-5">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Загрузка...</span>
        </Spinner>
        <p className="mt-2">Загрузка проектов...</p>
      </Container>
    );
  }

  return (
    <>
      <Container>
        <Row className="mb-4">
          <Col>
            <div className="d-flex justify-content-between align-items-center">
              <h1>Мои проекты</h1>
              <Button 
                variant="success" 
                size="lg"
                onClick={() => setShowCreateModal(true)}
              >
                + Создать проект
              </Button>
            </div>
          </Col>
        </Row>

        {error && <Alert variant="danger">{error}</Alert>}

        <Row className="g-4">
          {projects.length === 0 ? (
            <Col>
              <Card className="text-center py-5">
                <Card.Body>
                  <h3>Проектов пока нет</h3>
                  <p className="text-muted">Создайте ваш первый проект чтобы начать работу</p>
                  <Button 
                    variant="primary" 
                    size="lg"
                    onClick={() => setShowCreateModal(true)}
                  >
                    Создать первый проект
                  </Button>
                </Card.Body>
              </Card>
            </Col>
          ) : (
            projects.map(project => (
              <Col key={project._id || project.id} md={6} lg={4}>
                <Card className="h-100 shadow-sm">
                  <Card.Body className="d-flex flex-column">
                    <Card.Title>{project.name}</Card.Title>
                    <Card.Text className="text-muted flex-grow-1">
                      {project.description || 'Описание отсутствует'}
                    </Card.Text>
                    <div className="mt-auto">
                      <small className="text-muted d-block">
                        Статус: <span className="text-capitalize">{project.status}</span>
                      </small>
                      <small className="text-muted">
                        Участников: {project.members?.length || 1}
                      </small>
                    </div>
                  </Card.Body>
                  <Card.Footer>
                    <Button variant="outline-primary" size="sm">
                      Открыть
                    </Button>
                  </Card.Footer>
                </Card>
              </Col>
            ))
          )}
        </Row>
      </Container>

      <CreateProjectModal
        show={showCreateModal}
        onHide={() => setShowCreateModal(false)}
        onProjectCreated={handleProjectCreated}
      />
    </>
  );
};

export default ProjectsPage;
