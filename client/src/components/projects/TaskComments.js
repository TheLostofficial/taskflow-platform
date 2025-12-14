import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, Form, Button, Alert, Spinner, Badge, Modal, Dropdown } from 'react-bootstrap';
import { useSelector } from 'react-redux';
import { commentService } from '../../services/commentService';
import { websocketService } from '../../services/websocket';

const TaskComments = ({ task, project }) => {
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
  
  const { user } = useSelector(state => state.auth || {});
  const fileInputRef = useRef(null);

  // Проверка существования задачи
  if (!task?._id) {
    return (
      <Alert variant="warning">
        Задача не загружена. Невозможно отобразить комментарии.
      </Alert>
    );
  }

  // Определение прав пользователя
  const isTaskCreator = task?.creator?._id === user?._id;
  const isProjectOwner = project?.owner?._id === user?._id;
  
  // Исправлено: правильное определение прав на комментарии
  const canComment = project?.members?.some(member => {
    const memberUserId = member.user?._id || member.user;
    return memberUserId === user?._id && 
           ['owner', 'admin', 'member'].includes(member.role);
  });

  // WebSocket подписки для real-time обновлений
  useEffect(() => {
    if (!task._id || !websocketService) return;

    const handleCommentAdded = (newComment) => {
      if (newComment.taskId === task._id) {
        setComments(prev => [newComment, ...prev]);
      }
    };

    const handleCommentUpdated = (updatedComment) => {
      if (updatedComment.taskId === task._id) {
        setComments(prev => prev.map(c => 
          c._id === updatedComment._id ? updatedComment : c
        ));
      }
    };

    const handleCommentDeleted = ({ taskId, commentId }) => {
      if (taskId === task._id) {
        setComments(prev => prev.filter(c => c._id !== commentId));
      }
    };

    websocketService.on('commentAdded', handleCommentAdded);
    websocketService.on('commentUpdated', handleCommentUpdated);
    websocketService.on('commentDeleted', handleCommentDeleted);

    return () => {
      websocketService.off('commentAdded', handleCommentAdded);
      websocketService.off('commentUpdated', handleCommentUpdated);
      websocketService.off('commentDeleted', handleCommentDeleted);
    };
  }, [task._id]);

  // Загрузка комментариев
  useEffect(() => {
    if (task._id && canComment) {
      fetchComments();
    }
  }, [task._id, canComment]);

  const fetchComments = useCallback(async () => {
    if (!task._id) return;
    
    try {
      setLoading(true);
      const data = await commentService.getTaskComments(task._id);
      // Сортируем по дате создания (новые сверху)
      const sortedComments = (data.comments || []).sort((a, b) => 
        new Date(b.createdAt) - new Date(a.createdAt)
      );
      setComments(sortedComments);
    } catch (error) {
      console.error('Error fetching comments:', error);
      setError('Ошибка загрузки комментариев');
    } finally {
      setLoading(false);
    }
  }, [task._id]);

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!task._id || !user?._id) {
      setError('Задача или пользователь не определены');
      return;
    }
    
    if (!newComment.trim() && attachments.length === 0) {
      setError('Введите текст комментария или прикрепите файл');
      return;
    }

    setSending(true);
    setError('');

    try {
      const commentData = {
        content: newComment.trim(),
        mentions: []
      };

      // Если есть вложения, используем FormData
      if (attachments.length > 0) {
        const formData = new FormData();
        formData.append('content', newComment.trim());
        
        attachments.forEach((file, index) => {
          formData.append('attachments', file);
        });

        await commentService.addComment(task._id, formData);
      } else {
        await commentService.addComment(task._id, commentData);
      }

      // Сброс формы
      setNewComment('');
      setAttachments([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      setSuccess('Комментарий добавлен');
      setTimeout(() => setSuccess(''), 3000);
      
    } catch (error) {
      console.error('Error adding comment:', error);
      setError(error.response?.data?.message || 'Ошибка добавления комментария');
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
      
    } catch (error) {
      console.error('Error updating comment:', error);
      setError(error.message || 'Ошибка обновления комментария');
    }
  };

  const handleDeleteComment = async () => {
    if (!commentToDelete || !task._id) return;

    try {
      await commentService.deleteComment(task._id, commentToDelete);
      
      setShowDeleteModal(false);
      setCommentToDelete(null);
      setSuccess('Комментарий удален');
      setTimeout(() => setSuccess(''), 3000);
      
    } catch (error) {
      console.error('Error deleting comment:', error);
      setError(error.message || 'Ошибка удаления комментария');
    }
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    
    // Проверка размера файлов (макс. 10MB)
    const oversizedFiles = files.filter(file => file.size > 10 * 1024 * 1024);
    if (oversizedFiles.length > 0) {
      setError('Некоторые файлы превышают максимальный размер 10MB');
      return;
    }

    // Проверка количества файлов (макс. 5)
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
      await commentService.downloadAttachment(task._id, commentId, filename, originalName);
    } catch (error) {
      console.error('Error downloading attachment:', error);
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
    try {
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
    } catch {
      return dateString;
    }
  };

  // Вспомогательные функции для работы с файлами
  const getFileIcon = (filename) => {
    const ext = filename.split('.').pop().toLowerCase();
    switch (ext) {
      case 'pdf': return '📕';
      case 'doc':
      case 'docx': return '📝';
      case 'xls':
      case 'xlsx': return '📊';
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif': return '🖼️';
      case 'zip':
      case 'rar': return '📦';
      case 'txt': return '📄';
      default: return '📎';
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Если пользователь не может комментировать
  if (!canComment) {
    return (
      <Card className="mt-3">
        <Card.Body className="text-center py-4">
          <p className="text-muted mb-2">
            {!user ? 'Войдите в систему, чтобы оставлять комментарии' : 'Вы не можете оставлять комментарии к этой задаче'}
          </p>
          {user && (
            <small className="text-muted">
              Требуется роль: владелец, администратор или участник проекта
            </small>
          )}
        </Card.Body>
      </Card>
    );
  }

  return (
    <div className="mt-4">
      <h5>Комментарии ({comments.length})</h5>

      {error && <Alert variant="danger" onClose={() => setError('')} dismissible>{error}</Alert>}
      {success && <Alert variant="success" onClose={() => setSuccess('')} dismissible>{success}</Alert>}

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
                  <div key={index} className="d-flex align-items-center mb-2 border rounded p-2">
                    <Badge bg="light" text="dark" className="me-2">
                      {getFileIcon(file.name)} {formatFileSize(file.size)}
                    </Badge>
                    <small className="flex-grow-1 text-truncate">{file.name}</small>
                    <Button
                      variant="link"
                      size="sm"
                      className="text-danger"
                      onClick={() => removeAttachment(index)}
                      disabled={sending}
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
                  disabled={sending}
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
                  disabled={sending}
                />
                <small className="text-muted ms-2">
                  Макс. 10MB, до 5 файлов
                </small>
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
          <p className="mt-2">Загрузка комментариев...</p>
        </div>
      ) : comments.length === 0 ? (
        <Card className="text-center py-5">
          <Card.Body>
            <p className="text-muted mb-0">Комментариев пока нет</p>
            <small className="text-muted">Будьте первым, кто оставит комментарий</small>
          </Card.Body>
        </Card>
      ) : (
        <div className="comment-list">
          {comments.map((comment) => (
            <Card key={comment._id} className="mb-3">
              <Card.Body>
                <div className="d-flex justify-content-between align-items-start mb-2">
                  <div className="d-flex align-items-center">
                    {comment.author?.avatar ? (
                      <img 
                        src={`/uploads/avatars/${comment.author.avatar}`}
                        alt={comment.author.name}
                        className="rounded-circle me-2"
                        style={{ width: '32px', height: '32px' }}
                      />
                    ) : (
                      <div 
                        className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center me-2"
                        style={{ width: '32px', height: '32px', fontSize: '14px' }}
                        title={comment.author?.name || 'Неизвестный'}
                      >
                        {comment.author?.name?.charAt(0)?.toUpperCase() || 'U'}
                      </div>
                    )}
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
                      <Dropdown.Toggle variant="link" size="sm" className="text-muted border-0 p-1">
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
                    <p className="mb-2" style={{ whiteSpace: 'pre-wrap' }}>{comment.content}</p>

                    {/* Вложения комментария */}
                    {comment.attachments && comment.attachments.length > 0 && (
                      <div className="mt-3">
                        <small className="text-muted d-block mb-2">Вложения:</small>
                        <div className="d-flex flex-wrap gap-2">
                          {comment.attachments.map((attachment, index) => (
                            <div
                              key={index}
                              className="border rounded p-2 d-flex align-items-center hover-shadow"
                              style={{ cursor: 'pointer', minWidth: '200px' }}
                              onClick={() => downloadAttachment(comment._id, attachment.filename, attachment.originalName)}
                              title={`Скачать: ${attachment.originalName} (${formatFileSize(attachment.size)})`}
                            >
                              <span className="me-2">{getFileIcon(attachment.originalName)}</span>
                              <div className="text-truncate" style={{ maxWidth: '150px' }}>
                                <small>{attachment.originalName}</small>
                              </div>
                              <Badge bg="light" text="dark" className="ms-2">
                                {formatFileSize(attachment.size)}
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
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Подтверждение удаления</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>Вы уверены, что хотите удалить этот комментарий?</p>
          <p className="text-muted small">Это действие нельзя отменить.</p>
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