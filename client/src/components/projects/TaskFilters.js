import React, { useState } from 'react';
import { Form, Row, Col, Button, Badge, Card, Accordion } from 'react-bootstrap';

const TaskFilters = ({ 
  tasks, 
  onFilterChange,
  onClearFilters,
  projectMembers 
}) => {
  const [filters, setFilters] = useState({
    status: [],
    priority: [],
    assignee: [],
    searchText: '',
    hasDueDate: false,
    hasAttachments: false,
    hasComments: false
  });

  const allStatuses = [...new Set(tasks.map(task => task.status))];
  const allPriorities = [...new Set(tasks.map(task => task.priority))];

  const handleFilterChange = (filterType, value) => {
    let newFilters = { ...filters };
    
    switch (filterType) {
      case 'status':
      case 'priority':
      case 'assignee':
        newFilters[filterType] = newFilters[filterType].includes(value)
          ? newFilters[filterType].filter(item => item !== value)
          : [...newFilters[filterType], value];
        break;
      
      case 'searchText':
        newFilters.searchText = value;
        break;
      
      case 'hasDueDate':
      case 'hasAttachments':
      case 'hasComments':
        newFilters[filterType] = !filters[filterType];
        break;
      
      case 'clear':
        newFilters = {
          status: [],
          priority: [],
          assignee: [],
          searchText: '',
          hasDueDate: false,
          hasAttachments: false,
          hasComments: false
        };
        break;
    }

    setFilters(newFilters);
    
    if (onFilterChange) {
      const filteredTasks = filterTasks(tasks, newFilters);
      onFilterChange(filteredTasks, newFilters);
    }
  };

  const filterTasks = (tasks, filters) => {
    return tasks.filter(task => {
      // Фильтр по статусу
      if (filters.status.length > 0 && !filters.status.includes(task.status)) {
        return false;
      }

      // Фильтр по приоритету
      if (filters.priority.length > 0 && !filters.priority.includes(task.priority)) {
        return false;
      }

      // Фильтр по исполнителю
      if (filters.assignee.length > 0) {
        const assigneeId = task.assignee?._id || 'unassigned';
        if (!filters.assignee.includes(assigneeId)) {
          return false;
        }
      }

      // Поиск по тексту
      if (filters.searchText) {
        const searchLower = filters.searchText.toLowerCase();
        const titleMatch = task.title.toLowerCase().includes(searchLower);
        const descMatch = task.description?.toLowerCase().includes(searchLower) || false;
        if (!titleMatch && !descMatch) {
          return false;
        }
      }

      // Фильтр по наличию срока
      if (filters.hasDueDate && !task.dueDate) {
        return false;
      }

      // Фильтр по наличию вложений
      if (filters.hasAttachments && (!task.attachments || task.attachments.length === 0)) {
        return false;
      }

      // Фильтр по наличию комментариев
      if (filters.hasComments && (!task.comments || task.comments.length === 0)) {
        return false;
      }

      return true;
    });
  };

  const getPriorityBadgeVariant = (priority) => {
    switch (priority) {
      case 'low': return 'success';
      case 'medium': return 'warning';
      case 'high': return 'danger';
      case 'critical': return 'dark';
      default: return 'secondary';
    }
  };

  const getPriorityText = (priority) => {
    switch (priority) {
      case 'low': return 'Низкий';
      case 'medium': return 'Средний';
      case 'high': return 'Высокий';
      case 'critical': return 'Критический';
      default: return priority;
    }
  };

  const getActiveFilterCount = () => {
    return (
      filters.status.length +
      filters.priority.length +
      filters.assignee.length +
      (filters.searchText ? 1 : 0) +
      (filters.hasDueDate ? 1 : 0) +
      (filters.hasAttachments ? 1 : 0) +
      (filters.hasComments ? 1 : 0)
    );
  };

  const activeFilterCount = getActiveFilterCount();

  return (
    <Card className="mb-4">
      <Card.Header className="bg-light">
        <div className="d-flex justify-content-between align-items-center">
          <h6 className="mb-0">Фильтры задач</h6>
          {activeFilterCount > 0 && (
            <div className="d-flex align-items-center">
              <Badge bg="primary" className="me-2">
                {activeFilterCount} активных
              </Badge>
              <Button
                variant="outline-secondary"
                size="sm"
                onClick={() => handleFilterChange('clear')}
              >
                Сбросить
              </Button>
            </div>
          )}
        </div>
      </Card.Header>
      <Card.Body>
        <Row>
          <Col md={12} className="mb-3">
            <Form.Control
              type="text"
              placeholder="Поиск по названию и описанию..."
              value={filters.searchText}
              onChange={(e) => handleFilterChange('searchText', e.target.value)}
            />
          </Col>
        </Row>

        <Accordion defaultActiveKey={['0']} alwaysOpen>
          <Accordion.Item eventKey="0">
            <Accordion.Header>Статус</Accordion.Header>
            <Accordion.Body>
              <div className="d-flex flex-wrap gap-2">
                {allStatuses.map(status => (
                  <Button
                    key={status}
                    variant={filters.status.includes(status) ? "primary" : "outline-primary"}
                    size="sm"
                    onClick={() => handleFilterChange('status', status)}
                  >
                    {status}
                  </Button>
                ))}
              </div>
            </Accordion.Body>
          </Accordion.Item>

          <Accordion.Item eventKey="1">
            <Accordion.Header>Приоритет</Accordion.Header>
            <Accordion.Body>
              <div className="d-flex flex-wrap gap-2">
                {allPriorities.map(priority => (
                  <Button
                    key={priority}
                    variant={filters.priority.includes(priority) ? getPriorityBadgeVariant(priority) : `outline-${getPriorityBadgeVariant(priority)}`}
                    size="sm"
                    onClick={() => handleFilterChange('priority', priority)}
                  >
                    {getPriorityText(priority)}
                  </Button>
                ))}
              </div>
            </Accordion.Body>
          </Accordion.Item>

          <Accordion.Item eventKey="2">
            <Accordion.Header>Исполнители</Accordion.Header>
            <Accordion.Body>
              <div className="d-flex flex-column gap-2">
                <Button
                  variant={filters.assignee.includes('unassigned') ? "secondary" : "outline-secondary"}
                  size="sm"
                  className="text-start"
                  onClick={() => handleFilterChange('assignee', 'unassigned')}
                >
                  👤 Не назначен
                </Button>
                {projectMembers.map(member => (
                  <Button
                    key={member.user._id}
                    variant={filters.assignee.includes(member.user._id) ? "info" : "outline-info"}
                    size="sm"
                    className="text-start"
                    onClick={() => handleFilterChange('assignee', member.user._id)}
                  >
                    <div className="d-flex align-items-center">
                      <div 
                        className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center me-2"
                        style={{ width: '20px', height: '20px', fontSize: '10px' }}
                      >
                        {member.user.name.charAt(0).toUpperCase()}
                      </div>
                      {member.user.name}
                    </div>
                  </Button>
                ))}
              </div>
            </Accordion.Body>
          </Accordion.Item>

          <Accordion.Item eventKey="3">
            <Accordion.Header>Дополнительные фильтры</Accordion.Header>
            <Accordion.Body>
              <div className="d-flex flex-column gap-2">
                <Form.Check
                  type="checkbox"
                  label="Только задачи со сроком выполнения"
                  checked={filters.hasDueDate}
                  onChange={() => handleFilterChange('hasDueDate')}
                />
                <Form.Check
                  type="checkbox"
                  label="Только задачи с вложениями"
                  checked={filters.hasAttachments}
                  onChange={() => handleFilterChange('hasAttachments')}
                />
                <Form.Check
                  type="checkbox"
                  label="Только задачи с комментариями"
                  checked={filters.hasComments}
                  onChange={() => handleFilterChange('hasComments')}
                />
              </div>
            </Accordion.Body>
          </Accordion.Item>
        </Accordion>
      </Card.Body>
    </Card>
  );
};

export default TaskFilters;