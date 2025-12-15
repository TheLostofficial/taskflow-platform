import React from 'react';
import { Row, Col, Card, ProgressBar, Badge } from 'react-bootstrap';
import { useSelector } from 'react-redux';

const ProjectOverview = ({ project }) => {
  const { items: tasks = [] } = useSelector(state => state.tasks || {});
  
  // Защита от undefined project
  if (!project) {
    return (
      <div className="text-center py-5">
        <p>Проект не загружен</p>
      </div>
    );
  }

  // Безопасные значения по умолчанию
  const projectTasks = tasks.filter(task => task.projectId === project._id) || [];
  const projectMembers = project.members || [];
  const projectSettings = project.settings || {};
  const columns = projectSettings.columns || ['To Do', 'In Progress', 'Done'];
  
  const calculateStats = () => {
    const now = new Date();
    const totalTasks = projectTasks.length;
    const completedTasks = projectTasks.filter(task => task.status === 'Done' || task.status === 'Completed').length;
    const inProgressTasks = projectTasks.filter(task => task.status === 'In Progress').length;
    const todoTasks = projectTasks.filter(task => task.status === 'To Do').length;
    
    const overdueTasks = projectTasks.filter(task => {
      if (!task.dueDate) return false;
      const dueDate = new Date(task.dueDate);
      return dueDate < now && task.status !== 'Done' && task.status !== 'Completed';
    }).length;

    return {
      totalTasks,
      completedTasks,
      inProgressTasks,
      overdueTasks,
      todoTasks
    };
  };

  const stats = calculateStats();
  
  const completionPercentage = stats.totalTasks > 0 
    ? Math.round((stats.completedTasks / stats.totalTasks) * 100)
    : 0;

  const getMemberRole = (member) => {
    const roleNames = {
      owner: 'Владелец',
      admin: 'Администратор',
      member: 'Участник',
      viewer: 'Наблюдатель'
    };
    return roleNames[member.role] || member.role;
  };

  const getStatusDistribution = () => {
    if (projectTasks.length === 0) {
      return [];
    }

    const statusCounts = {};
    columns.forEach(column => {
      statusCounts[column] = projectTasks.filter(task => task.status === column).length;
    });

    return columns.map(column => ({
      name: column,
      count: statusCounts[column] || 0,
      percentage: stats.totalTasks > 0 ? Math.round((statusCounts[column] / stats.totalTasks) * 100) : 0
    }));
  };

  const statusDistribution = getStatusDistribution();

  const getPriorityDistribution = () => {
    if (projectTasks.length === 0) {
      return [];
    }

    const priorityCounts = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0
    };

    projectTasks.forEach(task => {
      if (priorityCounts[task.priority] !== undefined) {
        priorityCounts[task.priority]++;
      }
    });

    return [
      { name: 'Критический', count: priorityCounts.critical, variant: 'danger' },
      { name: 'Высокий', count: priorityCounts.high, variant: 'warning' },
      { name: 'Средний', count: priorityCounts.medium, variant: 'info' },
      { name: 'Низкий', count: priorityCounts.low, variant: 'success' }
    ];
  };

  const priorityDistribution = getPriorityDistribution();

  return (
    <div>
      <Row className="g-4">
        {/* Статистика проекта */}
        <Col md={3}>
          <Card className="text-center h-100">
            <Card.Body>
              <h3 className="text-primary">{stats.totalTasks}</h3>
              <Card.Text>Всего задач</Card.Text>
            </Card.Body>
          </Card>
        </Col>

        <Col md={3}>
          <Card className="text-center h-100">
            <Card.Body>
              <h3 className="text-success">{stats.completedTasks}</h3>
              <Card.Text>Выполнено</Card.Text>
            </Card.Body>
          </Card>
        </Col>

        <Col md={3}>
          <Card className="text-center h-100">
            <Card.Body>
              <h3 className="text-warning">{stats.inProgressTasks}</h3>
              <Card.Text>В работе</Card.Text>
            </Card.Body>
          </Card>
        </Col>

        <Col md={3}>
          <Card className="text-center h-100">
            <Card.Body>
              <h3 className="text-danger">{stats.overdueTasks}</h3>
              <Card.Text>Просрочено</Card.Text>
            </Card.Body>
          </Card>
        </Col>

        {/* Прогресс проекта */}
        <Col md={8}>
          <Card className="h-100">
            <Card.Header>
              <h5 className="mb-0">Прогресс проекта</h5>
            </Card.Header>
            <Card.Body>
              <div className="d-flex justify-content-between mb-2">
                <span>Общее выполнение</span>
                <span>{completionPercentage}%</span>
              </div>
              <ProgressBar 
                now={completionPercentage} 
                variant={completionPercentage >= 80 ? 'success' : completionPercentage >= 50 ? 'warning' : 'primary'}
                className="mb-3"
              />
              
              <div className="mt-3 small text-muted">
                {stats.completedTasks} из {stats.totalTasks} задач выполнено
              </div>

              {/* Распределение по статусам */}
              {stats.totalTasks > 0 && (
                <div className="mt-4">
                  <h6>Распределение по статусам:</h6>
                  {statusDistribution.map(status => (
                    <div key={status.name} className="d-flex justify-content-between align-items-center mb-2">
                      <span>{status.name}</span>
                      <div className="d-flex align-items-center">
                        <span className="me-2">{status.count}</span>
                        <Badge bg="outline-secondary" text="dark">
                          {status.percentage}%
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>

        {/* Участники и приоритеты */}
        <Col md={4}>
          <Card className="h-100">
            <Card.Header>
              <h5 className="mb-0">Участники ({projectMembers.length})</h5>
            </Card.Header>
            <Card.Body>
              {projectMembers.slice(0, 5).map((member, index) => (
                <div key={member.user?._id || index} className="d-flex align-items-center mb-2">
                  <div 
                    className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center me-2"
                    style={{ width: '32px', height: '32px', fontSize: '14px' }}
                  >
                    {member.user?.name?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                  <div className="flex-grow-1">
                    <div className="fw-medium">{member.user?.name || 'Неизвестный'}</div>
                    <Badge bg="outline-secondary" text="dark" className="small">
                      {getMemberRole(member)}
                    </Badge>
                  </div>
                </div>
              ))}
              {projectMembers.length > 5 && (
                <div className="text-center text-muted small">
                  и еще {projectMembers.length - 5} участников...
                </div>
              )}
            </Card.Body>
          </Card>

          {/* Распределение по приоритетам */}
          {stats.totalTasks > 0 && (
            <Card className="mt-3">
              <Card.Header>
                <h6 className="mb-0">Приоритеты задач</h6>
              </Card.Header>
              <Card.Body>
                {priorityDistribution.map(priority => (
                  <div key={priority.name} className="d-flex justify-content-between align-items-center mb-2">
                    <Badge bg={priority.variant}>{priority.name}</Badge>
                    <span>{priority.count}</span>
                  </div>
                ))}
              </Card.Body>
            </Card>
          )}
        </Col>

        {/* Информация о проекте */}
        <Col md={6}>
          <Card className="h-100">
            <Card.Header>
              <h5 className="mb-0">Информация о проекте</h5>
            </Card.Header>
            <Card.Body>
              <table className="table table-sm">
                <tbody>
                  <tr>
                    <td><strong>Шаблон:</strong></td>
                    <td className="text-capitalize">{projectSettings.template || 'Не указан'}</td>
                  </tr>
                  <tr>
                    <td><strong>Статус:</strong></td>
                    <td className="text-capitalize">
                      {project.status === 'active' ? 'активный' : 
                       project.status === 'archived' ? 'архивный' : 
                       project.status === 'completed' ? 'завершенный' : 'неизвестно'}
                    </td>
                  </tr>
                  <tr>
                    <td><strong>Видимость:</strong></td>
                    <td>{projectSettings.isPublic ? 'Публичный' : 'Приватный'}</td>
                  </tr>
                  <tr>
                    <td><strong>Дата создания:</strong></td>
                    <td>{project.createdAt ? new Date(project.createdAt).toLocaleDateString('ru-RU') : 'Неизвестно'}</td>
                  </tr>
                  <tr>
                    <td><strong>Последнее обновление:</strong></td>
                    <td>{project.updatedAt ? new Date(project.updatedAt).toLocaleDateString('ru-RU') : 'Неизвестно'}</td>
                  </tr>
                </tbody>
              </table>
            </Card.Body>
          </Card>
        </Col>

        {/* Колонки проекта */}
        <Col md={6}>
          <Card className="h-100">
            <Card.Header>
              <h5 className="mb-0">Колонки проекта</h5>
            </Card.Header>
            <Card.Body>
              {columns && columns.length > 0 ? (
                <div className="d-flex flex-wrap gap-2">
                  {columns.map((column, index) => {
                    const taskCount = projectTasks.filter(task => task.status === column).length;
                    return (
                      <div key={index} className="d-flex align-items-center mb-2 w-100">
                        <Badge bg="outline-primary" text="dark" className="fs-6 p-2 flex-grow-1">
                          {column}
                        </Badge>
                        <Badge bg="secondary" className="ms-2">
                          {taskCount}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-muted">Колонки не настроены</p>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default ProjectOverview;
