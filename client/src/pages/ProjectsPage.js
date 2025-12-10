import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Spinner, Alert, Badge } from 'react-bootstrap';
import { LinkContainer } from 'react-router-bootstrap';
import { useSelector, useDispatch } from 'react-redux';
import { fetchProjects } from '../store/slices/projectsSlice';
import CreateProjectModal from '../components/projects/CreateProjectModal';

const ProjectsPage = () => {
  const dispatch = useDispatch();
  const { projects = [], loading = false, error = null } = useSelector((state) => state.projects || {});
  const { user } = useSelector((state) => state.auth || {});
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    dispatch(fetchProjects());
  }, [dispatch]);

  // Защита от undefined
  const projectsArray = Array.isArray(projects) ? projects : [];
  const isLoading = loading || false;
  const errorMessage = error || null;

  if (isLoading) {
    return (
      <Container className="py-5">
        <Row className="justify-content-center">
          <Col md={6} className="text-center">
            <Spinner animation="border" variant="primary" />
            <p className="mt-3">Загрузка проектов...</p>
          </Col>
        </Row>
      </Container>
    );
  }

  return (
    <Container className="py-5">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1>Мои проекты</h1>
          <p className="text-muted mb-0">
            Всего проектов: {projectsArray.length}
          </p>
        </div>
        <Button variant="primary" onClick={() => setShowCreateModal(true)}>
          + Новый проект
        </Button>
      </div>

      {errorMessage && (
        <Alert variant="danger" className="mb-4">
          {errorMessage}
        </Alert>
      )}

      {projectsArray.length === 0 ? (
        <Row className="justify-content-center">
          <Col md={8} className="text-center">
            <Card className="border-dashed">
              <Card.Body className="py-5">
                <h4 className="text-muted mb-3">Проектов пока нет</h4>
                <p className="text-muted mb-4">Создайте свой первый проект для управления задачами</p>
                <Button variant="primary" size="lg" onClick={() => setShowCreateModal(true)}>
                  Создать проект
                </Button>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      ) : (
        <Row>
          {projectsArray.map((project) => (
            <Col key={project._id || Math.random()} md={6} lg={4} className="mb-4">
              <Card className="h-100 shadow-sm hover-shadow">
                <Card.Body>
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <Card.Title className="mb-0">{project.name || 'Без названия'}</Card.Title>
                    <Badge 
                      bg={project.status === 'archived' ? 'secondary' : 'success'}
                      className="text-capitalize"
                    >
                      {project.status === 'archived' ? 'Архив' : 'Активен'}
                    </Badge>
                  </div>
                  
                  <Card.Text className="text-muted small mb-3">
                    {project.description || 'Нет описания'}
                  </Card.Text>
                  
                  <div className="mt-auto">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <span className="badge bg-light text-dark">
                        <i className="bi bi-people me-1"></i>
                        {project.members?.length || 0} участников
                      </span>
                      <span className="badge bg-primary">
                        <i className="bi bi-check-circle me-1"></i>
                        {project.taskCount || 0} задач
                      </span>
                    </div>
                    
                    <div className="small text-muted">
                      <div>Владелец: {project.owner?.name || 'Неизвестно'}</div>
                      <div>Шаблон: 
                        <Badge bg="info" className="ms-2">
                          {project.settings?.template === 'scrum' ? 'Скрам' : 
                           project.settings?.template === 'custom' ? 'Кастомный' : 'Канбан'}
                        </Badge>
                      </div>
                      <div className="mt-1">
                        <small>
                          Обновлен: {new Date(project.updatedAt).toLocaleDateString('ru-RU')}
                        </small>
                      </div>
                    </div>
                  </div>
                </Card.Body>
                <Card.Footer className="bg-transparent">
                  <LinkContainer to={`/projects/${project._id}`}>
                    <Button variant="outline-primary" className="w-100">
                      Открыть проект
                    </Button>
                  </LinkContainer>
                </Card.Footer>
              </Card>
            </Col>
          ))}
        </Row>
      )}

      <CreateProjectModal
        show={showCreateModal}
        onHide={() => setShowCreateModal(false)}
      />
    </Container>
  );
};

export default ProjectsPage;
