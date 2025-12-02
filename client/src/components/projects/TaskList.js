import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Button, Badge, Form, Spinner, Alert, Dropdown, ButtonGroup } from 'react-bootstrap';
import { useDispatch, useSelector } from 'react-redux';
import { fetchProjectTasks, createTask, updateTask, deleteTask } from '../../store/slices/tasksSlice';
import TaskDetailModal from './TaskDetailModal';
import TaskFilters from './TaskFilters';
import exportService from '../../services/exportService';

const TaskList = ({ project, canEdit }) => {
  const dispatch = useDispatch();
  const { items: tasks, loading, error, operationLoading } = useSelector(state => state.tasks);
  
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [filteredTasks, setFilteredTasks] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    status: project.settings.columns[0] || 'To Do',
    priority: 'medium'
  });

  useEffect(() => {
    if (project._id) {
      dispatch(fetchProjectTasks(project._id));
    }
  }, [dispatch, project._id]);

  useEffect(() => {
    setFilteredTasks(tasks);
  }, [tasks]);

  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!newTask.title.trim()) return;

    try {
      await dispatch(createTask({
        ...newTask,
        project: project._id
      })).unwrap();

      setNewTask({
        title: '',
        description: '',
        status: project.settings.columns[0] || 'To Do',
        priority: 'medium'
      });
      setShowCreateForm(false);
    } catch (error) {
      console.error('Failed to create task:', error);
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (window.confirm('Вы уверены, что хотите удалить эту задачу?')) {
      try {
        await dispatch(deleteTask(taskId)).unwrap();
      } catch (error) {
        console.error('Failed to delete task:', error);
      }
    }
  };

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      await dispatch(updateTask({
        taskId,
        taskData: { status: newStatus }
      })).unwrap();
    } catch (error) {
      console.error('Failed to update task:', error);
    }
  };

  const handleFilterChange = (filtered, filters) => {
    setFilteredTasks(filtered);
  };

  const getPriorityVariant = (priority) => {
    switch (priority) {
      case 'low': return 'success';
      case 'medium': return 'warning';
      case 'high': return 'danger';
      case 'critical': return 'dark';
      default: return 'secondary';
    }
  };

  const getPriorityText = (priority) => {
    switch (priority) {
      case 'low': return 'Низкий';
      case 'medium': return 'Средний';
      case 'high': return 'Высокий';
      case 'critical': return 'Критический';
      default: return priority;
    }
  };

  const handleExportCSV = () => {
    try {
      exportService.exportTasksToCSV(tasks, project.name);
    } catch (error) {
      console.error('Export error:', error);
    }
  };

  const handleExportJSON = () => {
    try {
      exportService.exportTasksToJSON(tasks, project.name);
    } catch (error) {
      console.error('Export error:', error);
    }
  };

  const tasksByStatus = {};
  project.settings.columns.forEach(column => {
    tasksByStatus[column] = filteredTasks.filter(task => task.status === column);
  });

  if (loading) {
    return (
      <div className="text-center py-4">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Загрузка задач...</span>
        </Spinner>
        <p className="mt-2">Загрузка задач...</p>
      </div>
    );
  }

  return (
    <div>
      {error && <Alert variant="danger">{error}</Alert>}

      <div className="d-flex justify-content-between align-items-center mb-4">
        <h5>Задачи проекта ({filteredTasks.length} из {tasks.length})</h5>
        <div className="d-flex gap-2">
          <ButtonGroup>
            <Button 
              variant="outline-secondary" 
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              {showFilters ? 'Скрыть фильтры' : 'Показать фильтры'}
            </Button>
            
            <Dropdown>
              <Dropdown.Toggle variant="outline-info" size="sm" id="export-dropdown">
                📤 Экспорт
              </Dropdown.Toggle>
              <Dropdown.Menu>
                <Dropdown.Item onClick={handleExportCSV} disabled={tasks.length === 0}>
                  Экспорт в CSV
                </Dropdown.Item>
                <Dropdown.Item onClick={handleExportJSON} disabled={tasks.length === 0}>
                  Экспорт в JSON
                </Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown>
          </ButtonGroup>
          
          {canEdit && (
            <Button 
              variant="primary" 
              size="sm"
              onClick={() => setShowCreateForm(true)}
            >
              + Создать задачу
            </Button>
          )}
        </div>
      </div>

      {/* Компонент фильтров */}
      {showFilters && (
        <TaskFilters 
          tasks={tasks}
          onFilterChange={handleFilterChange}
          projectMembers={project.members}
        />
      )}

      {/* Форма создания задачи */}
      {showCreateForm && (
        <Card className="mb-4">
          <Card.Header>
            <strong>Новая задача</strong>
          </Card.Header>
          <Card.Body>
            <Form onSubmit={handleCreateTask}>
              <Row>
                <Col md={8}>
                  <Form.Group className="mb-3">
                    <Form.Label>Название задачи *</Form.Label>
                    <Form.Control
                      type="text"
                      value={newTask.title}
                      onChange={(e) => setNewTask(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Введите название задачи..."
                      required
                    />
                  </Form.Group>
                </Col>
                <Col md={2}>
                  <Form.Group className="mb-3">
                    <Form.Label>Статус</Form.Label>
                    <Form.Select
                      value={newTask.status}
                      onChange={(e) => setNewTask(prev => ({ ...prev, status: e.target.value }))}
                    >
                      {project.settings.columns.map(column => (
                        <option key={column} value={column}>{column}</option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={2}>
                  <Form.Group className="mb-3">
                    <Form.Label>Приоритет</Form.Label>
                    <Form.Select
                      value={newTask.priority}
                      onChange={(e) => setNewTask(prev => ({ ...prev, priority: e.target.value }))}
                    >
                      <option value="low">Низкий</option>
                      <option value="medium">Средний</option>
                      <option value="high">Высокий</option>
                      <option value="critical">Критический</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
              </Row>
              
              <Form.Group className="mb-3">
                <Form.Label>Описание</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={2}
                  value={newTask.description}
                  onChange={(e) => setNewTask(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Опишите задачу..."
                />
              </Form.Group>

              <div className="d-flex gap-2">
                <Button variant="primary" type="submit" disabled={operationLoading}>
                  {operationLoading ? 'Создание...' : 'Создать задачу'}
                </Button>
                <Button 
                  variant="outline-secondary" 
                  onClick={() => setShowCreateForm(false)}
                >
                  Отмена
                </Button>
              </div>
            </Form>
          </Card.Body>
        </Card>
      )}

      {/* Kanban доска */}
      <Row className="g-3">
        {project.settings.columns.map(column => (
          <Col key={column} md={4} lg={3}>
            <Card className="h-100">
              <Card.Header className="bg-light">
                <div className="d-flex justify-content-between align-items-center">
                  <strong>{column}</strong>
                  <Badge bg="secondary">{tasksByStatus[column]?.length || 0}</Badge>
                </div>
              </Card.Header>
              <Card.Body className="p-2">
                {tasksByStatus[column]?.map(task => (
                  <Card 
                    key={task._id} 
                    className="mb-2 shadow-sm"
                    style={{ cursor: 'pointer' }}
                    onClick={() => {
                      setSelectedTask(task);
                      setShowTaskModal(true);
                    }}
                  >
                    <Card.Body className="p-3">
                      <div className="d-flex justify-content-between align-items-start mb-2">
                        <h6 className="mb-0">{task.title}</h6>
                        <Badge bg={getPriorityVariant(task.priority)} size="sm">
                          {getPriorityText(task.priority)}
                        </Badge>
                      </div>
                      {task.description && (
                        <p className="small text-muted mb-2">
                          {task.description.length > 100 
                            ? `${task.description.substring(0, 100)}...` 
                            : task.description
                          }
                        </p>
                      )}
                      <div className="d-flex justify-content-between align-items-center">
                        <small className="text-muted">
                          {new Date(task.createdAt).toLocaleDateString('ru-RU')}
                        </small>
                        <div className="d-flex gap-1">
                          {canEdit && (
                            <>
                              <Button
                                variant="outline-danger"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteTask(task._id);
                                }}
                              >
                                Удалить
                              </Button>
                              <Form.Select
                                size="sm"
                                value={task.status}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  handleStatusChange(task._id, e.target.value);
                                }}
                                style={{ width: 'auto' }}
                                onClick={(e) => e.stopPropagation()}
                              >
                                {project.settings.columns.map(col => (
                                  <option key={col} value={col}>{col}</option>
                                ))}
                              </Form.Select>
                            </>
                          )}
                        </div>
                      </div>
                    </Card.Body>
                  </Card>
                ))}
                
                {(!tasksByStatus[column] || tasksByStatus[column].length === 0) && (
                  <div className="text-center text-muted py-4">
                    <small>Задачи отсутствуют</small>
                  </div>
                )}
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>

      {tasks.length === 0 && !showCreateForm && (
        <Card className="text-center py-5">
          <Card.Body>
            <h5>Задачи отсутствуют</h5>
            <p className="text-muted">Создайте первую задачу для этого проекта</p>
            {canEdit && (
              <Button 
                variant="primary"
                onClick={() => setShowCreateForm(true)}
              >
                Создать первую задачу
              </Button>
            )}
          </Card.Body>
        </Card>
      )}

      {/* Модальное окно деталей задачи */}
      <TaskDetailModal
        show={showTaskModal}
        onHide={() => {
          setShowTaskModal(false);
          setSelectedTask(null);
        }}
        task={selectedTask}
        project={project}
        onTaskUpdated={() => {
          dispatch(fetchProjectTasks(project._id));
        }}
        onTaskDeleted={(taskId) => {
          handleDeleteTask(taskId);
        }}
      />
    </div>
  );
};

export default TaskList;