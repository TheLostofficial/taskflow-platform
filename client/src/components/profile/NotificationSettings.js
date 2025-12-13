import React, { useEffect } from 'react';
import { Form, Alert, Spinner } from 'react-bootstrap';
import { useDispatch, useSelector } from 'react-redux';
import { 
  getNotificationSettings, 
  updateNotificationSettings,
  clearError,
  clearSuccess
} from '../../store/slices/authSlice';

const NotificationSettings = () => {
  const dispatch = useDispatch();
  const { 
    notificationSettings, 
    notificationsLoading, 
    error, 
    success 
  } = useSelector(state => state.auth);

  useEffect(() => {
    dispatch(getNotificationSettings());
  }, [dispatch]);

  const handleChange = (key) => {
    if (!notificationSettings) return;
    
    const newSettings = {
      ...notificationSettings,
      [key]: !notificationSettings[key]
    };
    dispatch(updateNotificationSettings(newSettings));
  };

  if (notificationsLoading && !notificationSettings) {
    return (
      <div className="text-center py-3">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Загрузка...</span>
        </Spinner>
      </div>
    );
  }

  if (!notificationSettings) {
    return (
      <Alert variant="warning">
        Не удалось загрузить настройки уведомлений
      </Alert>
    );
  }

  return (
    <div>
      <h5>Настройки уведомлений</h5>
      
      {error && (
        <Alert variant="danger" onClose={() => dispatch(clearError())} dismissible>
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert variant="success" onClose={() => dispatch(clearSuccess())} dismissible>
          {success}
        </Alert>
      )}
      
      <Form>
        <Form.Group className="mb-3">
          <Form.Check
            type="switch"
            label="Email уведомления"
            checked={notificationSettings.emailNotifications || false}
            onChange={() => handleChange('emailNotifications')}
            disabled={notificationsLoading}
          />
          <Form.Text className="text-muted">
            Получать уведомления на email
          </Form.Text>
        </Form.Group>
        
        <Form.Group className="mb-3">
          <Form.Check
            type="switch"
            label="Назначение на задачи"
            checked={notificationSettings.taskAssignments || false}
            onChange={() => handleChange('taskAssignments')}
            disabled={notificationsLoading}
          />
          <Form.Text className="text-muted">
            Уведомлять при назначении на задачи
          </Form.Text>
        </Form.Group>
        
        <Form.Group className="mb-3">
          <Form.Check
            type="switch"
            label="Упоминания (@username)"
            checked={notificationSettings.mentions || false}
            onChange={() => handleChange('mentions')}
            disabled={notificationsLoading}
          />
          <Form.Text className="text-muted">
            Уведомлять при упоминании в комментариях
          </Form.Text>
        </Form.Group>
        
        <Form.Group className="mb-3">
          <Form.Check
            type="switch"
            label="Напоминания о сроках"
            checked={notificationSettings.deadlineReminders || false}
            onChange={() => handleChange('deadlineReminders')}
            disabled={notificationsLoading}
          />
          <Form.Text className="text-muted">
            Уведомлять о приближающихся сроках задач
          </Form.Text>
        </Form.Group>
        
        <Form.Group className="mb-4">
          <Form.Check
            type="switch"
            label="Обновления проектов"
            checked={notificationSettings.projectUpdates || false}
            onChange={() => handleChange('projectUpdates')}
            disabled={notificationsLoading}
          />
          <Form.Text className="text-muted">
            Уведомлять об изменениях в проектах
          </Form.Text>
        </Form.Group>
      </Form>
    </div>
  );
};

export default NotificationSettings;