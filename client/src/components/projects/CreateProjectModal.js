import React, { useState } from 'react';
import { Modal, Form, Button, Alert } from 'react-bootstrap';

const CreateProjectModal = ({ show, onHide, onProjectCreated }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    isPublic: false,
    template: 'kanban'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        const newProject = await response.json();
        onProjectCreated(newProject.project);
        onHide();
        setFormData({ name: '', description: '', isPublic: false, template: 'kanban' });
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to create project');
      }
    } catch (error) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>Создать новый проект</Modal.Title>
      </Modal.Header>
      <Form onSubmit={handleSubmit}>
        <Modal.Body>
          {error && <Alert variant="danger">{error}</Alert>}
          
          <Form.Group className="mb-3">
            <Form.Label>Название проекта *</Form.Label>
            <Form.Control
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              placeholder="Введите название проекта"
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Описание</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Опишите ваш проект..."
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Шаблон</Form.Label>
            <Form.Select
              name="template"
              value={formData.template}
              onChange={handleChange}
            >
              <option value="kanban">Kanban доска</option>
              <option value="scrum">Scrum</option>
              <option value="custom">Произвольный</option>
            </Form.Select>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Check
              type="checkbox"
              name="isPublic"
              checked={formData.isPublic}
              onChange={handleChange}
              label="Публичный проект (доступен по ссылке)"
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onHide}>
            Отмена
          </Button>
          <Button variant="primary" type="submit" disabled={loading}>
            {loading ? 'Создание...' : 'Создать проект'}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default CreateProjectModal;
