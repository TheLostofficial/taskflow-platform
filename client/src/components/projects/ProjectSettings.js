import React, { useState } from 'react';
import { Row, Col, Card, Form, Button, Alert, Tabs, Tab, Badge } from 'react-bootstrap';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { updateProject, deleteProject } from '../../store/slices/projectsSlice';
import ProjectInvites from './ProjectInvites';

const ProjectSettings = ({ project }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('general');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [generalSettings, setGeneralSettings] = useState({
    name: project.name,
    description: project.description,
    tags: project.tags.join(', '),
    isPublic: project.settings.isPublic
  });

  const [templateSettings, setTemplateSettings] = useState({
    template: project.settings.template,
    columns: project.settings.columns.join('\n')
  });

  const [dangerSettings, setDangerSettings] = useState({
    confirmDelete: ''
  });

  const isOwner = project.owner._id === project.owner?._id || 
                  (project.members.some(member => 
                    member.user?._id === project.owner?._id && 
                    member.role === 'owner'));

  const isAdmin = project.members.some(member => 
    member.user?._id === project.owner?._id && 
    (member.role === 'owner' || member.role === 'admin')
  );

  const showMessage = (message, type = 'success') => {
    if (type === 'success') {
      setSuccess(message);
      setError('');
    } else {
      setError(message);
      setSuccess('');
    }
    setTimeout(() => {
      setSuccess('');
      setError('');
    }, 5000);
  };

  const handleGeneralSave = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const tagsArray = generalSettings.tags.split(',').map(tag => tag.trim()).filter(tag => tag);
      
      await dispatch(updateProject({
        projectId: project._id,
        projectData: {
          name: generalSettings.name,
          description: generalSettings.description,
          tags: tagsArray,
          settings: {
            isPublic: generalSettings.isPublic
          }
        }
      })).unwrap();

      showMessage('Настройки успешно сохранены');
    } catch (error) {
      showMessage(error.message || 'Ошибка сохранения настроек', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleTemplateSave = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const columnsArray = templateSettings.columns.split('\n').map(col => col.trim()).filter(col => col);
      
      await dispatch(updateProject({
        projectId: project._id,
        projectData: {
          settings: {
            template: templateSettings.template,
            columns: columnsArray
          }
        }
      })).unwrap();

      showMessage('Настройки шаблона сохранены');
    } catch (error) {
      showMessage(error.message || 'Ошибка сохранения настроек шаблона', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleArchiveProject = async () => {
    if (window.confirm('Вы уверены, что хотите архивировать проект?')) {
      try {
        await dispatch(updateProject({
          projectId: project._id,
          projectData: { status: 'archived' }
        })).unwrap();
        showMessage('Проект архивирован');
        navigate('/projects');
      } catch (error) {
        showMessage(error.message || 'Ошибка архивирования проекта', 'error');
      }
    }
  };

  const handleActivateProject = async () => {
    try {
      await dispatch(updateProject({
        projectId: project._id,
        projectData: { status: 'active' }
      })).unwrap();
      showMessage('Проект активирован');
    } catch (error) {
      showMessage(error.message || 'Ошибка активации проекта', 'error');
    }
  };

  const handleDeleteProject = async () => {
    if (dangerSettings.confirmDelete !== project.name) {
      showMessage('Введите название проекта для подтверждения удаления', 'error');
      return;
    }

    if (window.confirm('Вы уверены, что хотите удалить проект? Это действие нельзя отменить!')) {
      try {
        await dispatch(deleteProject(project._id)).unwrap();
        showMessage('Проект успешно удален');
        navigate('/projects');
      } catch (error) {
        showMessage(error.message || 'Ошибка при удалении проекта', 'error');
      }
    }
  };

  return (
    <div>
      {error && <Alert variant="danger">{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}

      <Tabs activeKey={activeTab} onSelect={setActiveTab} className="mb-4">
        <Tab eventKey="general" title="Общие настройки">
          <Card>
            <Card.Header>
              <h5 className="mb-0">Основные настройки проекта</h5>
            </Card.Header>
            <Card.Body>
              <Form onSubmit={handleGeneralSave}>
                <Row>
                  <Col md={8}>
                    <Form.Group className="mb-3">
                      <Form.Label>Название проекта *</Form.Label>
                      <Form.Control
                        type="text"
                        value={generalSettings.name}
                        onChange={(e) => setGeneralSettings(prev => ({ ...prev, name: e.target.value }))}
                        required
                      />
                    </Form.Group>

                    <Form.Group className="mb-3">
                      <Form.Label>Описание</Form.Label>
                      <Form.Control
                        as="textarea"
                        rows={3}
                        value={generalSettings.description}
                        onChange={(e) => setGeneralSettings(prev => ({ ...prev, description: e.target.value }))}
                      />
                    </Form.Group>

                    <Form.Group className="mb-3">
                      <Form.Label>Теги (через запятую)</Form.Label>
                      <Form.Control
                        type="text"
                        value={generalSettings.tags}
                        onChange={(e) => setGeneralSettings(prev => ({ ...prev, tags: e.target.value }))}
                        placeholder="дизайн, разработка, тестирование"
                      />
                    </Form.Group>

                    <Form.Group className="mb-3">
                      <Form.Check
                        type="checkbox"
                        label="Публичный проект"
                        checked={generalSettings.isPublic}
                        onChange={(e) => setGeneralSettings(prev => ({ ...prev, isPublic: e.target.checked }))}
                      />
                      <Form.Text className="text-muted">
                        Публичные проекты доступны по ссылке без регистрации
                      </Form.Text>
                    </Form.Group>
                  </Col>
                </Row>

                <Button variant="primary" type="submit" disabled={loading}>
                  {loading ? 'Сохранение...' : 'Сохранить настройки'}
                </Button>
              </Form>
            </Card.Body>
          </Card>
        </Tab>

        <Tab eventKey="template" title="Шаблон и колонки">
          <Card>
            <Card.Header>
              <h5 className="mb-0">Настройки рабочего процесса</h5>
            </Card.Header>
            <Card.Body>
              <Form onSubmit={handleTemplateSave}>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Шаблон проекта</Form.Label>
                      <Form.Select
                        value={templateSettings.template}
                        onChange={(e) => setTemplateSettings(prev => ({ ...prev, template: e.target.value }))}
                      >
                        <option value="kanban">Kanban доска</option>
                        <option value="scrum">Scrum</option>
                        <option value="custom">Произвольный</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                </Row>

                <Form.Group className="mb-4">
                  <Form.Label>Колонки проекта (по одной на строку)</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={5}
                    value={templateSettings.columns}
                    onChange={(e) => setTemplateSettings(prev => ({ ...prev, columns: e.target.value }))}
                    placeholder="To Do&#10;In Progress&#10;Done"
                  />
                  <Form.Text className="text-muted">
                    Каждая строка - отдельная колонка. Порядок имеет значение.
                  </Form.Text>
                </Form.Group>

                <div className="mb-4">
                  <h6>Предпросмотр колонок:</h6>
                  <div className="d-flex flex-wrap gap-2">
                    {templateSettings.columns.split('\n').map((column, index) => (
                      column.trim() && (
                        <Badge key={index} bg="outline-primary" text="dark" className="fs-6 p-2">
                          {column.trim()}
                        </Badge>
                      )
                    ))}
                  </div>
                </div>

                <Button variant="primary" type="submit" disabled={loading}>
                  {loading ? 'Сохранение...' : 'Сохранить шаблон'}
                </Button>
              </Form>
            </Card.Body>
          </Card>
        </Tab>

        <Tab eventKey="invites" title="Приглашения">
          <ProjectInvites 
            project={project} 
            isOwner={isOwner} 
            isAdmin={isAdmin} 
          />
        </Tab>

        <Tab eventKey="danger" title="Опасные настройки">
          <Card>
            <Card.Header className="bg-danger text-white">
              <h5 className="mb-0">Опасная зона</h5>
            </Card.Header>
            <Card.Body>
              <div className="mb-4">
                <h6>Архивировать проект</h6>
                <p className="text-muted">
                  Архивирование скроет проект из основного списка, но сохранит все данные.
                </p>
                <Button 
                  variant="outline-warning"
                  onClick={project.status === 'archived' ? handleActivateProject : handleArchiveProject}
                >
                  {project.status === 'archived' ? 'Восстановить проект' : 'Архивировать проект'}
                </Button>
              </div>

              <div className="mb-4">
                <h6>Экспорт данных</h6>
                <p className="text-muted">
                  Скачайте все данные проекта в формате JSON для резервного копирования.
                </p>
                <Button variant="outline-info">
                  Экспортировать данные
                </Button>
              </div>

              <div>
                <h6 className="text-danger">Удалить проект</h6>
                <p className="text-muted">
                  Это действие нельзя отменить. Все задачи, настройки и данные проекта будут удалены безвозвратно.
                </p>
                
                <Form.Group className="mb-3">
                  <Form.Label>
                    Для подтверждения введите название проекта: <strong>{project.name}</strong>
                  </Form.Label>
                  <Form.Control
                    type="text"
                    value={dangerSettings.confirmDelete}
                    onChange={(e) => setDangerSettings(prev => ({ ...prev, confirmDelete: e.target.value }))}
                    placeholder={`Введите "${project.name}" для подтверждения`}
                  />
                </Form.Group>

                <Button 
                  variant="danger" 
                  disabled={dangerSettings.confirmDelete !== project.name}
                  onClick={handleDeleteProject}
                >
                  Удалить проект навсегда
                </Button>
              </div>
            </Card.Body>
          </Card>
        </Tab>
      </Tabs>
    </div>
  );
};

export default ProjectSettings;