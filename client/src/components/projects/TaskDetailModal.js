import React, { useState, useEffect } from 'react';
import { 
  Modal, Button, Form, Row, Col, Badge, Alert, 
  Spinner, ButtonGroup, InputGroup, 
  ListGroup, Tab, Tabs, Card, ProgressBar,
  Dropdown
} from 'react-bootstrap';
import { useSelector, useDispatch } from 'react-redux';
import { updateTask, deleteTask } from '../../store/slices/tasksSlice';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import TaskComments from './TaskComments';

const TaskDetailModal = ({ show, onHide, task, project }) => {
  const dispatch = useDispatch();
  const { user } = useSelector(state => state.auth || {});
  const { operationLoading } = useSelector(state => state.tasks || {});
  
  const [taskData, setTaskData] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [activeTab, setActiveTab] = useState('details');
  const [error, setError] = useState(null);
  const [checklistItems, setChecklistItems] = useState([]);
  const [newChecklistItem, setNewChecklistItem] = useState('');

  useEffect(() => {
    if (task) {
      setTaskData(task);
      setChecklistItems(task.checklist || []);
      
      if (task.dueDate) {
        const formattedDate = new Date(task.dueDate).toISOString().split('T')[0];
        setTaskData(prev => ({ ...prev, dueDate: formattedDate }));
      }
    } else {
      setTaskData(null);
    }
    setEditMode(false);
    setError(null);
    setActiveTab('details');
  }, [task]);

  if (!show) return null;

  if (!taskData) {
    return (
      <Modal show={show} onHide={onHide} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Задача не найдена</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Alert variant="warning">
            Задача не найдена или была удалена.
          </Alert>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onHide}>
            Закрыть
          </Button>
        </Modal.Footer>
      </Modal>
    );
  }

  const isCreator = taskData.creator?._id === user?._id;
  const isOwner = project.owner?._id === user?._id;
  const isAdmin = project.members?.some(member => 
    member.user?._id === user?._id && member.role === 'admin'
  );
  const canEdit = isCreator || isOwner || isAdmin;
  const isAssignee = taskData.assignee?._id === user?._id;

  const handleUpdateTask = async () => {
    if (!taskData || !taskData._id) return;
    
    try {
      setError(null);
      await dispatch(updateTask({
        taskId: taskData._id,
        taskData: {
          title: taskData.title,
          description: taskData.description,
          status: taskData.status,
          priority: taskData.priority,
          assignee: taskData.assignee?._id || null,
          dueDate: taskData.dueDate || null,
          labels: taskData.labels || []
        }
      })).unwrap();
      setEditMode(false);
    } catch (error) {
      setError(error.message || 'Ошибка обновления задачи');
    }
  };

  const handleDeleteTask = async () => {
    if (!taskData || !taskData._id) return;
    
    if (window.confirm('Вы уверены, что хотите удалить эту задачу?')) {
      try {
        await dispatch(deleteTask(taskData._id)).unwrap();
        onHide();
      } catch (error) {
        setError(error.message || 'Ошибка удаления задачи');
      }
    }
  };

  const handleAddChecklistItem = () => {
    if (!newChecklistItem.trim()) return;
    
    const newItem = {
      _id: Date.now().toString(),
      text: newChecklistItem.trim(),
      completed: false,
      createdAt: new Date()
    };
    
    setChecklistItems([...checklistItems, newItem]);
    setNewChecklistItem('');
  };

  const handleToggleChecklistItem = (itemId) => {
    setChecklistItems(items =>
      items.map(item =>
        item._id === itemId
          ? { ...item, completed: !item.completed }
          : item
      )
    );
  };

  const handleRemoveChecklistItem = (itemId) => {
    setChecklistItems(items => items.filter(item => item._id !== itemId));
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

  const getStatusVariant = (status) => {
    switch (status) {
      case 'Done': return 'success';
      case 'In Progress': return 'primary';
      case 'Review': return 'info';
      case 'To Do': return 'secondary';
      case 'Backlog': return 'dark';
      default: return 'secondary';
    }
  };

  const isOverdue = taskData.dueDate && 
    new Date(taskData.dueDate) < new Date() && 
    taskData.status !== 'Done';

  const columns = project.settings?.columns || ['To Do', 'In Progress', 'Done'];
  const members = project.members || [];

  const completedChecklistItems = checklistItems.filter(item => item.completed).length;
  const checklistProgress = checklistItems.length > 0 
    ? (completedChecklistItems / checklistItems.length) * 100 
    : 0;

  return (
    <Modal show={show} onHide={onHide} size="xl" backdrop="static">
      <Modal.Header closeButton className="border-bottom-0 pb-0">
        {editMode ? (
          <Form.Control
            type="text"
            value={taskData.title || ''}
            onChange={(e) => setTaskData({...taskData, title: e.target.value})}
            placeholder="Название задачи"
            className="fs-5 fw-bold"
          />
        ) : (
          <Modal.Title className="fs-5">
            {taskData.title || 'Без названия'}
            {isOverdue && (
              <Badge bg="danger" className="ms-2">
                Просрочено
              </Badge>
            )}
          </Modal.Title>
        )}
      </Modal.Header>
      
      <Modal.Body className="pt-0">
        {error && <Alert variant="danger" onClose={() => setError(null)} dismissible>{error}</Alert>}
        
        <Tabs
          activeKey={activeTab}
          onSelect={(k) => setActiveTab(k)}
          className="mb-3"
        >
          <Tab eventKey="details" title="Детали">
            <Row>
              <Col lg={8}>
                <div className="mb-4">
                  <h6>Описание</h6>
                  {editMode ? (
                    <Form.Control
                      as="textarea"
                      rows={6}
                      value={taskData.description || ''}
                      onChange={(e) => setTaskData({...taskData, description: e.target.value})}
                      placeholder="Подробное описание задачи..."
                      className="mb-3"
                    />
                  ) : (
                    <Card>
                      <Card.Body>
                        {taskData.description || (
                          <span className="text-muted fst-italic">
                            Описание отсутствует
                          </span>
                        )}
                      </Card.Body>
                    </Card>
                  )}
                </div>
              </Col>
              
              <Col lg={4}>
                <Card className="sticky-top" style={{ top: '20px' }}>
                  <Card.Body>
                    <h6 className="mb-3">Информация о задаче</h6>
                    
                    <div className="mb-3">
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <strong className="text-muted">Статус</strong>
                        {editMode ? (
                          <Form.Select
                            value={taskData.status || ''}
                            onChange={(e) => setTaskData({...taskData, status: e.target.value})}
                            size="sm"
                            style={{ width: '60%' }}
                          >
                            {columns.map(column => (
                              <option key={column} value={column}>{column}</option>
                            ))}
                          </Form.Select>
                        ) : (
                          <Badge bg={getStatusVariant(taskData.status)}>
                            {taskData.status || 'Не указан'}
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    <div className="mb-3">
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <strong className="text-muted">Приоритет</strong>
                        {editMode ? (
                          <Form.Select
                            value={taskData.priority || 'medium'}
                            onChange={(e) => setTaskData({...taskData, priority: e.target.value})}
                            size="sm"
                            style={{ width: '60%' }}
                          >
                            <option value="low">Низкий</option>
                            <option value="medium">Средний</option>
                            <option value="high">Высокий</option>
                            <option value="critical">Критический</option>
                          </Form.Select>
                        ) : (
                          <Badge bg={getPriorityVariant(taskData.priority)}>
                            {getPriorityText(taskData.priority)}
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    <div className="mb-3">
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <strong className="text-muted">Исполнитель</strong>
                        {editMode ? (
                          <Form.Select
                            value={taskData.assignee?._id || ''}
                            onChange={(e) => {
                              const assigneeId = e.target.value;
                              const assignee = members.find(m => m.user._id === assigneeId)?.user;
                              setTaskData({...taskData, assignee: assignee || null});
                            }}
                            size="sm"
                            style={{ width: '60%' }}
                          >
                            <option value="">Не назначен</option>
                            {members.map(member => (
                              <option key={member.user._id} value={member.user._id}>
                                {member.user.name}
                              </option>
                            ))}
                          </Form.Select>
                        ) : taskData.assignee ? (
                          <div className="d-flex align-items-center">
                            {taskData.assignee.avatar ? (
                              <img 
                                src={`/uploads/avatars/${taskData.assignee.avatar}`}
                                alt={taskData.assignee.name}
                                className="rounded-circle me-2"
                                style={{ width: '24px', height: '24px' }}
                              />
                            ) : (
                              <div className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center me-2"
                                style={{ width: '24px', height: '24px', fontSize: '12px' }}>
                                {taskData.assignee.name?.charAt(0)}
                              </div>
                            )}
                            <span>{taskData.assignee.name}</span>
                          </div>
                        ) : (
                          <span className="text-muted">Не назначен</span>
                        )}
                      </div>
                    </div>
                    
                    <div className="mb-3">
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <strong className="text-muted">Срок выполнения</strong>
                        {editMode ? (
                          <Form.Control
                            type="date"
                            value={taskData.dueDate || ''}
                            onChange={(e) => setTaskData({...taskData, dueDate: e.target.value})}
                            size="sm"
                            style={{ width: '60%' }}
                          />
                        ) : taskData.dueDate ? (
                          <div className={`d-flex align-items-center ${isOverdue ? 'text-danger' : ''}`}>
                            <i className="bi bi-calendar3 me-1"></i>
                            <span>
                              {format(new Date(taskData.dueDate), 'dd MMM yyyy', { locale: ru })}
                            </span>
                            {isOverdue && (
                              <i className="bi bi-exclamation-triangle ms-1"></i>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted">Не указан</span>
                        )}
                      </div>
                    </div>
                    
                    <div className="mb-3">
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <strong className="text-muted">Создатель</strong>
                        <div className="d-flex align-items-center">
                          {taskData.creator?.avatar ? (
                            <img 
                              src={`/uploads/avatars/${taskData.creator.avatar}`}
                              alt={taskData.creator.name}
                              className="rounded-circle me-2"
                              style={{ width: '24px', height: '24px' }}
                            />
                          ) : (
                            <div className="bg-secondary text-white rounded-circle d-flex align-items-center justify-content-center me-2"
                              style={{ width: '24px', height: '24px', fontSize: '12px' }}>
                              {taskData.creator?.name?.charAt(0)}
                            </div>
                          )}
                          <span>{taskData.creator?.name || 'Неизвестно'}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mb-3">
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <strong className="text-muted">Создана</strong>
                        <span>
                          {taskData.createdAt ? 
                            format(new Date(taskData.createdAt), 'dd MMM yyyy', { locale: ru }) : 
                            'Неизвестно'}
                        </span>
                      </div>
                    </div>
                    
                    <div className="mb-3">
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <strong className="text-muted">Обновлена</strong>
                        <span>
                          {taskData.updatedAt ? 
                            format(new Date(taskData.updatedAt), 'dd MMM yyyy', { locale: ru }) : 
                            'Неизвестно'}
                        </span>
                      </div>
                    </div>
                    
                    <div className="mb-3">
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <strong className="text-muted">Чеклист</strong>
                        <small>
                          {completedChecklistItems}/{checklistItems.length}
                        </small>
                      </div>
                      {checklistItems.length > 0 && (
                        <ProgressBar 
                          now={checklistProgress} 
                          label={`${checklistProgress.toFixed(0)}%`}
                          className="mb-2"
                        />
                      )}
                      <div className="mb-2">
                        <InputGroup size="sm">
                          <Form.Control
                            value={newChecklistItem}
                            onChange={(e) => setNewChecklistItem(e.target.value)}
                            placeholder="Добавить пункт чеклиста..."
                            onKeyPress={(e) => e.key === 'Enter' && handleAddChecklistItem()}
                          />
                          <Button 
                            variant="outline-secondary"
                            onClick={handleAddChecklistItem}
                          >
                            <i className="bi bi-plus"></i>
                          </Button>
                        </InputGroup>
                      </div>
                      <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                        {checklistItems.map((item) => (
                          <div key={item._id} className="d-flex align-items-center mb-2">
                            <Form.Check
                              type="checkbox"
                              checked={item.completed}
                              onChange={() => handleToggleChecklistItem(item._id)}
                              className="me-2"
                            />
                            <span 
                              style={{
                                textDecoration: item.completed ? 'line-through' : 'none',
                                flex: 1
                              }}
                            >
                              {item.text}
                            </span>
                            <Button
                              variant="link"
                              size="sm"
                              onClick={() => handleRemoveChecklistItem(item._id)}
                              className="text-danger p-0 ms-2"
                            >
                              <i className="bi bi-x"></i>
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {taskData.labels && taskData.labels.length > 0 && (
                      <div className="mb-3">
                        <strong className="text-muted d-block mb-2">Метки</strong>
                        <div className="d-flex flex-wrap gap-1">
                          {taskData.labels.map((label, index) => (
                            <Badge key={index} bg="info" className="me-1 mb-1">
                              {label}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {(taskData.estimatedHours || taskData.actualHours) && (
                      <div className="mb-3">
                        <strong className="text-muted d-block mb-2">Время</strong>
                        <div className="small">
                          <div className="d-flex justify-content-between">
                            <span>Оценка:</span>
                            <span>{taskData.estimatedHours || 0} ч</span>
                          </div>
                          <div className="d-flex justify-content-between">
                            <span>Затрачено:</span>
                            <span>{taskData.actualHours || 0} ч</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          </Tab>
          
          <Tab eventKey="comments" title="Комментарии">
            <TaskComments 
              task={taskData}
              project={project}
            />
          </Tab>
          
          <Tab eventKey="activity" title="Активность">
            <Card>
              <Card.Body>
                <h6>История активности</h6>
                {taskData.activityLog && taskData.activityLog.length > 0 ? (
                  <ListGroup variant="flush">
                    {[...(taskData.activityLog || [])]
                      .sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0))
                      .map((log, index) => (
                      <ListGroup.Item key={index}>
                        <div className="d-flex align-items-center">
                          <div className="me-3">
                            {log.type === 'created' && '🆕'}
                            {log.type === 'updated' && '✏️'}
                            {log.type === 'status_changed' && '🔄'}
                            {log.type === 'assigned' && '👤'}
                            {log.type === 'commented' && '💬'}
                            {log.type === 'attachment_added' && '📎'}
                          </div>
                          <div className="flex-grow-1">
                            <div>
                              {log.type === 'status_changed' && (
                                <>
                                  <strong>Статус изменен</strong> с "{log.details?.oldValue || 'Неизвестно'}" на "{log.details?.newValue || 'Неизвестно'}"
                                </>
                              )}
                              {log.type === 'assigned' && (
                                <>
                                  <strong>Исполнитель изменен</strong>
                                </>
                              )}
                              {log.type === 'created' && (
                                <>
                                  <strong>Задача создана</strong>
                                </>
                              )}
                              {log.type === 'commented' && (
                                <>
                                  <strong>Добавлен комментарий</strong>
                                </>
                              )}
                            </div>
                            <small className="text-muted">
                              {log.timestamp ? 
                                format(new Date(log.timestamp), 'dd MMM yyyy HH:mm', { locale: ru }) : 
                                'Неизвестно'}
                            </small>
                          </div>
                        </div>
                      </ListGroup.Item>
                    ))}
                  </ListGroup>
                ) : (
                  <div className="text-center text-muted py-4">
                    <i className="bi bi-clock-history fs-1"></i>
                    <p className="mt-2">История активности отсутствует</p>
                  </div>
                )}
              </Card.Body>
            </Card>
          </Tab>
        </Tabs>
      </Modal.Body>
      
      <Modal.Footer className="border-top-0">
        <div className="d-flex justify-content-between w-100 align-items-center">
          <div>
            {canEdit && (
              <>
                {editMode ? (
                  <ButtonGroup>
                    <Button 
                      variant="success" 
                      onClick={handleUpdateTask}
                      disabled={operationLoading}
                    >
                      {operationLoading ? (
                        <>
                          <Spinner size="sm" className="me-2" />
                          Сохранение...
                        </>
                      ) : 'Сохранить'}
                    </Button>
                    <Button 
                      variant="secondary" 
                      onClick={() => {
                        setTaskData(task);
                        setEditMode(false);
                      }}
                    >
                      Отмена
                    </Button>
                  </ButtonGroup>
                ) : (
                  <ButtonGroup>
                    <Button 
                      variant="outline-primary" 
                      onClick={() => setEditMode(true)}
                    >
                      <i className="bi bi-pencil me-1"></i>
                      Редактировать
                    </Button>
                    <Button 
                      variant="outline-danger" 
                      onClick={handleDeleteTask}
                    >
                      <i className="bi bi-trash me-1"></i>
                      Удалить
                    </Button>
                  </ButtonGroup>
                )}
              </>
            )}
          </div>
          
          <div>
            <Button variant="outline-secondary" onClick={onHide} className="me-2">
              Закрыть
            </Button>
            <Button variant="primary" onClick={onHide}>
              Готово
            </Button>
          </div>
        </div>
      </Modal.Footer>
    </Modal>
  );
};

export default TaskDetailModal;