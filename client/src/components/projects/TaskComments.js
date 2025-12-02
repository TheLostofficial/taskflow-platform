import React, { useState, useEffect, useRef } from 'react';
import { Card, Form, Button, Alert, Spinner, Badge, Modal, Dropdown } from 'react-bootstrap';
import { useSelector } from 'react-redux';
import { commentService } from '../../services/commentService';

const TaskComments = ({ task, project, onCommentAdded, onCommentDeleted }) => {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [newComment, setNewComment] = useState('');
  const [editingComment, setEditingComment] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [commentToDelete, setCommentToDelete] = useState(null);
  
  const { user } = useSelector(state => state.auth);
  const fileInputRef = useRef(null);

  const isTaskCreator = task.creator?._id === user?._id;
  const isProjectOwner = project.owner?._id === user?._id;
  const canComment = project.members?.some(member => 
    member.user?._id === user?._id && 
    (member.role === 'owner' || member.role === 'admin' || member.role === 'member')
  );

  useEffect(() => {
    if (task._id && canComment) {
      fetchComments();
    }
  }, [task._id, canComment]);

  const fetchComments = async () => {
    try {
      setLoading(true);
      const data = await commentService.getTaskComments(task._id);
      setComments(data.comments || []);
    } catch (error) {
      setError('Ошибка загрузки комментариев');
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim() && attachments.length === 0) return;

    setSending(true);
    setError('');

    try {
      await commentService.addComment(task._id, {
        content: newComment.trim(),
        attachments: attachments
      });

      setNewComment('');
      setAttachments([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      setSuccess('Комментарий добавлен');
      setTimeout(() => setSuccess(''), 3000);
      
      fetchComments();
      
      if (onCommentAdded) {
        onCommentAdded();
      }
    } catch (error) {
      setError(error.message || 'Ошибка добавления комментария');
    } finally {
      setSending(false);
    }
  };

  const handleUpdateComment = async (commentId) => {
    if (!editContent.trim()) return;

    try {
      await commentService.updateComment(task._id, commentId, {
        content: editContent.trim()
      });

      setEditingComment(null);
      setEditContent('');
      setSuccess('Комментарий обновлен');
      setTimeout(() => setSuccess(''), 3000);
      
      fetchComments();
    } catch (error) {
      setError(error.message || 'Ошибка обновления комментария');
    }
  };

  const handleDeleteComment = async () => {
    if (!commentToDelete) return;

    try {
      await commentService.deleteComment(task._id, commentToDelete);
      
      setShowDeleteModal(false);
      setCommentToDelete(null);
      setSuccess('Комментарий удален');
      setTimeout(() => setSuccess(''), 3000);
      
      fetchComments();
      
      if (onCommentDeleted) {
        onCommentDeleted();
      }
    } catch (error) {
      setError(error.message || 'Ошибка удаления комментария');
    }
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    
    const oversizedFiles = files.filter(file => file.size > 10 * 1024 * 1024);
    if (oversizedFiles.length > 0) {
      setError('Некоторые файлы превышают максимальный размер 10MB');
      return;
    }

    if (attachments.length + files.length > 5) {
      setError('Максимальное количество файлов - 5');
      return;
    }

    setAttachments(prev => [...prev, ...files]);
  };

  const removeAttachment = (index) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const downloadAttachment = async (commentId, filename, originalName) => {
    try {
      const response = await commentService.downloadAttachment(task._id, commentId, filename);
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', originalName || filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      setError('Ошибка скачивания файла');
    }
  };

  const canEditComment = (commentAuthorId) => {
    return commentAuthorId === user?._id || isProjectOwner;
  };

  const canDeleteComment = (commentAuthorId) => {
    return commentAuthorId === user?._id || isProjectOwner || isTaskCreator;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'только что';
    if (diffMins < 60) return `${diffMins} мин. назад`;
    if (diffHours < 24) return `${diffHours} ч. назад`;
    if (diffDays < 7) return `${diffDays} дн. назад`;
    
    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!canComment) {
    return (
      <Card className="mt-3">
        <Card.Body className="text-center">
          <p className="text-muted mb-0">Вы не можете оставлять комментарии к этой задаче</p>
        </Card.Body>
      </Card>
    );
  }

  return (
    <div className="mt-4">
      <h5>Комментарии ({comments.length})</h5>

      {error && <Alert variant="danger">{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}

      {/* Форма добавления комментария */}
      <Card className="mb-4">
        <Card.Body>
          <Form onSubmit={handleAddComment}>
            <Form.Group className="mb-3">
              <Form.Label>Новый комментарий</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Напишите комментарий..."
                disabled={sending}
              />
            </Form.Group>

            {/* Вложения */}
            {attachments.length > 0 && (
              <div className="mb-3">
                <small className="text-muted d-block mb-2">Прикрепленные файлы:</small>
                {attachments.map((file, index) => (
                  <div key={index} className="d-flex align-items-center mb-2">
                    <Badge bg="light" text="dark" className="me-2">
                      {commentService.getFileIcon(file.name)} {commentService.formatFileSize(file.size)}
                    </Badge>
                    <small className="flex-grow-1 text-truncate">{file.name}</small>
                    <Button
                      variant="link"
                      size="sm"
                      className="text-danger"
                      onClick={() => removeAttachment(index)}
                    >
                      ✕
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <div className="d-flex justify-content-between align-items-center">
              <div>
                <Button
                  variant="outline-secondary"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  type="button"
                >
                  📎 Прикрепить файл
                </Button>
                <Form.Control
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  multiple
                  accept="image/*,.pdf,.doc,.docx,.txt,.xls,.xlsx,.zip,.rar"
                  className="d-none"
                />
              </div>

              <Button
                variant="primary"
                type="submit"
                disabled={sending || (!newComment.trim() && attachments.length === 0)}
              >
                {sending ? (
                  <>
                    <Spinner animation="border" size="sm" className="me-2" />
                    Отправка...
                  </>
                ) : (
                  'Отправить'
                )}
              </Button>
            </div>
          </Form>
        </Card.Body>
      </Card>

      {/* Список комментариев */}
      {loading ? (
        <div className="text-center py-4">
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Загрузка комментариев...</span>
          </Spinner>
        </div>
      ) : comments.length === 0 ? (
        <Card className="text-center py-5">
          <Card.Body>
            <p className="text-muted mb-0">Комментариев пока нет</p>
          </Card.Body>
        </Card>
      ) : (
        <div className="comment-list">
          {comments.map((comment) => (
            <Card key={comment._id} className="mb-3">
              <Card.Body>
                <div className="d-flex justify-content-between align-items-start mb-2">
                  <div className="d-flex align-items-center">
                    <div 
                      className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center me-2"
                      style={{ width: '32px', height: '32px', fontSize: '14px' }}
                    >
                      {comment.author?.name?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                    <div>
                      <div className="fw-medium">{comment.author?.name || 'Неизвестный'}</div>
                      <small className="text-muted">
                        {formatDate(comment.createdAt)}
                        {comment.isEdited && (
                          <span className="ms-2" title={`Отредактировано: ${new Date(comment.editedAt).toLocaleString('ru-RU')}`}>
                            (ред.)
                          </span>
                        )}
                      </small>
                    </div>
                  </div>

                  {/* Меню действий для комментария */}
                  {(canEditComment(comment.author?._id) || canDeleteComment(comment.author?._id)) && (
                    <Dropdown>
                      <Dropdown.Toggle variant="link" size="sm" className="text-muted">
                        ⋮
                      </Dropdown.Toggle>
                      <Dropdown.Menu>
                        {canEditComment(comment.author?._id) && (
                          <Dropdown.Item onClick={() => {
                            setEditingComment(comment._id);
                            setEditContent(comment.content);
                          }}>
                            Редактировать
                          </Dropdown.Item>
                        )}
                        {canDeleteComment(comment.author?._id) && (
                          <Dropdown.Item 
                            className="text-danger"
                            onClick={() => {
                              setCommentToDelete(comment._id);
                              setShowDeleteModal(true);
                            }}
                          >
                            Удалить
                          </Dropdown.Item>
                        )}
                      </Dropdown.Menu>
                    </Dropdown>
                  )}
                </div>

                {/* Редактирование комментария */}
                {editingComment === comment._id ? (
                  <div className="mb-3">
                    <Form.Control
                      as="textarea"
                      rows={3}
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="mb-2"
                    />
                    <div className="d-flex gap-2">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleUpdateComment(comment._id)}
                      >
                        Сохранить
                      </Button>
                      <Button
                        variant="outline-secondary"
                        size="sm"
                        onClick={() => {
                          setEditingComment(null);
                          setEditContent('');
                        }}
                      >
                        Отмена
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="mb-2">{comment.content}</p>

                    {/* Вложения комментария */}
                    {comment.attachments && comment.attachments.length > 0 && (
                      <div className="mt-3">
                        <small className="text-muted d-block mb-2">Вложения:</small>
                        <div className="d-flex flex-wrap gap-2">
                          {comment.attachments.map((attachment, index) => (
                            <div
                              key={index}
                              className="border rounded p-2 d-flex align-items-center"
                              style={{ cursor: 'pointer' }}
                              onClick={() => downloadAttachment(comment._id, attachment.filename, attachment.originalName)}
                              title={`${attachment.originalName} (${commentService.formatFileSize(attachment.size)})`}
                            >
                              <span className="me-2">{commentService.getFileIcon(attachment.originalName)}</span>
                              <div className="text-truncate" style={{ maxWidth: '150px' }}>
                                <small>{attachment.originalName}</small>
                              </div>
                              <Badge bg="light" text="dark" className="ms-2">
                                {commentService.formatFileSize(attachment.size)}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </Card.Body>
            </Card>
          ))}
        </div>
      )}

      {/* Модальное окно удаления комментария */}
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Подтверждение удаления</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Вы уверены, что хотите удалить этот комментарий? Это действие нельзя отменить.
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
            Отмена
          </Button>
          <Button variant="danger" onClick={handleDeleteComment}>
            Удалить
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default TaskComments;