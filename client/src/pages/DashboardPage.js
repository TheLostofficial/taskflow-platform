import React, { useEffect, useState } from 'react';
import { 
  Container, Row, Col, Card, Button, Badge, 
  Spinner, Alert, Dropdown, ProgressBar, ListGroup 
} from 'react-bootstrap';
import { useSelector, useDispatch } from 'react-redux';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { getUserTaskStats, getRecentActivity } from '../store/slices/tasksSlice';
import { fetchProjects } from '../store/slices/projectsSlice';

const DashboardPage = () => {
  const dispatch = useDispatch();
  const { user } = useSelector(state => state.auth || {});
  const { projects, loading: projectsLoading } = useSelector(state => state.projects || {});
  const { 
    taskStats, 
    recentActivity,
    loading: statsLoading 
  } = useSelector(state => state.tasks || {});
  
  const [timeRange, setTimeRange] = useState('month');
  const [activeChart, setActiveChart] = useState('status');
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setError(null);
        await dispatch(fetchProjects());
        await dispatch(getUserTaskStats());
        await dispatch(getRecentActivity());
      } catch (err) {
        setError('Ошибка загрузки данных дашборда');
        console.error('Dashboard data loading error:', err);
      }
    };
    
    loadData();
  }, [dispatch]);

  const handleRefresh = () => {
    dispatch(fetchProjects());
    dispatch(getUserTaskStats());
    dispatch(getRecentActivity());
  };

  const getPriorityData = () => {
    if (!taskStats?.priority) return [];
    
    return [
      { name: 'Низкий', value: taskStats.priority.low || 0, color: '#28a745' },
      { name: 'Средний', value: taskStats.priority.medium || 0, color: '#ffc107' },
      { name: 'Высокий', value: taskStats.priority.high || 0, color: '#fd7e14' },
      { name: 'Критический', value: taskStats.priority.critical || 0, color: '#dc3545' }
    ];
  };

  const getStatusData = () => {
    if (!taskStats) return [];
    
    return [
      { name: 'К выполнению', value: taskStats.todo || 0, color: '#6c757d' },
      { name: 'В работе', value: taskStats.inprogress || 0, color: '#007bff' },
      { name: 'На проверке', value: taskStats.review || 0, color: '#6f42c1' },
      { name: 'Выполнено', value: taskStats.completed || 0, color: '#28a745' }
    ];
  };

  const getProjectProgressData = () => {
    if (!projects) return [];
    
    return projects.map(project => ({
      name: project.name,
      progress: project.progress || 0,
      tasks: project.taskCount || 0,
      id: project._id
    })).slice(0, 5);
  };

  const getActivityData = () => {
    if (!recentActivity) return [];
    
    const activityByDay = {};
    const last7Days = new Date();
    last7Days.setDate(last7Days.getDate() - 7);
    
    recentActivity.forEach(activity => {
      const date = new Date(activity.date);
      if (date >= last7Days) {
        const dateStr = format(date, 'dd MMM', { locale: ru });
        if (!activityByDay[dateStr]) {
          activityByDay[dateStr] = 0;
        }
        activityByDay[dateStr]++;
      }
    });
    
    const result = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = format(date, 'dd MMM', { locale: ru });
      result.push({
        date: dateStr,
        activity: activityByDay[dateStr] || 0
      });
    }
    
    return result;
  };

  const renderChartPlaceholder = () => {
    return (
      <div className="d-flex justify-content-center align-items-center h-100">
        <div className="text-center text-muted">
          <i className="bi bi-bar-chart fs-1"></i>
          <p className="mt-2">Графики временно недоступны</p>
          <small>Идет обновление системы визуализации</small>
        </div>
      </div>
    );
  };

  const isLoading = statsLoading || projectsLoading;

  if (isLoading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '80vh' }}>
        <div className="text-center">
          <Spinner animation="border" variant="primary" />
          <p className="mt-3 text-muted">Загрузка дашборда...</p>
        </div>
      </div>
    );
  }

  const priorityData = getPriorityData();
  const statusData = getStatusData();
  const projectProgressData = getProjectProgressData();
  const activityData = getActivityData();

  return (
    <Container fluid className="py-4">
      {error && (
        <Alert variant="danger" onClose={() => setError(null)} dismissible className="mb-4">
          {error}
        </Alert>
      )}
      
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h1 className="h3 mb-1">Панель управления</h1>
              <p className="text-muted mb-0">
                Добро пожаловать, {user?.name || 'Пользователь'}! 
                {taskStats && ` У вас ${taskStats.total || 0} задач.`}
              </p>
            </div>
            <div className="d-flex align-items-center gap-2">
              <Dropdown>
                <Dropdown.Toggle variant="outline-secondary" size="sm">
                  <i className="bi bi-calendar3 me-2"></i>
                  {timeRange === 'day' && 'Сегодня'}
                  {timeRange === 'week' && 'Неделя'}
                  {timeRange === 'month' && 'Месяц'}
                  {timeRange === 'year' && 'Год'}
                </Dropdown.Toggle>
                <Dropdown.Menu>
                  <Dropdown.Item onClick={() => setTimeRange('day')}>Сегодня</Dropdown.Item>
                  <Dropdown.Item onClick={() => setTimeRange('week')}>Неделя</Dropdown.Item>
                  <Dropdown.Item onClick={() => setTimeRange('month')}>Месяц</Dropdown.Item>
                  <Dropdown.Item onClick={() => setTimeRange('year')}>Год</Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown>
              <Button variant="outline-primary" size="sm" onClick={handleRefresh}>
                <i className="bi bi-arrow-clockwise"></i>
              </Button>
            </div>
          </div>
        </Col>
      </Row>

      <Row className="mb-4">
        <Col xl={3} md={6} className="mb-4">
          <Card className="border-start border-primary border-4 h-100">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h6 className="text-muted mb-2">Всего задач</h6>
                  <h3 className="mb-0">{taskStats?.total || 0}</h3>
                  <small className="text-success">
                    <i className="bi bi-arrow-up"></i> 12% с прошлой недели
                  </small>
                </div>
                <div className="bg-primary bg-opacity-10 p-3 rounded-circle">
                  <i className="bi bi-clipboard-check text-primary fs-4"></i>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
        
        <Col xl={3} md={6} className="mb-4">
          <Card className="border-start border-success border-4 h-100">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h6 className="text-muted mb-2">Выполнено</h6>
                  <h3 className="mb-0">{taskStats?.completed || 0}</h3>
                  <small className="text-success">
                    {taskStats?.completionRate || 0}% завершено
                  </small>
                </div>
                <div className="bg-success bg-opacity-10 p-3 rounded-circle">
                  <i className="bi bi-check-circle text-success fs-4"></i>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
        
        <Col xl={3} md={6} className="mb-4">
          <Card className="border-start border-warning border-4 h-100">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h6 className="text-muted mb-2">В работе</h6>
                  <h3 className="mb-0">{taskStats?.inprogress || 0}</h3>
                  <small className="text-warning">
                    <i className="bi bi-clock"></i> Активно
                  </small>
                </div>
                <div className="bg-warning bg-opacity-10 p-3 rounded-circle">
                  <i className="bi bi-hourglass-split text-warning fs-4"></i>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
        
        <Col xl={3} md={6} className="mb-4">
          <Card className="border-start border-danger border-4 h-100">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h6 className="text-muted mb-2">Просрочено</h6>
                  <h3 className="mb-0">{taskStats?.overdue || 0}</h3>
                  <small className="text-danger">
                    <i className="bi bi-exclamation-triangle"></i> Требуют внимания
                  </small>
                </div>
                <div className="bg-danger bg-opacity-10 p-3 rounded-circle">
                  <i className="bi bi-exclamation-triangle text-danger fs-4"></i>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row className="mb-4">
        <Col lg={8} className="mb-4">
          <Card className="h-100">
            <Card.Header className="bg-white border-bottom-0">
              <div className="d-flex justify-content-between align-items-center">
                <h6 className="mb-0">Обзор активности</h6>
                <div className="btn-group btn-group-sm" role="group">
                  <Button
                    variant={activeChart === 'status' ? 'primary' : 'outline-primary'}
                    size="sm"
                    onClick={() => setActiveChart('status')}
                  >
                    По статусам
                  </Button>
                  <Button
                    variant={activeChart === 'priority' ? 'primary' : 'outline-primary'}
                    size="sm"
                    onClick={() => setActiveChart('priority')}
                  >
                    По приоритетам
                  </Button>
                  <Button
                    variant={activeChart === 'activity' ? 'primary' : 'outline-primary'}
                    size="sm"
                    onClick={() => setActiveChart('activity')}
                  >
                    Активность
                  </Button>
                </div>
              </div>
            </Card.Header>
            <Card.Body>
              <div style={{ height: '300px' }}>
                {renderChartPlaceholder()}
              </div>
            </Card.Body>
          </Card>
        </Col>
        
        <Col lg={4} className="mb-4">
          <Card className="h-100">
            <Card.Header className="bg-white border-bottom-0">
              <h6 className="mb-0">Проекты</h6>
            </Card.Header>
            <Card.Body>
              <div className="mb-3">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span className="text-muted">Всего проектов</span>
                  <Badge bg="primary">{projects?.length || 0}</Badge>
                </div>
                <Link to="/projects" className="btn btn-outline-primary btn-sm w-100">
                  <i className="bi bi-plus-circle me-1"></i>
                  Новый проект
                </Link>
              </div>
              
              <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
                {projectProgressData.map((project, index) => (
                  <div key={project.id} className="mb-3">
                    <div className="d-flex justify-content-between align-items-center mb-1">
                      <Link 
                        to={`/projects/${project.id}`}
                        className="text-decoration-none text-truncate"
                        style={{ maxWidth: '70%' }}
                      >
                        {project.name}
                      </Link>
                      <Badge bg="secondary">{project.tasks}</Badge>
                    </div>
                    <ProgressBar 
                      now={project.progress} 
                      label={`${project.progress}%`}
                      variant={project.progress < 30 ? 'danger' : project.progress < 70 ? 'warning' : 'success'}
                    />
                  </div>
                ))}
                
                {(!projects || projects.length === 0) && (
                  <div className="text-center text-muted py-3">
                    <i className="bi bi-folder2-open fs-1"></i>
                    <p className="mt-2 mb-0">Проекты отсутствуют</p>
                    <small>Создайте первый проект</small>
                  </div>
                )}
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row>
        <Col lg={8} className="mb-4">
          <Card className="h-100">
            <Card.Header className="bg-white border-bottom-0">
              <div className="d-flex justify-content-between align-items-center">
                <h6 className="mb-0">Последняя активность</h6>
                <Link to="/activity" className="btn btn-link btn-sm">
                  Вся активность
                </Link>
              </div>
            </Card.Header>
            <Card.Body>
              {recentActivity && recentActivity.length > 0 ? (
                <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                  <ListGroup variant="flush">
                    {recentActivity.map((activity, index) => (
                      <ListGroup.Item key={index} className="border-0 px-0 py-2">
                        <div className="d-flex align-items-start">
                          <div className="me-3">
                            <div className="bg-light rounded-circle p-2">
                              <span className="fs-5">{activity.icon}</span>
                            </div>
                          </div>
                          <div className="flex-grow-1">
                            <div className="d-flex justify-content-between align-items-start">
                              <div>
                                <strong>{activity.user?.name || 'Вы'}</strong> {activity.action}
                                {activity.taskTitle && (
                                  <span className="ms-1 fw-bold">"{activity.taskTitle}"</span>
                                )}
                                {activity.projectName && (
                                  <span className="text-muted ms-1">
                                    в проекте {activity.projectName}
                                  </span>
                                )}
                              </div>
                              <small className="text-muted">
                                {activity.date ? 
                                  format(new Date(activity.date), 'dd MMM, HH:mm', { locale: ru }) : 
                                  'Только что'}
                              </small>
                            </div>
                            {activity.commentPreview && (
                              <div className="mt-1 text-muted small">
                                "{activity.commentPreview}"
                              </div>
                            )}
                          </div>
                        </div>
                      </ListGroup.Item>
                    ))}
                  </ListGroup>
                </div>
              ) : (
                <div className="text-center text-muted py-4">
                  <i className="bi bi-activity fs-1"></i>
                  <p className="mt-2">Активность отсутствует</p>
                  <small>Начните работать над задачами</small>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
        
        <Col lg={4} className="mb-4">
          <Card className="h-100">
            <Card.Header className="bg-white border-bottom-0">
              <h6 className="mb-0">Быстрые действия</h6>
            </Card.Header>
            <Card.Body>
              <div className="d-grid gap-2">
                <Link to="/projects" className="btn btn-primary">
                  <i className="bi bi-plus-circle me-2"></i>
                  Создать задачу
                </Link>
                <Link to="/projects/create" className="btn btn-outline-primary">
                  <i className="bi bi-folder-plus me-2"></i>
                  Создать проект
                </Link>
                <Link to="/projects" className="btn btn-outline-secondary">
                  <i className="bi bi-calendar3 me-2"></i>
                  Календарь задач
                </Link>
                <Button variant="outline-success">
                  <i className="bi bi-file-earmark-text me-2"></i>
                  Создать отчет
                </Button>
              </div>
              
              <hr className="my-4" />
              
              <div>
                <h6 className="mb-3">Статистика по времени</h6>
                {taskStats?.time ? (
                  <div className="row text-center">
                    <div className="col-6">
                      <div className="bg-light rounded p-3">
                        <div className="fs-4 fw-bold text-primary">
                          {taskStats.time.actual || 0}
                        </div>
                        <small className="text-muted">Затрачено часов</small>
                      </div>
                    </div>
                    <div className="col-6">
                      <div className="bg-light rounded p-3">
                        <div className={`fs-4 fw-bold ${taskStats.time.difference >= 0 ? 'text-success' : 'text-danger'}`}>
                          {taskStats.time.difference >= 0 ? '+' : ''}{taskStats.time.difference || 0}
                        </div>
                        <small className="text-muted">Разница с планом</small>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-muted py-3">
                    <i className="bi bi-clock-history fs-1"></i>
                    <p className="mt-2 mb-0">Данные о времени отсутствуют</p>
                  </div>
                )}
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row className="mt-4">
        <Col>
          <Card>
            <Card.Body>
              <Row className="align-items-center">
                <Col md={8}>
                  <h6 className="mb-1">Продуктивность за неделю</h6>
                  <p className="text-muted mb-0 small">
                    {taskStats?.completed || 0} задач выполнено из {taskStats?.total || 0}
                  </p>
                </Col>
                <Col md={4} className="text-md-end">
                  <div className="d-inline-block">
                    <div className="fs-3 fw-bold">
                      {taskStats?.completionRate || 0}%
                    </div>
                    <div className="text-success small">
                      <i className="bi bi-arrow-up"></i> 5% с прошлой недели
                    </div>
                  </div>
                </Col>
              </Row>
              <ProgressBar 
                now={taskStats?.completionRate || 0} 
                variant="success"
                className="mt-3"
                style={{ height: '8px' }}
              />
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default DashboardPage;
