import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Row, Col, Spinner, Alert, Button } from 'react-bootstrap';
import { useDispatch, useSelector } from 'react-redux';
import { fetchProjectById, clearCurrentProject } from '../store/slices/projectsSlice';
import { fetchProjectTasks, clearTasks } from '../store/slices/tasksSlice';

import ProjectHeader from '../components/projects/ProjectHeader';
import ProjectTabs from '../components/projects/ProjectTabs';

const ProjectDetailPage = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  
  const { currentProject, operationLoading, operationError } = useSelector(state => state.projects);
  const { items: tasks, loading: tasksLoading } = useSelector(state => state.tasks);
  const { user } = useSelector(state => state.auth);
  
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (projectId) {
      dispatch(fetchProjectById(projectId));
      dispatch(fetchProjectTasks(projectId));
    }

    return () => {
      dispatch(clearCurrentProject());
      dispatch(clearTasks());
    };
  }, [dispatch, projectId]);

  const hasAccess = currentProject && (
    currentProject.owner._id === user?._id ||
    currentProject.members.some(member => member.user._id === user?._id)
  );

  if (operationLoading) {
    return (
      <Container className="text-center py-5">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Загрузка проекта...</span>
        </Spinner>
        <p className="mt-2">Загрузка проекта...</p>
      </Container>
    );
  }

  if (operationError) {
    return (
      <Container>
        <Alert variant="danger" className="mt-4">
          <Alert.Heading>Ошибка загрузки проекта</Alert.Heading>
          <p>{operationError}</p>
          <div className="d-flex gap-2">
            <Button variant="outline-danger" onClick={() => dispatch(fetchProjectById(projectId))}>
              Попробовать снова
            </Button>
            <Button variant="primary" onClick={() => navigate('/projects')}>
              К списку проектов
            </Button>
          </div>
        </Alert>
      </Container>
    );
  }

  if (!currentProject) {
    return (
      <Container>
        <Alert variant="warning" className="mt-4">
          <Alert.Heading>Проект не найден</Alert.Heading>
          <p>Запрошенный проект не существует или у вас нет к нему доступа.</p>
          <Button variant="primary" onClick={() => navigate('/projects')}>
            К списку проектов
          </Button>
        </Alert>
      </Container>
    );
  }

  if (!hasAccess) {
    return (
      <Container>
        <Alert variant="warning" className="mt-4">
          <Alert.Heading>Доступ запрещен</Alert.Heading>
          <p>У вас нет прав для просмотра этого проекта.</p>
          <Button variant="primary" onClick={() => navigate('/projects')}>
            К списку проектов
          </Button>
        </Alert>
      </Container>
    );
  }

  return (
    <Container fluid className="py-4">
      <Row>
        <Col>
          <ProjectHeader 
            project={currentProject} 
            user={user}
            onProjectUpdate={() => {
              dispatch(fetchProjectById(projectId));
              dispatch(fetchProjectTasks(projectId));
            }}
          />
          
          <ProjectTabs
            activeTab={activeTab}
            onTabChange={setActiveTab}
            project={currentProject}
            projectId={projectId}
            user={user}
            tasks={tasks}
            tasksLoading={tasksLoading}
          />
        </Col>
      </Row>
    </Container>
  );
};

export default ProjectDetailPage;