import React from 'react';
import { Container, Row, Col, Card, Button } from 'react-bootstrap';
import { Link } from 'react-router-dom';

const HomePage = () => {
  return (
    <Container className="py-4">
      <Row className="text-center mb-4">
        <Col>
          <h1 className="display-5 fw-bold mb-3">
            Добро пожаловать в <span className="text-primary">TaskFlow</span>
          </h1>
          <p className="lead text-muted mb-4">
            Современная система управления проектами и задачами для команд любой величины
          </p>
          <div className="d-flex flex-column flex-md-row justify-content-center gap-3">
            <Link to="/register">
              <Button variant="primary" size="lg" className="px-4 py-2 fw-semibold">
                Начать бесплатно
              </Button>
            </Link>
            <Link to="/login">
              <Button variant="outline-primary" size="lg" className="px-4 py-2 fw-semibold">
                Войти в систему
              </Button>
            </Link>
          </div>
        </Col>
      </Row>

      <Row className="g-4">
        <Col md={4}>
          <Card className="h-100 shadow-sm border-0">
            <Card.Body className="text-center p-4">
              <div className="fs-1 mb-3">📋</div>
              <Card.Title className="h5 fw-bold mb-3">Управление задачами</Card.Title>
              <Card.Text className="text-muted">
                Создавайте, назначайте и отслеживайте задачи с помощью интуитивных Kanban досок
              </Card.Text>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="h-100 shadow-sm border-0">
            <Card.Body className="text-center p-4">
              <div className="fs-1 mb-3">👥</div>
              <Card.Title className="h5 fw-bold mb-3">Командная работа</Card.Title>
              <Card.Text className="text-muted">
                Приглашайте участников, распределяйте роли и работайте вместе над проектами
              </Card.Text>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="h-100 shadow-sm border-0">
            <Card.Body className="text-center p-4">
              <div className="fs-1 mb-3">📊</div>
              <Card.Title className="h5 fw-bold mb-3">Аналитика</Card.Title>
              <Card.Text className="text-muted">
                Получайте детальные отчеты и аналитику по прогрессу ваших проектов
              </Card.Text>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default HomePage;
