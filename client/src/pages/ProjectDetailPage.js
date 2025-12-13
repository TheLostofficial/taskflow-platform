import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Spinner, Alert, Button } from 'react-bootstrap';
import { useSelector, useDispatch } from 'react-redux';
import { fetchProjectById, clearCurrentProject } from '../store/slices/projectsSlice';
import { clearTasks } from '../store/slices/tasksSlice';
import ProjectHeader from '../components/projects/ProjectHeader';
import ProjectTabs from '../components/projects/ProjectTabs';

const ProjectDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  
  const { currentProject, loading, error } = useSelector((state) => state.projects);
  const { user } = useSelector((state) => state.auth || {});
  
  const [activeTab, setActiveTab] = useState('overview');
  const [isLoading, setIsLoading] = useState(true);

  const loadProject = useCallback(async () => {
    if (!id || id === 'undefined') {
      setIsLoading(false);
      return;
    }
    
    try {
      setIsLoading(true);
      await dispatch(fetchProjectById(id)).unwrap();
    } catch (error) {
      console.error('Ошибка загрузки проекта:', error);
    } finally {
      setIsLoading(false);
    }
  }, [id, dispatch]);

  useEffect(() => {
    loadProject();
    
    return () => {
      dispatch(clearCurrentProject());
      dispatch(clearTasks());
    };
  }, [loadProject, dispatch]);

  if (isLoading) {
    return (
      <Container className="py-5 text-center">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3">Загрузка проекта...</p>
      </Container>
    );
  }

  if (error || !currentProject?._id) {
    return (
      <Container className="py-5">
        <Alert variant="danger">
          <Alert.Heading>Ошибка загрузки проекта</Alert.Heading>
          <p>
            {error || 'Проект не найден или у вас нет доступа к нему.'}
          </p>
          <hr />
          <Button variant="primary" onClick={() => navigate('/projects')}>
            Вернуться к списку проектов
          </Button>
        </Alert>
      </Container>
    );
  }

  const project = currentProject;
  const isMember = project.members?.some(member => member.user?._id === user?._id);
  const isOwner = project.owner?._id === user?._id;

if (!isMember && !isOwner && !project.settings?.isPublic) {
  // Разрешаем доступ только к обзору для публичных проектов или частичный доступ
  // Фактическую проверку оставляем в ProjectTabs
  console.warn('⚠️ Пользователь пытается получить доступ к проекту без прав');
}

  const handleTabSelect = (tab) => {
    setActiveTab(tab);
  };

  return (
    <Container className="py-4">
      <ProjectHeader 
        project={project} 
        isOwner={isOwner}
      />
      
      <ProjectTabs 
        activeTab={activeTab} 
        onSelect={handleTabSelect}
        project={project}
        user={user}
      />
    </Container>
  );
};

export default ProjectDetailPage;