import React, { useState, useEffect } from 'react';
import { 
  Modal, 
  Tab, 
  Nav, 
  Row, 
  Col, 
  Form, 
  Button, 
  Badge, 
  Alert, 
  Spinner
} from 'react-bootstrap';
import { useDispatch, useSelector } from 'react-redux';
import { updateTask } from '../../store/slices/tasksSlice';
import TaskComments from './TaskComments';

const TaskDetailModal = ({ show, onHide, task, project, onTaskUpdated, onTaskDeleted }) => {
  const dispatch = useDispatch();
  const { user } = useSelector(state => state.auth || {});
  const { operationLoading } = useSelector(state => state.tasks || {});
  
  const [activeTab, setActiveTab] = useState('details');
  const [editMode, setEditMode] = useState(false);
  const [taskData, setTaskData] = useState({});
  const [error, setError] = useState('');
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    if (show && task && task._id) {
      setShouldRender(true);
      setTaskData({
        title: task.title || '',
        description: task.description || '',
        status: task.status || 'To Do',
        priority: task.priority || 'medium',
        dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : ''
      });
    } else {
      setShouldRender(false);
    }
  }, [show, task]);

  if (!shouldRender) return null;

  const handleSaveTask = async (e) => {
    e.preventDefault();
    setError('');

    try {
      await dispatch(updateTask({
        taskId: task._id,
        taskData
      })).unwrap();

      setEditMode(false);
      if (onTaskUpdated) onTaskUpdated();
    } catch (error) {
      setError(error.message || 'Ошибка обновления задачи');
    }
  };

  const getPriorityVariant = (priority) => {
    switch (priority) {
      case 'low': return 'success';
      case 'medium': return 'warning';
      case 'high': return 'danger';
      default: return 'secondary';
    }
  };

  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Modal.Header closeButton>
        <Modal.Title>
          {editMode ? 'Редактирование задачи' : task.title}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Tab.Container activeKey={activeTab} onSelect={setActiveTab}>
          <Row>
            <Col sm={3}>
              <Nav variant="pills" className="flex-column">
                <Nav.Item>
                  <Nav.Link eventKey="details">📋 Детали</Nav.Link>
                </Nav.Item>
                <Nav.Item>
                  <Nav.Link eventKey="comments">💬 Комментарии</Nav.Link>
                </Nav.Item>
              </Nav>
            </Col>
            <Col sm={9}>
              <Tab.Content>
                <Tab.Pane eventKey="details">
                  {editMode ? (
                    <Form onSubmit={handleSaveTask}>
                      <Form.Group className="mb-3">
                        <Form.Label>Название задачи</Form.Label>
                        <Form.Control
                          value={taskData.title}
                          onChange={(e) => setTaskData({...taskData, title: e.target.value})}
                        />
                      </Form.Group>
                      
                      <Form.Group className="mb-3">
                        <Form.Label>Описание</Form.Label>
                        <Form.Control
                          as="textarea"
                          rows={3}
                          value={taskData.description}
                          onChange={(e) => setTaskData({...taskData, description: e.target.value})}
                        />
                      </Form.Group>
                      
                      <Button variant="primary" type="submit" disabled={operationLoading}>
                        {operationLoading ? <Spinner size="sm" /> : 'Сохранить'}
                      </Button>
                      <Button variant="secondary" className="ms-2" onClick={() => setEditMode(false)}>
                        Отмена
                      </Button>
                    </Form>
                  ) : (
                    <div>
                      <p><strong>Описание:</strong> {task.description || 'Нет описания'}</p>
                      <p><strong>Статус:</strong> <Badge bg="primary">{task.status}</Badge></p>
                      <p><strong>Приоритет:</strong> <Badge bg={getPriorityVariant(task.priority)}>{task.priority}</Badge></p>
                      {user?._id === task.creator?._id && (
                        <Button variant="outline-primary" onClick={() => setEditMode(true)}>
                          Редактировать
                        </Button>
                      )}
                    </div>
                  )}
                </Tab.Pane>
                
                <Tab.Pane eventKey="comments">
                  <TaskComments 
                    task={task} 
                    project={project}
                    onCommentAdded={() => onTaskUpdated && onTaskUpdated()}
                  />
                </Tab.Pane>
              </Tab.Content>
            </Col>
          </Row>
        </Tab.Container>
      </Modal.Body>
    </Modal>
  );
};

export default TaskDetailModal;