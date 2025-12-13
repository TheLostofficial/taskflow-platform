import React from 'react';
import { Container, Row, Col, Card, Alert, Tabs, Tab, Button } from 'react-bootstrap'; // Button ДОБАВЛЕН ЗДЕСЬ
import { Link } from 'react-router-dom';
import PasswordChangeForm from '../components/profile/PasswordChangeForm';

const SettingsPage = () => {
  return (
    <Container className="py-4">
      <Row className="justify-content-center">
        <Col md={10} lg={8}>
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h3>Настройки безопасности</h3>
            <div className="d-flex gap-2">
              <Button as={Link} to="/profile" variant="outline-primary" size="sm">
                👤 Мой профиль
              </Button>
              <Button as={Link} to="/notifications" variant="outline-primary" size="sm">
                🔔 Настройки уведомлений
              </Button>
            </div>
          </div>

          <Tabs defaultActiveKey="password" className="mb-4">
            <Tab eventKey="password" title="🔒 Смена пароля">
              <Card className="shadow">
                <Card.Body className="p-4">
                  <PasswordChangeForm />
                </Card.Body>
              </Card>
            </Tab>
            
            <Tab eventKey="security" title="🛡️ Безопасность">
              <Card className="shadow">
                <Card.Body className="p-4">
                  <h5>Настройки безопасности</h5>
                  <p className="text-muted">Дополнительные настройки безопасности вашего аккаунта.</p>
                  
                  <div className="mt-4">
                    <h6>Двухфакторная аутентификация</h6>
                    <p className="text-muted">Включите двухфакторную аутентификацию для дополнительной безопасности.</p>
                    <div className="form-check form-switch">
                      <input className="form-check-input" type="checkbox" id="twoFactorSwitch" disabled />
                      <label className="form-check-label" htmlFor="twoFactorSwitch">
                        Включить 2FA (скоро)
                      </label>
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <h6>Сеансы входа</h6>
                    <p className="text-muted">Просмотрите и управляйте активными сеансами.</p>
                    <Alert variant="info">
                      <i className="bi bi-info-circle me-2"></i>
                      Функция просмотра активных сеансов скоро будет доступна.
                    </Alert>
                  </div>
                </Card.Body>
              </Card>
            </Tab>
            
            <Tab eventKey="privacy" title="👁️ Конфиденциальность">
              <Card className="shadow">
                <Card.Body className="p-4">
                  <h5>Настройки конфиденциальности</h5>
                  <p className="text-muted">Управление вашими данными и конфиденциальностью.</p>
                  
                  <div className="mt-4">
                    <h6>Видимость профиля</h6>
                    <p className="text-muted">Кто может видеть ваш профиль.</p>
                    <div className="form-check mb-2">
                      <input className="form-check-input" type="radio" name="visibility" id="visibilityPublic" defaultChecked />
                      <label className="form-check-label" htmlFor="visibilityPublic">
                        Публичный (все пользователи)
                      </label>
                    </div>
                    <div className="form-check">
                      <input className="form-check-input" type="radio" name="visibility" id="visibilityPrivate" />
                      <label className="form-check-label" htmlFor="visibilityPrivate">
                        Приватный (только участники проектов)
                      </label>
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <h6>Экспорт данных</h6>
                    <p className="text-muted">Загрузите копию всех ваших данных.</p>
                    <Button variant="outline-secondary" disabled>
                      <i className="bi bi-download me-2"></i>
                      Экспортировать мои данные (скоро)
                    </Button>
                  </div>
                </Card.Body>
              </Card>
            </Tab>
          </Tabs>
        </Col>
      </Row>
    </Container>
  );
};

export default SettingsPage;