import React, { useState } from 'react';
import { Row, Col, Card, ListGroup, Button, Modal, Form, Alert, Badge, Dropdown } from 'react-bootstrap';
import { Link } from 'react-router-dom';

const ProjectMembers = ({ project, isOwner, isAdmin }) => {
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const canManageMembers = isOwner || isAdmin;

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      console.log('Inviting:', inviteEmail, 'as', inviteRole);
      
      setTimeout(() => {
        setInviteEmail('');
        setInviteRole('member');
        setShowInviteModal(false);
        setLoading(false);
        setSuccess('Приглашение отправлено на ' + inviteEmail);
        setTimeout(() => setSuccess(''), 5000);
      }, 1000);
    } catch (error) {
      setError('Ошибка при отправке приглашения');
      setLoading(false);
    }
  };

  const handleRemoveMember = (memberId) => {
    if (window.confirm('Вы уверены, что хотите удалить участника из проекта?')) {
      console.log('Removing member:', memberId);
      setSuccess('Участник удален из проекта');
      setTimeout(() => setSuccess(''), 3000);
    }
  };

  const handleChangeRole = (memberId, newRole) => {
    console.log('Changing role for:', memberId, 'to', newRole);
    setSuccess('Роль участника обновлена');
    setTimeout(() => setSuccess(''), 3000);
  };

  const getRoleBadgeVariant = (role) => {
    switch (role) {
      case 'owner': return 'primary';
      case 'admin': return 'warning';
      case 'member': return 'success';
      case 'viewer': return 'secondary';
      default: return 'light';
    }
  };

  const getRoleDisplayName = (role) => {
    switch (role) {
      case 'owner': return 'Владелец';
      case 'admin': return 'Администратор';
      case 'member': return 'Участник';
      case 'viewer': return 'Наблюдатель';
      default: return role;
    }
  };

  const getPermissionsDescription = (role) => {
    switch (role) {
      case 'owner': return 'Полный доступ ко всем функциям';
      case 'admin': return 'Может управлять участниками и настройками';
      case 'member': return 'Может создавать и редактировать задачи';
      case 'viewer': return 'Только просмотр проекта';
      default: return '';
    }
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h5>Участники проекта ({project.members?.length || 0})</h5>
        <div className="d-flex gap-2">
          {canManageMembers && (
            <>
              <Button 
                variant="outline-primary" 
                size="sm"
                onClick={() => setShowInviteModal(true)}
              >
                + Пригласить по email
              </Button>
              <Link to={`/projects/${project._id}`} state={{ activeTab: 'settings' }}>
                <Button variant="primary" size="sm">
                  Управление инвайтами
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>

      {error && <Alert variant="danger">{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}

      <Row>
        <Col md={8}>
          <Card>
            <Card.Header>
              <strong>Список участников</strong>
            </Card.Header>
            <ListGroup variant="flush">
              {project.members?.map((member) => (
                <ListGroup.Item key={member.user?._id || member.user} className="d-flex justify-content-between align-items-center">
                  <div className="d-flex align-items-center">
                    <div 
                      className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center me-3"
                      style={{ width: '40px', height: '40px', fontSize: '16px' }}
                    >
                      {member.user?.name?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                    <div>
                      <div className="fw-medium">{member.user?.name || 'Неизвестный пользователь'}</div>
                      <div className="text-muted small">{member.user?.email || 'Нет email'}</div>
                      <div className="small">
                        <Badge bg={getRoleBadgeVariant(member.role)}>
                          {getRoleDisplayName(member.role)}
                        </Badge>
                        <span className="text-muted ms-2">
                          присоединился {new Date(member.joinedAt).toLocaleDateString('ru-RU')}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="d-flex align-items-center">
                    {canManageMembers && member.role !== 'owner' && (
                      <Dropdown>
                        <Dropdown.Toggle variant="outline-secondary" size="sm" id="member-actions">
                          Действия
                        </Dropdown.Toggle>
                        <Dropdown.Menu>
                          <Dropdown.Header>Изменить роль</Dropdown.Header>
                          {['admin', 'member', 'viewer'].map(role => (
                            <Dropdown.Item 
                              key={role}
                              onClick={() => handleChangeRole(member.user?._id || member.user, role)}
                              disabled={member.role === role}
                            >
                              {getRoleDisplayName(role)}
                            </Dropdown.Item>
                          ))}
                          <Dropdown.Divider />
                          <Dropdown.Item 
                            className="text-danger"
                            onClick={() => handleRemoveMember(member.user?._id || member.user)}
                          >
                            Удалить из проекта
                          </Dropdown.Item>
                        </Dropdown.Menu>
                      </Dropdown>
                    )}
                  </div>
                </ListGroup.Item>
              ))}
            </ListGroup>
          </Card>
        </Col>

        <Col md={4}>
          <Card>
            <Card.Header>
              <strong>Роли и права</strong>
            </Card.Header>
            <Card.Body>
              {[
                { role: 'owner', name: 'Владелец' },
                { role: 'admin', name: 'Администратор' },
                { role: 'member', name: 'Участник' },
                { role: 'viewer', name: 'Наблюдатель' }
              ].map(roleInfo => (
                <div key={roleInfo.role} className="mb-3">
                  <div className="d-flex align-items-center mb-1">
                    <Badge bg={getRoleBadgeVariant(roleInfo.role)} className="me-2">
                      {roleInfo.name}
                    </Badge>
                    <small className="text-muted">
                      {project.members?.filter(m => m.role === roleInfo.role).length || 0} чел.
                    </small>
                  </div>
                  <small className="text-muted">
                    {getPermissionsDescription(roleInfo.role)}
                  </small>
                </div>
              ))}
            </Card.Body>
          </Card>

          {project.settings?.isPublic && project.settings?.publicInviteCode && (
            <Card className="mt-3">
              <Card.Header>
                <strong>Публичная ссылка</strong>
              </Card.Header>
              <Card.Body>
                <p className="small text-muted mb-2">
                  Поделитесь этой ссылкой для приглашения в проект:
                </p>
                <Form.Group>
                  <Form.Control
                    type="text"
                    value={`${window.location.origin}/invite/${project.settings.publicInviteCode}`}
                    readOnly
                    className="small"
                  />
                </Form.Group>
                <Button 
                  variant="outline-primary" 
                  size="sm" 
                  className="mt-2"
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/invite/${project.settings.publicInviteCode}`);
                    setSuccess('Ссылка скопирована в буфер обмена');
                    setTimeout(() => setSuccess(''), 3000);
                  }}
                >
                  Копировать ссылку
                </Button>
              </Card.Body>
            </Card>
          )}
        </Col>
      </Row>

      {/* Модальное окно приглашения по email */}
      <Modal show={showInviteModal} onHide={() => setShowInviteModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Пригласить участника по email</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleInvite}>
          <Modal.Body>
            {error && <Alert variant="danger">{error}</Alert>}
            
            <Form.Group className="mb-3">
              <Form.Label>Email участника *</Form.Label>
              <Form.Control
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="example@email.com"
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Роль</Form.Label>
              <Form.Select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
              >
                <option value="member">Участник</option>
                <option value="admin">Администратор</option>
                <option value="viewer">Наблюдатель</option>
              </Form.Select>
              <Form.Text className="text-muted">
                {getPermissionsDescription(inviteRole)}
              </Form.Text>
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowInviteModal(false)}>
              Отмена
            </Button>
            <Button variant="primary" type="submit" disabled={loading}>
              {loading ? 'Отправка...' : 'Отправить приглашение'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
};

export default ProjectMembers;