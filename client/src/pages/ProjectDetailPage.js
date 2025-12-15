import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { Container, Spinner, Alert, Button } from 'react-bootstrap';
import { fetchProjectById, clearCurrentProject } from '../store/slices/projectsSlice';
import { clearTasks } from '../store/slices/tasksSlice';
import ProjectHeader from '../components/projects/ProjectHeader';
import ProjectTabs from '../components/projects/ProjectTabs';
import ProjectOverview from '../components/projects/ProjectOverview';
import TaskListWrapper from '../components/projects/TaskListWrapper';
import ProjectMembers from '../components/projects/ProjectMembers';
import ProjectSettings from '../components/projects/ProjectSettings';
import './ProjectDetailPage.css';

const ProjectDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  
  const [activeTab, setActiveTab] = useState('overview');
  const [isLoading, setIsLoading] = useState(true);
  
  const project = useSelector((state) =>
    state.projects?.currentProject || 
    state.projects?.projects?.find(p => p._id === id)
  );
  
  const currentUser = useSelector((state) => state.auth?.user);

  useEffect(() => {
    const loadProject = async () => {
      if (!id) return;
      
      setIsLoading(true);
      try {
        await dispatch(fetchProjectById(id)).unwrap();
      } catch (error) {
        console.error('Error loading project:', error);
        navigate('/projects');
      } finally {
        setIsLoading(false);
      }
    };

    loadProject();

    return () => {
      dispatch(clearCurrentProject());
      dispatch(clearTasks());
    };
  }, [id, dispatch, navigate]);

  const hasAccess = () => {
    if (!project || !currentUser) return false;
    
    // Если проект публичный, разрешаем доступ
    if (project.settings?.isPublic) return true;
    
    // Если пользователь владелец
    if (project.owner === currentUser._id || project.owner?._id === currentUser._id) return true;
    
    // Если пользователь администратор
    if (currentUser.role === 'admin') return true;
    
    // Если пользователь участник проекта
    return project.members?.some(
      member => member.user === currentUser._id || member.user?._id === currentUser._id
    );
  };

  if (isLoading) {
    return (
      <Container className="py-5 text-center">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3">Загрузка проекта...</p>
      </Container>
    );
  }

  if (!project) {
    return (
      <Container className="py-5 text-center">
        <h3>Проект не найден</h3>
        <p className="text-muted">Проект с ID {id} не существует или был удален</p>
        <Button 
          className="btn btn-primary mt-3"
          onClick={() => navigate('/projects')}
        >
          Вернуться к проектам
        </Button>
      </Container>
    );
  }

  if (!hasAccess()) {
    return (
      <Container className="py-5 text-center">
        <h3>Доступ запрещен</h3>
        <p>У вас нет прав для просмотра этого проекта.</p>
        <Button 
          className="btn btn-primary mt-3"
          onClick={() => navigate('/projects')}
        >
          Вернуться к проектам
        </Button>
      </Container>
    );
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return <ProjectOverview project={project} />;
      case 'tasks':
        return <TaskListWrapper project={project} canEdit={hasAccess()} />;
      case 'members':
        return <ProjectMembers project={project} isOwner={project.owner === currentUser._id} />;
      case 'settings':
        return <ProjectSettings project={project} />;
      default:
        return <ProjectOverview project={project} />;
    }
  };

  return (
    <div className="project-detail-page">
      <ProjectHeader project={project} />
      
      <div className="container-fluid mt-4">
        <ProjectTabs 
          activeTab={activeTab}
          onSelect={setActiveTab}
          project={project}
          user={currentUser}
        />
        
        <div className="tab-content mt-4">
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
};

export default ProjectDetailPage;