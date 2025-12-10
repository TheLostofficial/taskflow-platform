import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Row, Col, Spinner, Alert, Button } from 'react-bootstrap';
import { useSelector, useDispatch } from 'react-redux';
import { fetchProjectById, clearCurrentProject } from '../store/slices/projectsSlice';
import { clearTasks } from '../store/slices/tasksSlice';
import ProjectHeader from '../components/projects/ProjectHeader';
import ProjectTabs from '../components/projects/ProjectTabs';
import ProjectOverview from '../components/projects/ProjectOverview';
import TaskListWrapper from '../components/projects/TaskListWrapper';
import ProjectMembers from '../components/projects/ProjectMembers';
import ProjectSettings from '../components/projects/ProjectSettings';

const ProjectDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  
  const { currentProject, loading, error, networkError } = useSelector((state) => state.projects);
  const { user } = useSelector((state) => state.auth || {});
  
  const [activeTab, setActiveTab] = useState('overview');
  const [localError, setLocalError] = useState('');
  const [initialLoad, setInitialLoad] = useState(true);
  const [idError, setIdError] = useState('');
  const [shouldRender, setShouldRender] = useState(false);

  // ПРОВЕРКА ID ПРОЕКТА - В ХУКЕ useEffect
  useEffect(() => {
    if (!id || id === 'undefined') {
      setIdError('ID проекта не указан или указан некорректно.');
      setShouldRender(false);
    } else {
      setIdError('');
      setShouldRender(true);
    }
  }, [id]);

  // Загрузка проекта
  useEffect(() => {
    if (!shouldRender) return;
    
    const loadProject = async () => {
      try {
        console.log(`🔍 ProjectDetailPage: Загрузка проекта с ID: ${id}`);
        await dispatch(fetchProjectById(id)).unwrap();
        setLocalError('');
      } catch (error) {
        console.error('Ошибка загрузки проекта:', error);
        setLocalError(error.message || 'Проект не найден или у вас нет доступа к нему.');
      }
    };

    // Очищаем все состояния перед загрузкой
    dispatch(clearCurrentProject());
    dispatch(clearTasks());
    
    loadProject();
    
    return () => {
      // Очистка при размонтировании компонента
      dispatch(clearCurrentProject());
      dispatch(clearTasks());
      console.log('🧹 ProjectDetailPage: Очистка состояния при размонтировании');
    };
  }, [id, dispatch, shouldRender]);

  // Автоматический переход на вкладку overview при загрузке
  useEffect(() => {
    if (currentProject?._id && initialLoad) {
      setActiveTab('overview');
      setInitialLoad(false);
    }
  }, [currentProject, initialLoad]);

  // Обработка изменения вкладки
  useEffect(() => {
    if (currentProject?._id) {
      console.log(`📑 ProjectDetailPage: Активная вкладка "${activeTab}" для проекта ${currentProject._id}`);
    }
  }, [activeTab, currentProject]);

  // Удалить все useCallback и создать функции внутри useEffect
  useEffect(() => {
    const handleProjectUpdate = () => {
      console.log(`🔄 ProjectDetailPage: Обновление проекта ${currentProject?._id}`);
      if (id && shouldRender) {
        dispatch(fetchProjectById(id));
      }
      
      if (activeTab === 'tasks') {
        console.log('🔄 ProjectDetailPage: Обновление задач...');
      }
    };

    // Сохраняем функцию для использования в компонентах
    window.__handleProjectUpdate = handleProjectUpdate;

    return () => {
      delete window.__handleProjectUpdate;
    };
  }, [id, dispatch, currentProject?._id, activeTab, shouldRender]);

  // УСЛОВНЫЕ РЕТУРНЫ ТОЛЬКО ПОСЛЕ ВСЕХ ХУКОВ
  if (!shouldRender && idError) {
    return (
      <Container className="py-5">
        <Row className="justify-content-center">
          <Col md={8}>
            <Alert variant="danger">
              <Alert.Heading>Ошибка загрузки проекта</Alert.Heading>
              <p>{idError}</p>
              <hr />
              <Button variant="primary" onClick={() => navigate('/projects')}>
                Вернуться к списку проектов
              </Button>
            </Alert>
          </Col>
        </Row>
      </Container>
    );
  }

  const isLoading = loading || false;
  const errorMessage = localError || error || null;
  const project = currentProject || {};

  // Отображение загрузки
  if (isLoading && shouldRender) {
    return (
      <Container className="py-5">
        <Row className="justify-content-center">
          <Col md={6} className="text-center">
            <Spinner animation="border" variant="primary" />
            <p className="mt-3">Загрузка проекта...</p>
          </Col>
        </Row>
      </Container>
    );
  }

  // Отображение ошибки загрузки
  if ((errorMessage || !project._id) && shouldRender) {
    return (
      <Container className="py-5">
        <Row className="justify-content-center">
          <Col md={8}>
            <Alert variant="danger">
              <Alert.Heading>Ошибка загрузки проекта</Alert.Heading>
              <p>
                {errorMessage || 'Проект не найден или у вас нет доступа к нему.'}
                {networkError && ' Проверьте подключение к серверу.'}
              </p>
              <hr />
              <div className="d-flex gap-2">
                <Button variant="primary" onClick={() => navigate('/projects')}>
                  Вернуться к списку проектов
                </Button>
                <Button variant="outline-secondary" onClick={() => {
                  if (id) {
                    dispatch(fetchProjectById(id));
                  }
                }}>
                  Повторить попытку
                </Button>
              </div>
            </Alert>
          </Col>
        </Row>
      </Container>
    );
  }

  // Проверка доступа пользователя к проекту
  const isMember = project.members?.some(
    (member) => member.user?._id === user?._id
  );
  const isOwner = project.owner?._id === user?._id;

  if (!isMember && !isOwner && !project.settings?.isPublic && shouldRender) {
    return (
      <Container className="py-5">
        <Row className="justify-content-center">
          <Col md={8}>
            <Alert variant="warning">
              <Alert.Heading>Доступ запрещен</Alert.Heading>
              <p>У вас нет доступа к этому проекту.</p>
              <hr />
              <Button variant="primary" onClick={() => navigate('/projects')}>
                Вернуться к списку проектов
              </Button>
            </Alert>
          </Col>
        </Row>
      </Container>
    );
  }

  // Определение прав пользователя
  const canEdit = project.members?.some(member => 
    member.user?._id === user?._id && 
    (member.role === 'owner' || member.role === 'admin' || member.role === 'member')
  );

  const canViewSettings = isOwner || project.members?.some(m => 
    m.user?._id === user?._id && m.role === 'admin'
  );

  const handleTabSelect = (tab) => {
    setActiveTab(tab);
    console.log(`🔄 ProjectDetailPage: Переключение на вкладку "${tab}"`);
  };

  // Основной рендер
  if (!shouldRender || !project._id) {
    return null;
  }

  return (
    <Container className="py-4">
      <ProjectHeader 
        project={project} 
        isOwner={isOwner}
        onUpdate={() => window.__handleProjectUpdate && window.__handleProjectUpdate()}
      />
      
      <ProjectTabs 
        activeTab={activeTab} 
        onSelect={handleTabSelect}
        project={project}
        user={user}
      />
      
      <div className="mt-4">
        {activeTab === 'overview' && (
          <ProjectOverview project={project} />
        )}
        
        {activeTab === 'tasks' && (
          <TaskListWrapper 
            project={project} 
            canEdit={canEdit}
          />
        )}
        
        {activeTab === 'members' && (
          <ProjectMembers 
            project={project}
            isOwner={isOwner}
          />
        )}
        
        {canViewSettings && activeTab === 'settings' && (
          <ProjectSettings 
            project={project}
            onUpdate={() => window.__handleProjectUpdate && window.__handleProjectUpdate()}
          />
        )}
      </div>
    </Container>
  );
};

export default ProjectDetailPage;