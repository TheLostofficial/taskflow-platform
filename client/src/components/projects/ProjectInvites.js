import React, { useState, useEffect } from 'react';
import { Card, Button, Table, Badge, Form, Modal, Alert, Spinner } from 'react-bootstrap';
import { inviteService } from '../../services/inviteService';

const ProjectInvites = ({ project, isOwner, isAdmin }) => {
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedInvite, setSelectedInvite] = useState(null);
  const [creating, setCreating] = useState(false);
  
  const [newInvite, setNewInvite] = useState({
    role: 'member',
    expiresInDays: 7,
    maxUses: '',
    note: ''
  });

  const canManageInvites = isOwner || isAdmin;

  useEffect(() => {
    if (project._id && canManageInvites) {
      fetchInvites();
    }
  }, [project._id, canManageInvites]);

  const fetchInvites = async () => {
    try {
      setLoading(true);
      const data = await inviteService.getProjectInvites(project._id);
      setInvites(data.invites || []);
    } catch (error) {
      setError('Ошибка загрузки инвайтов');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateInvite = async (e) => {
    e.preventDefault();
    setCreating(true);
    setError('');

    try {
      const inviteData = {
        role: newInvite.role,
        expiresInDays: parseInt(newInvite.expiresInDays),
        maxUses: newInvite.maxUses ? parseInt(newInvite.maxUses) : null,
        note: newInvite.note
      };

      const response = await inviteService.createInvite(project._id, inviteData);
      
      setInvites(prev => [response.invite, ...prev]);
      setShowCreateModal(false);
      setSuccess('Инвайт успешно создан!');
      setNewInvite({
        role: 'member',
        expiresInDays: 7,
        maxUses: '',
        note: ''
      });
      
      setTimeout(() => setSuccess(''), 5000);
    } catch (error) {
      setError(error.message || 'Ошибка создания инвайта');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteInvite = async () => {
    if (!selectedInvite) return;

    try {
      await inviteService.deleteInvite(project._id, selectedInvite.code);
      setInvites(prev => prev.filter(invite => invite.code !== selectedInvite.code));
      setShowDeleteModal(false);
      setSelectedInvite(null);
      setSuccess('Инвайт успешно удален');
      setTimeout(() => setSuccess(''), 5000);
    } catch (error) {
      setError('Ошибка удаления инвайта');
    }
  };

  const getStatusBadge = (invite) => {
    const now = new Date();
    const expiresAt = new Date(invite.expiresAt);

    if (!invite.isActive) {
      return <Badge bg="secondary">Деактивирован</Badge>;
    }

    if (expiresAt < now) {
      return <Badge bg="warning">Истёк</Badge>;
    }

    if (invite.maxUses !== null && invite.usedCount >= invite.maxUses) {
      return <Badge bg="danger">Лимит исчерпан</Badge>;
    }

    return <Badge bg="success">Активен</Badge>;
  };

  const getInviteUrl = (code) => {
    return `${window.location.origin}/invite/${code}`;
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      setSuccess('Ссылка скопирована в буфер обмена');
      setTimeout(() => setSuccess(''), 3000);
    });
  };

  if (loading) {
    return (
      <div className="text-center py-4">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Загрузка...</span>
        </Spinner>
      </div>
    );
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h5>Управление приглашениями</h5>
        {canManageInvites && (
          <Button 
            variant="primary" 
            size="sm"
            onClick={() => setShowCreateModal(true)}
          >
            + Создать инвайт
          </Button>
        )}
      </div>

      {error && <Alert variant="danger">{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}

      {invites.length === 0 ? (
        <Card className="text-center py-5">
          <Card.Body>
            <h5>Инвайты не найдены</h5>
            <p className="text-muted">Создайте первое приглашение для этого проекта</p>
            {canManageInvites && (
              <Button 
                variant="primary"
                onClick={() => setShowCreateModal(true)}
              >
                Создать первое приглашение
              </Button>
            )}
          </Card.Body>
        </Card>
      ) : (
        <Card>
          <Card.Body>
            <Table responsive hover>
              <thead>
                <tr>
                  <th>Код</th>
                  <th>Роль</th>
                  <th>Использовано</th>
                  <th>Статус</th>
                  <th>Действия</th>
                </tr>
              </thead>
              <tbody>
                {invites.map(invite => (
                  <tr key={invite.code}>
                    <td>
                      <code>{invite.code}</code>
                    </td>
                    <td>
                      <Badge bg={invite.role === 'admin' ? 'warning' : invite.role === 'member' ? 'info' : 'secondary'}>
                        {invite.role === 'admin' ? 'Администратор' : 
                         invite.role === 'member' ? 'Участник' : 'Наблюдатель'}
                      </Badge>
                    </td>
                    <td>
                      {invite.usedCount}
                      {invite.maxUses !== null && ` / ${invite.maxUses}`}
                    </td>
                    <td>
                      {getStatusBadge(invite)}
                    </td>
                    <td>
                      <Button
                        variant="outline-primary"
                        size="sm"
                        onClick={() => copyToClipboard(getInviteUrl(invite.code))}
                        className="me-2"
                      >
                        Копировать
                      </Button>
                      {canManageInvites && invite.isActive && (
                        <Button
                          variant="outline-danger"
                          size="sm"
                          onClick={() => {
                            setSelectedInvite(invite);
                            setShowDeleteModal(true);
                          }}
                        >
                          Удалить
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card.Body>
        </Card>
      )}

      {/* Модальное окно создания инвайта */}
      <Modal show={showCreateModal} onHide={() => setShowCreateModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Создать новое приглашение</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleCreateInvite}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Роль в проекте</Form.Label>
              <Form.Select
                value={newInvite.role}
                onChange={(e) => setNewInvite(prev => ({ ...prev, role: e.target.value }))}
              >
                <option value="admin">Администратор (полные права)</option>
                <option value="member">Участник (может создавать задачи)</option>
                <option value="viewer">Наблюдатель (только просмотр)</option>
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Срок действия (дней)</Form.Label>
              <Form.Control
                type="number"
                min="1"
                max="365"
                value={newInvite.expiresInDays}
                onChange={(e) => setNewInvite(prev => ({ ...prev, expiresInDays: e.target.value }))}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Лимит использований (оставьте пустым для безлимита)</Form.Label>
              <Form.Control
                type="number"
                min="1"
                placeholder="Например: 5"
                value={newInvite.maxUses}
                onChange={(e) => setNewInvite(prev => ({ ...prev, maxUses: e.target.value }))}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Примечание (опционально)</Form.Label>
              <Form.Control
                type="text"
                placeholder="Для команды разработки..."
                value={newInvite.note}
                onChange={(e) => setNewInvite(prev => ({ ...prev, note: e.target.value }))}
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowCreateModal(false)}>
              Отмена
            </Button>
            <Button variant="primary" type="submit" disabled={creating}>
              {creating ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  Создание...
                </>
              ) : 'Создать инвайт'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Модальное окно удаления инвайта */}
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Подтверждение удаления</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Вы уверены, что хотите удалить инвайт с кодом <code>{selectedInvite?.code}</code>?
          <p className="text-muted mt-2">
            Существующие участники, принявшие этот инвайт, останутся в проекте.
          </p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
            Отмена
          </Button>
          <Button variant="danger" onClick={handleDeleteInvite}>
            Удалить инвайт
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default ProjectInvites;