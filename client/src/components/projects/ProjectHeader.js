import React, { useState } from 'react';
import { Row, Col, Badge, Button, Dropdown, Modal, Form, Alert } from 'react-bootstrap';
import { useSelector, useDispatch } from 'react-redux';
import { updateProject } from '../../store/slices/projectsSlice';
import { projectService } from '../../services/projectService';

const ProjectHeader = ({ project, user, onProjectUpdate }) => {
  const dispatch = useDispatch();
  const { operationLoading } = useSelector(state => state.projects);
  
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    name: project.name,
    description: project.description,
    status: project.status,
    tags: project.tags.join(', ')
  });
  const [editError, setEditError] = useState('');

  const isOwner = project.owner._id === user?._id;
  const isAdmin = project.members.some(member => 
    member.user._id === user?._id && 
    (member.role === 'owner' || member.role === 'admin')
  );

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setEditError('');

    try {
      const tagsArray = editForm.tags.split(',').map(tag => tag.trim()).filter(tag => tag);
      
      await dispatch(updateProject({
        projectId: project._id,
        projectData: {
          name: editForm.name,
          description: editForm.description,
          status: editForm.status,
          tags: tagsArray
        }
      })).unwrap();

      setShowEditModal(false);
      onProjectUpdate();
    } catch (error) {
      setEditError(error.message || 'Ошибка при обновлении проекта');
    }
  };

  const handleArchiveProject = async () => {
    if (window.confirm('Вы уверены, что хотите архивировать проект?')) {
      try {
        await dispatch(updateProject({
          projectId: project._id,
          projectData: { status: 'archived' }
        })).unwrap();
        onProjectUpdate();
      } catch (error) {
        console.error('Archive error:', error);
      }
    }
  };

  const handleActivateProject = async () => {
    try {
      await dispatch(updateProject({
        projectId: project._id,
        projectData: { status: 'active' }
      })).unwrap();
      onProjectUpdate();
    } catch (error) {
      console.error('Activate error:', error);
    }
  };

  const getStatusVariant = (status) => {
    switch (status) {
      case 'active': return 'success';
      case 'archived': return 'secondary';
      case 'completed': return 'primary';
      default: return 'light';
    }
  };

  const getTemplateBadge = (template) => {
    switch (template) {
      case 'kanban': return { text: 'Kanban', variant: 'info' };
      case 'scrum': return { text: 'Scrum', variant: 'warning' };
      case 'custom': return { text: 'Произвольный', variant: 'dark' };
      default: return { text: template, variant: 'light' };
    }
  };

  const templateBadge = getTemplateBadge(project.settings.template);

  return (
    <>
      <div className="bg-light rounded p-4 mb-4">
        <Row className="align-items-center">
          <Col md={8}>
            <div className="d-flex align-items-center gap-3 mb-2">
              <h1 className="h2 mb-0">{project.name}</h1>
              <Badge bg={getStatusVariant(project.status)} className="text-capitalize">
                {project.status === 'active' ? 'активный' : 
                 project.status === 'archived' ? 'архивный' : 'завершенный'}
              </Badge>
              <Badge bg={templateBadge.variant}>{templateBadge.text}</Badge>
              {project.settings.isPublic && (
                <Badge bg="success">Публичный</Badge>
              )}
            </div>
            
            {project.description && (
              <p className="text-muted mb-3">{project.description}</p>
            )}
            
            <div className="d-flex gap-3 text-muted small">
              <span>
                <strong>Владелец:</strong> {project.owner.name}
              </span>
              <span>
                <strong>Участников:</strong> {project.members.length}
              </span>
              <span>
                <strong>Создан:</strong> {new Date(project.createdAt).toLocaleDateString('ru-RU')}
              </span>
            </div>

            {project.tags.length > 0 && (
              <div className="mt-2">
                {project.tags.map((tag, index) => (
                  <Badge key={index} bg="outline-secondary" className="me-1" text="dark">
                    #{tag}
                  </Badge>
                ))}
              </div>
            )}
          </Col>

          <Col md={4} className="text-end">
            <div className="d-flex gap-2 justify-content-end">
              {(isOwner || isAdmin) && (
                <>
                  <Button 
                    variant="outline-primary" 
                    size="sm"
                    onClick={() => setShowEditModal(true)}
                    disabled={operationLoading}
                  >
                    Редактировать
                  </Button>
                  
                  <Dropdown>
                    <Dropdown.Toggle variant="outline-secondary" size="sm" id="project-actions">
                      Действия
                    </Dropdown.Toggle>
                    <Dropdown.Menu>
                      {project.status === 'active' ? (
                        <Dropdown.Item onClick={handleArchiveProject}>
                          Архивировать
                        </Dropdown.Item>
                      ) : (
                        <Dropdown.Item onClick={handleActivateProject}>
                          Активировать
                        </Dropdown.Item>
                      )}
                      {isOwner && (
                        <>
                          <Dropdown.Divider />
                          <Dropdown.Item className="text-danger">
                            Удалить проект
                          </Dropdown.Item>
                        </>
                      )}
                    </Dropdown.Menu>
                  </Dropdown>
                </>
              )}
            </div>
          </Col>
        </Row>
      </div>

      {/* Модальное окно редактирования */}
      <Modal show={showEditModal} onHide={() => setShowEditModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Редактировать проект</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleEditSubmit}>
          <Modal.Body>
            {editError && <Alert variant="danger">{editError}</Alert>}
            
            <Form.Group className="mb-3">
              <Form.Label>Название проекта *</Form.Label>
              <Form.Control
                type="text"
                value={editForm.name}
                onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Описание</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={editForm.description}
                onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Статус</Form.Label>
              <Form.Select
                value={editForm.status}
                onChange={(e) => setEditForm(prev => ({ ...prev, status: e.target.value }))}
              >
                <option value="active">Активный</option>
                <option value="archived">Архивный</option>
                <option value="completed">Завершенный</option>
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Теги (через запятую)</Form.Label>
              <Form.Control
                type="text"
                value={editForm.tags}
                onChange={(e) => setEditForm(prev => ({ ...prev, tags: e.target.value }))}
                placeholder="дизайн, разработка, тестирование"
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowEditModal(false)}>
              Отмена
            </Button>
            <Button variant="primary" type="submit" disabled={operationLoading}>
              {operationLoading ? 'Сохранение...' : 'Сохранить'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </>
  );
};

export default ProjectHeader;