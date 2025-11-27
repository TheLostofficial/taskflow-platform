import React from 'react';
import { Container, Row, Col, Card, Button } from 'react-bootstrap';
import { LinkContainer } from 'react-router-bootstrap';

const DashboardPage = () => {
  return (
    <Container>
      <Row className="mb-4">
        <Col>
          <h1>Панель управления</h1>
          <p className="text-muted">Добро пожаловать в вашу рабочую область</p>
        </Col>
      </Row>

      <Row className="g-4">
        <Col md={4}>
          <Card className="h-100 shadow-sm">
            <Card.Body className="text-center">
              <div className="fs-1 mb-3">📁</div>
              <Card.Title>Мои проекты</Card.Title>
              <Card.Text>
                Управляйте вашими проектами и задачами
              </Card.Text>
              <LinkContainer to="/projects">
                <Button variant="primary">Перейти к проектам</Button>
              </LinkContainer>
            </Card.Body>
          </Card>
        </Col>

        <Col md={4}>
          <Card className="h-100 shadow-sm">
            <Card.Body className="text-center">
              <div className="fs-1 mb-3">📊</div>
              <Card.Title>Статистика</Card.Title>
              <Card.Text>
                Просматривайте аналитику и отчеты
              </Card.Text>
              <Button variant="outline-primary" disabled>
                Скоро будет доступно
              </Button>
            </Card.Body>
          </Card>
        </Col>

        <Col md={4}>
          <Card className="h-100 shadow-sm">
            <Card.Body className="text-center">
              <div className="fs-1 mb-3">⚙️</div>
              <Card.Title>Настройки</Card.Title>
              <Card.Text>
                Настройте ваш аккаунт и предпочтения
              </Card.Text>
              <Button variant="outline-primary" disabled>
                Скоро будет доступно
              </Button>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row className="mt-5">
        <Col>
          <Card>
            <Card.Body>
              <Card.Title>Быстрый старт</Card.Title>
              <Card.Text>
                Начните работу с TaskFlow создав ваш первый проект. 
                Пригласите команду и начните эффективно управлять задачами.
              </Card.Text>
              <Button variant="success">Создать первый проект</Button>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default DashboardPage;
