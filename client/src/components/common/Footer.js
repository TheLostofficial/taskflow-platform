import React from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import { Link } from 'react-router-dom';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-dark text-white py-4 mt-auto">
      <Container>
        <Row className="align-items-center">
          <Col md={4} className="mb-3 mb-md-0">
            <h5 className="mb-3">
              <Link to="/" className="text-white text-decoration-none fw-bold">
                🚀 TaskFlow
              </Link>
            </h5>
            <p className="text-muted mb-0 small">
              Современная платформа управления проектами
            </p>
          </Col>
          
          <Col md={4} className="mb-3 mb-md-0">
            <div className="text-center">
              <p className="mb-2 small">
                © {currentYear} TaskFlow. Учебный демонстрационный проект.
              </p>
              <p className="mb-0 small text-muted">
                Разработано для производственной практики
              </p>
            </div>
          </Col>
          
          <Col md={4}>
            <div className="text-md-end">
              <div className="d-flex justify-content-md-end gap-3">
                <a href="/help" className="text-white text-decoration-none small">
                  <i className="bi bi-question-circle me-1"></i> Помощь
                </a>
                <a href="/about" className="text-white text-decoration-none small">
                  <i className="bi bi-info-circle me-1"></i> О проекте
                </a>
                <a href="/contact" className="text-white text-decoration-none small">
                  <i className="bi bi-envelope me-1"></i> Контакты
                </a>
              </div>
            </div>
          </Col>
        </Row>
      </Container>
    </footer>
  );
};

export default Footer;
