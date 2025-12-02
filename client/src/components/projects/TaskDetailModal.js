import React, { useState, useEffect } from 'react';
import { Modal, Tab, Nav, Row, Col, Form, Button, Badge, Alert, Spinner } from 'react-bootstrap';
import { useDispatch, useSelector } from 'react-redux';
import { updateTask } from '../../store/slices/tasksSlice';
import TaskComments from './TaskComments';

const TaskDetailModal = ({ show, onHide, task, project, onTaskUpdated, onTaskDeleted }) => {
  const dispatch = useDispatch();
  const { user } = useSelector(state => state.auth);
  const { operationLoading } = useSelector(state => state.tasks);
  
  const [activeTab, setActiveTab] = useState('details');
  const [editMode, setEditMode] = useState(false);
  const [taskData, setTaskData] = useState({
    title: '',
    description: '',
    status: '',
    priority: '',
    dueDate: '',
    assignee: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (task) {
      setTaskData({
        title: task.title || '',
        description: task.description || '',
        status: task.status || 'To Do',
        priority: task.priority || 'medium',
        dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '',
        assignee: task.assignee?._id || ''
      });
    }
  }, [task]);

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

  const handleSaveTask = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const updateData = {};
      
      if (taskData.title.trim() !== task.title) {
        updateData.title = taskData.title.trim();
      }
      
      if (taskData.description !== task.description) {
        updateData.description = taskData.description.trim();
      }
      
      if (taskData.status !== task.status) {
        updateData.status = taskData.status;
      }
      
      if (taskData.priority !== task.priority) {
        updateData.priority = taskData.priority;
      }
      
      if (taskData.dueDate !== (task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '')) {
        updateData.dueDate = taskData.dueDate ? new Date(taskData.dueDate) : null;
      }
      
      if (taskData.assignee !== (task.assignee?._id || '')) {
        updateData.assignee = taskData.assignee || null;
      }

      if (Object.keys(updateData).length > 0) {
        await dispatch(updateTask({
          taskId: task._id,
          taskData: updateData
        })).unwrap();

        setSuccess('Задача обновлена');
        setTimeout(() => setSuccess(''), 3000);
        setEditMode(false);
        
        if (onTaskUpdated) {
          onTaskUpdated();
        }
      } else {
        setEditMode(false);
      }
    } catch (error) {
      setError(error.message || 'Ошибка обновления задачи');
    }
  };

  const handleDeleteTask = () => {
    if (window.confirm('Вы уверены, что хотите удалить эту задачу?')) {
      if (onTaskDeleted) {
        onTaskDeleted(task._id);
      }
      onHide();
    }
  };

  const isTaskCreator = task?.creator?._id === user?._id;
  const isProjectOwner = project?.owner?._id === user?._id;
  const isAdmin = project?.members?.some(member => 
    member.user?._id === user?._id && 
    (member.role === 'owner' || member.role === 'admin')
  );
  const canEdit = project?.members?.some(member => 
    member.user?._id === user?._id && 
    member.permissions.canEdit
  );

  if (!task) return null;

  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Modal.Header closeButton>
        <Modal.Title>
          {editMode ? 'Редактирование задачи' : task.title}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body className="p-0">
        <Tab.Container activeKey={activeTab} onSelect={setActiveTab}>
          <Row className="g-0">
            <Col md={3}>
              <Nav variant="pills" className="flex-column border-end h-100">
                <Nav.Item>
                  <Nav.Link eventKey="details">📋 Детали</Nav.Link>
                </Nav.Item>
                <Nav.Item>
                  <Nav.Link eventKey="comments">💬 Комментарии</Nav.Link>
                </Nav.Item>
                <Nav.Item>
                  <Nav.Link eventKey="activity">📈 Активность</Nav.Link>
                </Nav.Item>
              </Nav>
            </Col>
            <Col md={9}>
              <div className="p-3">
                {error && <Alert variant="danger">{error}</Alert>}
                {success && <Alert variant="success">{success}</Alert>}

                <Tab.Content>
                  {/* Вкладка деталей задачи */}
                  <Tab.Pane eventKey="details">
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <h5>Детали задачи</h5>
                      <div className="d-flex gap-2">
                        {(canEdit || isTaskCreator || isAdmin) && (
                          <>
                            {!editMode && (
                              <Button
                                variant="outline-primary"
                                size="sm"
                                onClick={() => setEditMode(true)}
                              >
                                Редактировать
                              </Button>
                            )}
                            {(isTaskCreator || isAdmin || isProjectOwner) && (
                              <Button
                                variant="outline-danger"
                                size="sm"
                                onClick={handleDeleteTask}
                              >
                                Удалить
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    {editMode ? (
                      <Form onSubmit={handleSaveTask}>
                        <Form.Group className="mb-3">
                          <Form.Label>Название задачи *</Form.Label>
                          <Form.Control
                            type="text"
                            value={taskData.title}
                            onChange={(e) => setTaskData(prev => ({ ...prev, title: e.target.value }))}
                            required
                          />
                        </Form.Group>

                        <Form.Group className="mb-3">
                          <Form.Label>Описание</Form.Label>
                          <Form.Control
                            as="textarea"
                            rows={4}
                            value={taskData.description}
                            onChange={(e) => setTaskData(prev => ({ ...prev, description: e.target.value }))}
                          />
                        </Form.Group>

                        <Row className="mb-3">
                          <Col md={6}>
                            <Form.Group>
                              <Form.Label>Статус</Form.Label>
                              <Form.Select
                                value={taskData.status}
                                onChange={(e) => setTaskData(prev => ({ ...prev, status: e.target.value }))}
                              >
                                {project.settings.columns.map(column => (
                                  <option key={column} value={column}>{column}</option>
                                ))}
                              </Form.Select>
                            </Form.Group>
                          </Col>
                          <Col md={6}>
                            <Form.Group>
                              <Form.Label>Приоритет</Form.Label>
                              <Form.Select
                                value={taskData.priority}
                                onChange={(e) => setTaskData(prev => ({ ...prev, priority: e.target.value }))}
                              >
                                <option value="low">Низкий</option>
                                <option value="medium">Средний</option>
                                <option value="high">Высокий</option>
                                <option value="critical">Критический</option>
                              </Form.Select>
                            </Form.Group>
                          </Col>
                        </Row>

                        <Row className="mb-3">
                          <Col md={6}>
                            <Form.Group>
                              <Form.Label>Срок выполнения</Form.Label>
                              <Form.Control
                                type="date"
                                value={taskData.dueDate}
                                onChange={(e) => setTaskData(prev => ({ ...prev, dueDate: e.target.value }))}
                              />
                            </Form.Group>
                          </Col>
                          <Col md={6}>
                            <Form.Group>
                              <Form.Label>Исполнитель</Form.Label>
                              <Form.Select
                                value={taskData.assignee}
                                onChange={(e) => setTaskData(prev => ({ ...prev, assignee: e.target.value }))}
                              >
                                <option value="">Не назначен</option>
                                {project.members.map(member => (
                                  <option key={member.user._id} value={member.user._id}>
                                    {member.user.name} ({member.role})
                                  </option>
                                ))}
                              </Form.Select>
                            </Form.Group>
                          </Col>
                        </Row>

                        <div className="d-flex gap-2">
                          <Button
                            variant="primary"
                            type="submit"
                            disabled={operationLoading}
                          >
                            {operationLoading ? (
                              <>
                                <Spinner animation="border" size="sm" className="me-2" />
                                Сохранение...
                              </>
                            ) : 'Сохранить'}
                          </Button>
                          <Button
                            variant="outline-secondary"
                            onClick={() => setEditMode(false)}
                          >
                            Отмена
                          </Button>
                        </div>
                      </Form>
                    ) : (
                      <>
                        <div className="mb-3">
                          <h6>Описание:</h6>
                          <p className="text-muted">{task.description || 'Нет описания'}</p>
                        </div>

                        <Row className="mb-3">
                          <Col md={6}>
                            <h6>Статус:</h6>
                            <Badge bg="outline-primary" text="dark" className="fs-6">
                              {task.status}
                            </Badge>
                          </Col>
                          <Col md={6}>
                            <h6>Приоритет:</h6>
                            <Badge bg={getPriorityVariant(task.priority)} className="fs-6">
                              {getPriorityText(task.priority)}
                            </Badge>
                          </Col>
                        </Row>

                        <Row className="mb-3">
                          <Col md={6}>
                            <h6>Создатель:</h6>
                            <div className="d-flex align-items-center">
                              <div 
                                className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center me-2"
                                style={{ width: '24px', height: '24px', fontSize: '12px' }}
                              >
                                {task.creator?.name?.charAt(0)?.toUpperCase() || 'C'}
                              </div>
                              <span>{task.creator?.name || 'Неизвестно'}</span>
                            </div>
                          </Col>
                          <Col md={6}>
                            <h6>Исполнитель:</h6>
                            {task.assignee ? (
                              <div className="d-flex align-items-center">
                                <div 
                                  className="rounded-circle bg-success text-white d-flex align-items-center justify-content-center me-2"
                                  style={{ width: '24px', height: '24px', fontSize: '12px' }}
                                >
                                  {task.assignee.name?.charAt(0)?.toUpperCase() || 'A'}
                                </div>
                                <span>{task.assignee.name}</span>
                              </div>
                            ) : (
                              <span className="text-muted">Не назначен</span>
                            )}
                          </Col>
                        </Row>

                        {task.dueDate && (
                          <div className="mb-3">
                            <h6>Срок выполнения:</h6>
                            <p>{new Date(task.dueDate).toLocaleDateString('ru-RU')}</p>
                          </div>
                        )}

                        <div className="mb-3">
                          <h6>Дата создания:</h6>
                          <p>{new Date(task.createdAt).toLocaleDateString('ru-RU')}</p>
                        </div>
                      </>
                    )}
                  </Tab.Pane>

                  {/* Вкладка комментариев */}
                  <Tab.Pane eventKey="comments">
                    <TaskComments 
                      task={task} 
                      project={project}
                      onCommentAdded={() => {
                        if (onTaskUpdated) onTaskUpdated();
                      }}
                      onCommentDeleted={() => {
                        if (onTaskUpdated) onTaskUpdated();
                      }}
                    />
                  </Tab.Pane>

                  {/* Вкладка активности */}
                  <Tab.Pane eventKey="activity">
                    <h5>История активности</h5>
                    {task.activityLog && task.activityLog.length > 0 ? (
                      <div className="timeline">
                        {task.activityLog
                          .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                          .map((activity, index) => (
                            <div key={index} className="d-flex mb-3">
                              <div className="flex-shrink-0">
                                <div 
                                  className="rounded-circle bg-secondary text-white d-flex align-items-center justify-content-center"
                                  style={{ width: '32px', height: '32px', fontSize: '14px' }}
                                >
                                  {activity.type === 'created' ? '📝' : 
                                   activity.type === 'updated' ? '✏️' :
                                   activity.type === 'status_changed' ? '🔄' :
                                   activity.type === 'assigned' ? '👤' :
                                   activity.type === 'commented' ? '💬' : '📎'}
                                </div>
                              </div>
                              <div className="flex-grow-1 ms-3">
                                <div className="fw-medium">
                                  {activity.type === 'created' && 'Задача создана'}
                                  {activity.type === 'updated' && 'Задача обновлена'}
                                  {activity.type === 'status_changed' && 'Статус изменен'}
                                  {activity.type === 'assigned' && 'Исполнитель назначен'}
                                  {activity.type === 'commented' && 'Добавлен комментарий'}
                                  {activity.type === 'attachment_added' && 'Добавлено вложение'}
                                </div>
                                <small className="text-muted">
                                  {new Date(activity.timestamp).toLocaleString('ru-RU')}
                                </small>
                              </div>
                            </div>
                          ))}
                      </div>
                    ) : (
                      <p className="text-muted">История активности отсутствует</p>
                    )}
                  </Tab.Pane>
                </Tab.Content>
              </div>
            </Col>
          </Row>
        </Tab.Container>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          Закрыть
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default TaskDetailModal;