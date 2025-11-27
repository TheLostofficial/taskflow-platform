// client/src/pages/HomePage.js
import React from 'react';
import { Container, Row, Col, Card, Button } from 'react-bootstrap';
import { LinkContainer } from 'react-router-bootstrap';

const HomePage = () => {
  return (
    <Container>
      <Row className="text-center mb-5">
        <Col>
          <h1 className="display-4 fw-bold mb-4">
            Добро пожаловать в <span className="text-primary">TaskFlow</span>
          </h1>
          <p className="lead text-muted">
            Современная система управления проектами и задачами для команд любой величины
          </p>
          <LinkContainer to="/register">
            <Button variant="primary" size="lg" className="me-3">
              Начать бесплатно
            </Button>
          </LinkContainer>
          <LinkContainer to="/login">
            <Button variant="outline-primary" size="lg">
              Войти в систему
            </Button>
          </LinkContainer>
        </Col>
      </Row>

      <Row className="g-4">
        <Col md={4}>
          <Card className="h-100 shadow-sm">
            <Card.Body className="text-center">
              <div className="fs-1 mb-3">📋</div>
              <Card.Title>Управление задачами</Card.Title>
              <Card.Text>
                Создавайте, назначайте и отслеживайте задачи с помощью интуитивных Kanban досок
              </Card.Text>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="h-100 shadow-sm">
            <Card.Body className="text-center">
              <div className="fs-1 mb-3">👥</div>
              <Card.Title>Командная работа</Card.Title>
              <Card.Text>
                Приглашайте участников, распределяйте роли и работайте вместе над проектами
              </Card.Text>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="h-100 shadow-sm">
            <Card.Body className="text-center">
              <div className="fs-1 mb-3">📊</div>
              <Card.Title>Аналитика</Card.Title>
              <Card.Text>
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
