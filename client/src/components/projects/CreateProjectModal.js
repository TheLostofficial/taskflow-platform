import React, { useState } from 'react';
import { Modal, Button, Form, Alert, Spinner, Row, Col, Card } from 'react-bootstrap';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { createProject, resetCreateSuccess } from '../../store/slices/projectsSlice';

const CreateProjectModal = ({ show, onHide }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { createSuccess, loading: creating } = useSelector((state) => state.projects);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    isPublic: false,
    template: 'kanban', // kanban, scrum, custom
  });
  const [error, setError] = useState(null);
  const [localSuccess, setLocalSuccess] = useState(null);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  const handleTemplateSelect = (template) => {
    setFormData({
      ...formData,
      template
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      setError('Название проекта обязательно');
      return;
    }

    setError(null);
    setLocalSuccess(null);

    try {
      console.log('📝 Creating project with data:', formData);
      
      const result = await dispatch(createProject(formData)).unwrap();
      
      console.log('✅ Project created successfully:', result);
      
      const newProjectId = result.project?._id || result._id;
      
      if (newProjectId) {
        setLocalSuccess('Проект успешно создан! Перенаправление...');
        
        // Закрываем модальное окно и перенаправляем на страницу проекта
        setTimeout(() => {
          onHide();
          dispatch(resetCreateSuccess());
          navigate(`/projects/${newProjectId}`);
        }, 1500);
      } else {
        setLocalSuccess('Проект создан! Обновление списка...');
        setTimeout(() => {
          onHide();
          dispatch(resetCreateSuccess());
        }, 2000);
      }
      
      // Сбрасываем форму
      setFormData({ 
        name: '', 
        description: '', 
        isPublic: false,
        template: 'kanban'
      });
      
    } catch (err) {
      console.error('❌ Failed to create project:', err);
      
      if (err.includes('Network')) {
        setError('Ошибка подключения к серверу. Проверьте интернет-соединение.');
      } else {
        setError(err || 'Ошибка создания проекта');
      }
    }
  };

  const handleClose = () => {
    setFormData({ 
      name: '', 
      description: '', 
      isPublic: false,
      template: 'kanban'
    });
    setError(null);
    setLocalSuccess(null);
    dispatch(resetCreateSuccess());
    onHide();
  };

  const templates = [
    {
      id: 'kanban',
      name: 'Канбан',
      description: 'Простая доска с колонками "To Do", "In Progress", "Done"',
      icon: '📋',
      columns: ['To Do', 'In Progress', 'Done']
    },
    {
      id: 'scrum',
      name: 'Скрам',
      description: 'Для agile-команд с спринтами и планированием',
      icon: '🔄',
      columns: ['Backlog', 'Sprint Planning', 'In Progress', 'Review', 'Done']
    },
    {
      id: 'custom',
      name: 'Кастомный',
      description: 'Создайте свою собственную структуру',
      icon: '⚙️',
      columns: ['Настройте свои колонки']
    }
  ];

  return (
    <Modal show={show} onHide={handleClose} centered size="lg">
      <Modal.Header closeButton>
        <Modal.Title>Создать новый проект</Modal.Title>
      </Modal.Header>
      <Form onSubmit={handleSubmit}>
        <Modal.Body>
          {error && (
            <Alert variant="danger" onClose={() => setError(null)} dismissible>
              {error}
            </Alert>
          )}
          
          {(localSuccess || createSuccess) && (
            <Alert variant="success" onClose={() => {
              setLocalSuccess(null);
              dispatch(resetCreateSuccess());
            }} dismissible>
              {localSuccess || 'Проект успешно создан!'}
            </Alert>
          )}
          
          <Form.Group className="mb-3">
            <Form.Label>Название проекта *</Form.Label>
            <Form.Control
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Введите название проекта"
              required
              disabled={creating}
              autoFocus
            />
            <Form.Text className="text-muted">
              Например: "Разработка нового функционала"
            </Form.Text>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Описание</Form.Label>
            <Form.Control
              as="textarea"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Опишите цели и задачи проекта"
              rows={3}
              disabled={creating}
            />
            <Form.Text className="text-muted">
              Необязательное поле. Можно добавить позже.
            </Form.Text>
          </Form.Group>

          <Form.Group className="mb-4">
            <Form.Label className="mb-3">Шаблон проекта</Form.Label>
            <Row className="g-3">
              {templates.map((template) => (
                <Col key={template.id} md={4}>
                  <Card 
                    className={`h-100 cursor-pointer ${formData.template === template.id ? 'border-primary border-2' : ''}`}
                    onClick={() => handleTemplateSelect(template.id)}
                  >
                    <Card.Body className="text-center">
                      <div className="display-4 mb-2">{template.icon}</div>
                      <Card.Title>{template.name}</Card.Title>
                      <Card.Text className="small text-muted">
                        {template.description}
                      </Card.Text>
                      <div className="mt-2">
                        <small className="text-muted">
                          Колонки: {template.columns.join(', ')}
                        </small>
                      </div>
                    </Card.Body>
                    {formData.template === template.id && (
                      <Card.Footer className="text-center bg-primary text-white">
                        Выбран
                      </Card.Footer>
                    )}
                  </Card>
                </Col>
              ))}
            </Row>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Check
              type="checkbox"
              name="isPublic"
              label="Публичный проект"
              checked={formData.isPublic}
              onChange={handleChange}
              disabled={creating}
            />
            <Form.Text className="text-muted">
              Публичные проекты видны всем пользователям. Приватные проекты видны только участникам.
            </Form.Text>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleClose} disabled={creating}>
            Отмена
          </Button>
          <Button 
            variant="primary" 
            type="submit" 
            disabled={creating || !formData.name.trim()}
          >
            {creating ? (
              <>
                <Spinner
                  as="span"
                  animation="border"
                  size="sm"
                  role="status"
                  aria-hidden="true"
                  className="me-2"
                />
                Создание...
              </>
            ) : (
              'Создать проект'
            )}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default CreateProjectModal;
