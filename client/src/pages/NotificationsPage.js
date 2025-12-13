import React from 'react';
import { Container, Row, Col, Card, Alert, Button, Tabs, Tab, Form } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { getNotificationSettings, updateNotificationSettings } from '../store/slices/authSlice'; // ПРАВИЛЬНЫЙ ПУТЬ

const NotificationsPage = () => {
  const dispatch = useDispatch();
  const { notificationSettings, notificationsLoading, error, success } = useSelector(state => state.auth);

  const handleNotificationChange = (key) => {
    const newSettings = {
      ...notificationSettings,
      [key]: !notificationSettings[key]
    };
    dispatch(updateNotificationSettings(newSettings));
  };

  return (
    <Container className="py-4">
      <Row className="justify-content-center">
        <Col md={10} lg={8}>
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h3>Уведомления</h3>
            <div className="d-flex gap-2">
              <Button as={Link} to="/profile" variant="outline-primary" size="sm">
                👤 Мой профиль
              </Button>
              <Button as={Link} to="/settings" variant="outline-primary" size="sm">
                ⚙️ Настройки
              </Button>
            </div>
          </div>

          {error && (
            <Alert variant="danger" dismissible className="mb-4">
              {error}
            </Alert>
          )}
          
          {success && (
            <Alert variant="success" dismissible className="mb-4">
              {success}
            </Alert>
          )}

          <Tabs defaultActiveKey="email" className="mb-4">
            <Tab eventKey="email" title="📧 Email уведомления">
              <Card className="shadow">
                <Card.Body className="p-4">
                  <h5 className="mb-4">Настройки email уведомлений</h5>
                  
                  <Form>
                    <Form.Group className="mb-3">
                      <Form.Check
                        type="switch"
                        label="Общие уведомления"
                        checked={notificationSettings.emailNotifications}
                        onChange={() => handleNotificationChange('emailNotifications')}
                        disabled={notificationsLoading}
                      />
                      <Form.Text className="text-muted">
                        Получать общие уведомления о деятельности в проектах
                      </Form.Text>
                    </Form.Group>
                    
                    <Form.Group className="mb-3">
                      <Form.Check
                        type="switch"
                        label="Назначение на задачи"
                        checked={notificationSettings.taskAssignments}
                        onChange={() => handleNotificationChange('taskAssignments')}
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
                        checked={notificationSettings.mentions}
                        onChange={() => handleNotificationChange('mentions')}
                        disabled={notificationsLoading}
                      />
                      <Form.Text className="text-muted">
                        Уведомлять при упоминании в комментариях и обсуждениях
                      </Form.Text>
                    </Form.Group>
                    
                    <Form.Group className="mb-3">
                      <Form.Check
                        type="switch"
                        label="Напоминания о сроках"
                        checked={notificationSettings.deadlineReminders}
                        onChange={() => handleNotificationChange('deadlineReminders')}
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
                        checked={notificationSettings.projectUpdates}
                        onChange={() => handleNotificationChange('projectUpdates')}
                        disabled={notificationsLoading}
                      />
                      <Form.Text className="text-muted">
                        Уведомлять об изменениях в проектах
                      </Form.Text>
                    </Form.Group>
                    
                    <Alert variant="info">
                      <i className="bi bi-info-circle me-2"></i>
                      Изменения сохраняются автоматически
                    </Alert>
                  </Form>
                </Card.Body>
              </Card>
            </Tab>
            
            <Tab eventKey="push" title="📱 Push уведомления">
              <Card className="shadow">
                <Card.Body className="p-4">
                  <h5 className="mb-4">Push уведомления в браузере</h5>
                  
                  <Alert variant="warning">
                    <i className="bi bi-exclamation-triangle me-2"></i>
                    Для работы push уведомлений необходимо разрешить их в настройках браузера.
                  </Alert>
                  
                  <div className="mt-4">
                    <h6>Типы push уведомлений</h6>
                    
                    <Form>
                      <Form.Group className="mb-3">
                        <Form.Check
                          type="switch"
                          label="Новые сообщения"
                          defaultChecked
                          disabled
                        />
                        <Form.Text className="text-muted">
                          Уведомлять о новых сообщениях в чатах
                        </Form.Text>
                      </Form.Group>
                      
                      <Form.Group className="mb-3">
                        <Form.Check
                          type="switch"
                          label="Изменения в задачах"
                          defaultChecked
                          disabled
                        />
                        <Form.Text className="text-muted">
                          Уведомлять об изменениях в ваших задачах
                        </Form.Text>
                      </Form.Group>
                      
                      <Form.Group className="mb-3">
                        <Form.Check
                          type="switch"
                          label="Приглашения в проекты"
                          defaultChecked
                          disabled
                        />
                        <Form.Text className="text-muted">
                          Уведомлять о новых приглашениях
                        </Form.Text>
                      </Form.Group>
                    </Form>
                  </div>
                  
                  <div className="mt-4">
                    <Button variant="primary" disabled>
                      <i className="bi bi-bell me-2"></i>
                      Запросить разрешение на уведомления
                    </Button>
                  </div>
                </Card.Body>
              </Card>
            </Tab>
            
            <Tab eventKey="schedule" title="⏰ Расписание уведомлений">
              <Card className="shadow">
                <Card.Body className="p-4">
                  <h5 className="mb-4">Расписание получения уведомлений</h5>
                  
                  <Form>
                    <Form.Group className="mb-3">
                      <Form.Label>Время отправки ежедневного дайджеста</Form.Label>
                      <Form.Select defaultValue="18:00">
                        <option value="09:00">09:00</option>
                        <option value="12:00">12:00</option>
                        <option value="15:00">15:00</option>
                        <option value="18:00">18:00</option>
                        <option value="21:00">21:00</option>
                      </Form.Select>
                      <Form.Text className="text-muted">
                        Время для получения ежедневного сводного email
                      </Form.Text>
                    </Form.Group>
                    
                    <Form.Group className="mb-3">
                      <Form.Label>Тишина в нерабочее время</Form.Label>
                      <Form.Select defaultValue="22:00-08:00">
                        <option value="none">Не отключать</option>
                        <option value="22:00-08:00">22:00 - 08:00</option>
                        <option value="23:00-07:00">23:00 - 07:00</option>
                        <option value="00:00-09:00">00:00 - 09:00</option>
                      </Form.Select>
                      <Form.Text className="text-muted">
                        В это время не будут отправляться push уведомления
                      </Form.Text>
                    </Form.Group>
                    
                    <Form.Group className="mb-4">
                      <Form.Check
                        type="checkbox"
                        label="Не отправлять уведомления в выходные"
                        defaultChecked
                      />
                    </Form.Group>
                    
                    <Button variant="primary" disabled={notificationsLoading}>
                      {notificationsLoading ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                          Сохранение...
                        </>
                      ) : (
                        'Сохранить расписание'
                      )}
                    </Button>
                  </Form>
                </Card.Body>
              </Card>
            </Tab>
          </Tabs>
        </Col>
      </Row>
    </Container>
  );
};

export default NotificationsPage;