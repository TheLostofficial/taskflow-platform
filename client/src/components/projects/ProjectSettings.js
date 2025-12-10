import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Form, Button, Alert, Tabs, Tab, Badge, Spinner, Modal } from 'react-bootstrap';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { updateProject, deleteProject, archiveProject, updateMemberRole } from '../../store/slices/projectsSlice';
import ProjectInvites from './ProjectInvites';
import exportService from '../../services/exportService';

const ProjectSettings = ({ project, onUpdate }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('general');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [selectedRole, setSelectedRole] = useState('member');

  const { items: tasks = [] } = useSelector(state => state.tasks || { items: [] });
  const { user } = useSelector(state => state.auth || {});

  const [generalSettings, setGeneralSettings] = useState({
    name: project.name || '',
    description: project.description || '',
    tags: project.tags ? project.tags.join(', ') : '',
    isPublic: project.settings?.isPublic || false
  });

  const [templateSettings, setTemplateSettings] = useState({
    template: project.settings?.template || 'kanban',
    columns: project.settings?.columns ? project.settings.columns.join('\n') : 'To Do\nIn Progress\nDone'
  });

  const [dangerSettings, setDangerSettings] = useState({
    confirmDelete: ''
  });

  const isOwner = project.owner?._id === user?._id;
  const isAdmin = project.members?.some(member => 
    member.user?._id === user?._id && 
    (member.role === 'owner' || member.role === 'admin')
  );

  useEffect(() => {
    if (project) {
      setGeneralSettings({
        name: project.name || '',
        description: project.description || '',
        tags: project.tags ? project.tags.join(', ') : '',
        isPublic: project.settings?.isPublic || false
      });
      
      setTemplateSettings({
        template: project.settings?.template || 'kanban',
        columns: project.settings?.columns ? project.settings.columns.join('\n') : 'To Do\nIn Progress\nDone'
      });
    }
  }, [project]);

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
    if (!project?._id) return;
    
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
            ...project.settings,
            isPublic: generalSettings.isPublic
          }
        }
      })).unwrap();

      showMessage('Настройки успешно сохранены');
      if (onUpdate) onUpdate();
    } catch (error) {
      showMessage(error.message || 'Ошибка сохранения настроек', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleTemplateSave = async (e) => {
    e.preventDefault();
    if (!project?._id) return;
    
    setLoading(true);

    try {
      const columnsArray = templateSettings.columns.split('\n').map(col => col.trim()).filter(col => col);
      
      await dispatch(updateProject({
        projectId: project._id,
        projectData: {
          settings: {
            ...project.settings,
            template: templateSettings.template,
            columns: columnsArray
          }
        }
      })).unwrap();

      showMessage('Настройки шаблона сохранены');
      if (onUpdate) onUpdate();
    } catch (error) {
      showMessage(error.message || 'Ошибка сохранения настроек шаблона', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleArchiveProject = async () => {
    if (!project?._id) return;
    
    if (window.confirm('Вы уверены, что хотите архивировать проект?')) {
      try {
        await dispatch(archiveProject(project._id)).unwrap();
        showMessage('Проект архивирован');
        if (onUpdate) onUpdate();
      } catch (error) {
        showMessage(error.message || 'Ошибка архивирования проекта', 'error');
      }
    }
  };

  const handleActivateProject = async () => {
    if (!project?._id) return;
    
    try {
      await dispatch(archiveProject(project._id)).unwrap();
      showMessage('Проект активирован');
      if (onUpdate) onUpdate();
    } catch (error) {
      showMessage(error.message || 'Ошибка активации проекта', 'error');
    }
  };

  const handleDeleteProject = async () => {
    if (!project?._id) return;
    
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

  const handleExportCSV = () => {
    try {
      if (!tasks.length) {
        showMessage('Нет задач для экспорта', 'error');
        return;
      }
      exportService.exportTasksToCSV(tasks, project.name);
      showMessage('Задачи экспортированы в CSV');
    } catch (error) {
      showMessage(error.message || 'Ошибка при экспорте', 'error');
    }
  };

  const handleExportJSON = () => {
    try {
      if (!tasks.length) {
        showMessage('Нет задач для экспорта', 'error');
        return;
      }
      exportService.exportTasksToJSON(tasks, project.name);
      showMessage('Задачи экспортированы в JSON');
    } catch (error) {
      showMessage(error.message || 'Ошибка при экспорте', 'error');
    }
  };

  const handleExportFullProject = () => {
    try {
      exportService.exportProjectData(project, tasks);
      showMessage('Полный экспорт проекта завершен');
    } catch (error) {
      showMessage(error.message || 'Ошибка при экспорте', 'error');
    }
  };

  const handleOpenRoleModal = (member) => {
    setSelectedMember(member);
    setSelectedRole(member.role);
    setShowRoleModal(true);
  };

  const handleUpdateRole = async () => {
    if (!selectedMember || !project?._id) return;
    
    try {
      await dispatch(updateMemberRole({
        projectId: project._id,
        userId: selectedMember.user._id,
        role: selectedRole
      })).unwrap();
      
      showMessage('Роль участника обновлена');
      setShowRoleModal(false);
      if (onUpdate) onUpdate();
    } catch (error) {
      showMessage(error.message || 'Ошибка обновления роли', 'error');
    }
  };

  const getTemplateDescription = (template) => {
    switch (template) {
      case 'kanban': return 'Простая доска с колонками "To Do", "In Progress", "Done"';
      case 'scrum': return 'Для agile-команд со спринтами и планированием';
      case 'custom': return 'Произвольная структура колонок';
      default: return '';
    }
  };

  const getDefaultColumns = (template) => {
    switch (template) {
      case 'scrum': return 'Backlog\nSprint Planning\nIn Progress\nReview\nDone';
      case 'kanban': return 'To Do\nIn Progress\nDone';
      default: return 'To Do\nIn Progress\nDone';
    }
  };

  const handleTemplateChange = (template) => {
    setTemplateSettings({
      template,
      columns: getDefaultColumns(template)
    });
  };

  if (!project || !project._id) {
    return (
      <Alert variant="warning">
        Проект не загружен
      </Alert>
    );
  }

  return (
    <div>
      {error && <Alert variant="danger" onClose={() => setError('')} dismissible>{error}</Alert>}
      {success && <Alert variant="success" onClose={() => setSuccess('')} dismissible>{success}</Alert>}

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
                  {loading ? (
                    <>
                      <Spinner size="sm" className="me-2" />
                      Сохранение...
                    </>
                  ) : 'Сохранить настройки'}
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
                        onChange={(e) => handleTemplateChange(e.target.value)}
                      >
                        <option value="kanban">Kanban доска</option>
                        <option value="scrum">Scrum</option>
                        <option value="custom">Произвольный</option>
                      </Form.Select>
                      <Form.Text className="text-muted">
                        {getTemplateDescription(templateSettings.template)}
                      </Form.Text>
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
                  {loading ? (
                    <>
                      <Spinner size="sm" className="me-2" />
                      Сохранение...
                    </>
                  ) : 'Сохранить шаблон'}
                </Button>
              </Form>
            </Card.Body>
          </Card>
        </Tab>

        <Tab eventKey="members" title="Участники и роли">
          <Card>
            <Card.Header>
              <h5 className="mb-0">Управление участниками проекта</h5>
            </Card.Header>
            <Card.Body>
              {project.members && project.members.length > 0 ? (
                <table className="table table-hover">
                  <thead>
                    <tr>
                      <th>Участник</th>
                      <th>Роль</th>
                      <th>Дата присоединения</th>
                      <th>Действия</th>
                    </tr>
                  </thead>
                  <tbody>
                    {project.members.map((member, index) => (
                      <tr key={index}>
                        <td>
                          <div className="d-flex align-items-center">
                            {member.user?.avatar ? (
                              <img 
                                src={member.user.avatar} 
                                alt={member.user.name}
                                className="rounded-circle me-2"
                                width="32"
                                height="32"
                              />
                            ) : (
                              <div className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center me-2"
                                style={{ width: '32px', height: '32px' }}>
                                {member.user?.name?.charAt(0) || 'U'}
                              </div>
                            )}
                            <div>
                              <div className="fw-bold">{member.user?.name || 'Неизвестно'}</div>
                              <small className="text-muted">{member.user?.email || ''}</small>
                            </div>
                          </div>
                        </td>
                        <td>
                          <Badge 
                            bg={member.role === 'owner' ? 'primary' : 
                                member.role === 'admin' ? 'warning' : 
                                member.role === 'member' ? 'info' : 'secondary'}
                            className="text-capitalize"
                          >
                            {member.role === 'owner' ? 'Владелец' :
                             member.role === 'admin' ? 'Администратор' :
                             member.role === 'member' ? 'Участник' : 'Наблюдатель'}
                          </Badge>
                        </td>
                        <td>
                          {member.joinedAt ? new Date(member.joinedAt).toLocaleDateString('ru-RU') : 'Неизвестно'}
                        </td>
                        <td>
                          {isOwner && member.role !== 'owner' && (
                            <Button
                              variant="outline-primary"
                              size="sm"
                              onClick={() => handleOpenRoleModal(member)}
                            >
                              Изменить роль
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <Alert variant="info">
                  В проекте нет участников
                </Alert>
              )}
              
              <div className="mt-3">
                <h6>Описание ролей:</h6>
                <ul className="text-muted">
                  <li><strong>Владелец</strong> - полный доступ ко всем функциям, может удалять проект</li>
                  <li><strong>Администратор</strong> - может управлять участниками и настройками</li>
                  <li><strong>Участник</strong> - может создавать и редактировать задачи</li>
                  <li><strong>Наблюдатель</strong> - только просмотр, без возможности редактирования</li>
                </ul>
              </div>
            </Card.Body>
          </Card>
        </Tab>

        <Tab eventKey="invites" title="Приглашения">
          <ProjectInvites 
            project={project} 
            isOwner={isOwner} 
            isAdmin={isAdmin} 
            onUpdate={onUpdate}
          />
        </Tab>

        <Tab eventKey="export" title="Экспорт данных">
          <Card>
            <Card.Header>
              <h5 className="mb-0">Экспорт данных проекта</h5>
            </Card.Header>
            <Card.Body>
              <div className="mb-4">
                <h6>Экспорт задач</h6>
                <p className="text-muted">
                  Скачайте задачи проекта в различных форматах для анализа или резервного копирования.
                </p>
                <div className="d-flex flex-wrap gap-2 mb-3">
                  <Button 
                    variant="outline-success"
                    onClick={handleExportCSV}
                    disabled={!tasks.length}
                  >
                    📊 Экспорт задач (CSV)
                  </Button>
                  <Button 
                    variant="outline-primary"
                    onClick={handleExportJSON}
                    disabled={!tasks.length}
                  >
                    📋 Экспорт задач (JSON)
                  </Button>
                </div>
                {!tasks.length && (
                  <Alert variant="info" className="mt-2">
                    Нет задач для экспорта
                  </Alert>
                )}
                {tasks.length > 0 && (
                  <p className="text-muted small">
                    Будет экспортировано {tasks.length} задач
                  </p>
                )}
              </div>

              <div className="mb-4">
                <h6>Полный экспорт проекта</h6>
                <p className="text-muted">
                  Экспортируйте все данные проекта включая настройки, участников и задачи.
                </p>
                <Button 
                  variant="outline-info"
                  onClick={handleExportFullProject}
                >
                  📦 Полный экспорт проекта (JSON)
                </Button>
              </div>

              <div className="mt-4">
                <h6>Информация о проекте</h6>
                <table className="table table-sm">
                  <tbody>
                    <tr>
                      <td><strong>Всего задач:</strong></td>
                      <td>{tasks.length}</td>
                    </tr>
                    <tr>
                      <td><strong>Участников:</strong></td>
                      <td>{project.members?.length || 0}</td>
                    </tr>
                    <tr>
                      <td><strong>Дата создания:</strong></td>
                      <td>{new Date(project.createdAt).toLocaleDateString('ru-RU')}</td>
                    </tr>
                    <tr>
                      <td><strong>Статус:</strong></td>
                      <td className="text-capitalize">
                        <Badge bg={project.status === 'active' ? 'success' : 
                                 project.status === 'archived' ? 'secondary' : 'info'}>
                          {project.status === 'active' ? 'активный' : 
                           project.status === 'archived' ? 'архивный' : 'завершенный'}
                        </Badge>
                      </td>
                    </tr>
                    <tr>
                      <td><strong>Шаблон:</strong></td>
                      <td>
                        <Badge bg="info">
                          {project.settings?.template === 'scrum' ? 'Скрам' : 
                           project.settings?.template === 'custom' ? 'Кастомный' : 'Канбан'}
                        </Badge>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </Card.Body>
          </Card>
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
                  disabled={loading}
                >
                  {project.status === 'archived' ? 'Восстановить проект' : 'Архивировать проект'}
                </Button>
              </div>

              <div className="mb-4">
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
                  disabled={dangerSettings.confirmDelete !== project.name || loading}
                  onClick={() => setShowDeleteModal(true)}
                >
                  Удалить проект навсегда
                </Button>
              </div>
            </Card.Body>
          </Card>
        </Tab>
      </Tabs>

      {/* Модальное окно удаления */}
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Подтверждение удаления</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Alert variant="danger">
            <strong>Внимание!</strong> Это действие нельзя отменить.
          </Alert>
          <p>Вы уверены, что хотите удалить проект <strong>"{project.name}"</strong>?</p>
          <p className="text-muted">
            Будут удалены все задачи, комментарии и данные проекта.
          </p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
            Отмена
          </Button>
          <Button variant="danger" onClick={handleDeleteProject} disabled={loading}>
            {loading ? (
              <>
                <Spinner size="sm" className="me-2" />
                Удаление...
              </>
            ) : 'Удалить проект'}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Модальное окно изменения роли */}
      <Modal show={showRoleModal} onHide={() => setShowRoleModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Изменение роли участника</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>
            Изменение роли для <strong>{selectedMember?.user?.name}</strong>
          </p>
          <Form.Group className="mb-3">
            <Form.Label>Выберите роль</Form.Label>
            <Form.Select 
              value={selectedRole} 
              onChange={(e) => setSelectedRole(e.target.value)}
            >
              <option value="admin">Администратор</option>
              <option value="member">Участник</option>
              <option value="viewer">Наблюдатель</option>
            </Form.Select>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowRoleModal(false)}>
            Отмена
          </Button>
          <Button variant="primary" onClick={handleUpdateRole} disabled={loading}>
            {loading ? (
              <>
                <Spinner size="sm" className="me-2" />
                Сохранение...
              </>
            ) : 'Сохранить'}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default ProjectSettings;