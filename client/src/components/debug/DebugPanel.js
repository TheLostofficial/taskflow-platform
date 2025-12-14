import React, { useState, useEffect } from 'react';
import { Button, Card, Alert, Badge } from 'react-bootstrap';
import { projectService } from '../../services/projectService';
import { API_URL } from '../../utils/constants';

const DebugPanel = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('unknown');

  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, { timestamp, message, type }].slice(-10));
  };

  const testConnection = async () => {
    setLoading(true);
    addLog('Запуск теста соединения...', 'info');
    
    try {
      const result = await projectService.testConnection();
      addLog(`✅ Тест успешен: ${JSON.stringify(result.data)}`, 'success');
      setConnectionStatus('connected');
    } catch (error) {
      addLog(`❌ Ошибка теста: ${error.message}`, 'error');
      setConnectionStatus('error');
    } finally {
      setLoading(false);
    }
  };

  const testGetProjects = async () => {
    setLoading(true);
    addLog('Попытка загрузки проектов...', 'info');
    
    try {
      const result = await projectService.getProjects();
      addLog(`✅ Проекты загружены: ${result.data.projects?.length || 0} проектов`, 'success');
      addLog(`📊 Данные: ${JSON.stringify(result.data).substring(0, 200)}...`, 'info');
    } catch (error) {
      addLog(`❌ Ошибка загрузки проектов: ${error.message}`, 'error');
      if (error.response) {
        addLog(`📡 Статус: ${error.response.status}, Данные: ${JSON.stringify(error.response.data)}`, 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const clearCache = () => {
    projectService.clearCache();
    addLog('🧹 Кэш очищен', 'info');
  };

  const checkToken = () => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    
    addLog(`🔑 Токен: ${token ? `присутствует (${token.length} символов)` : 'отсутствует'}`, 'info');
    addLog(`👤 Пользователь: ${user ? JSON.parse(user).email : 'не найден'}`, 'info');
    
    // Декодируем токен для отладки
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        addLog(`🔍 Декодированный токен: ${JSON.stringify(payload)}`, 'info');
      } catch (e) {
        addLog(`❌ Не удалось декодировать токен: ${e.message}`, 'error');
      }
    }
  };

  const testAuth = async () => {
    setLoading(true);
    addLog('Тестирование аутентификации...', 'info');
    
    try {
      const response = await fetch(`${API_URL}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        addLog(`✅ Аутентификация успешна: ${data.user?.email}`, 'success');
      } else {
        addLog(`❌ Аутентификация не удалась: ${response.status}`, 'error');
      }
    } catch (error) {
      addLog(`❌ Ошибка при тесте аутентификации: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkToken();
  }, []);

  return (
    <Card className="mt-3">
      <Card.Header>
        <h5 className="mb-0">🔧 Панель отладки</h5>
        <small>Для диагностики проблемы с загрузкой проектов</small>
      </Card.Header>
      <Card.Body>
        <div className="mb-3">
          <h6>Состояние:</h6>
          <div className="d-flex gap-2 mb-2">
            <Badge bg={connectionStatus === 'connected' ? 'success' : 'danger'}>
              Соединение: {connectionStatus}
            </Badge>
            <Badge bg="info">
              API: {API_URL}
            </Badge>
          </div>
        </div>

        <div className="mb-3">
          <h6>Действия:</h6>
          <div className="d-flex flex-wrap gap-2">
            <Button
              variant="outline-primary"
              size="sm"
              onClick={testConnection}
              disabled={loading}
            >
              Тест соединения
            </Button>
            <Button
              variant="outline-success"
              size="sm"
              onClick={testGetProjects}
              disabled={loading}
            >
              Тест загрузки проектов
            </Button>
            <Button
              variant="outline-warning"
              size="sm"
              onClick={checkToken}
              disabled={loading}
            >
              Проверить токен
            </Button>
            <Button
              variant="outline-info"
              size="sm"
              onClick={testAuth}
              disabled={loading}
            >
              Тест аутентификации
            </Button>
            <Button
              variant="outline-secondary"
              size="sm"
              onClick={clearCache}
            >
              Очистить кэш
            </Button>
          </div>
        </div>

        <div>
          <h6>Логи:</h6>
          <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
            {logs.length === 0 ? (
              <Alert variant="info">Логи пока пусты. Выполните тесты для получения информации.</Alert>
            ) : (
              logs.map((log, index) => (
                <div
                  key={index}
                  className={`mb-1 p-2 border rounded ${
                    log.type === 'error' ? 'border-danger bg-light' :
                    log.type === 'success' ? 'border-success bg-light' :
                    'border-info bg-light'
                  }`}
                >
                  <small className="text-muted">[{log.timestamp}]</small>{' '}
                  <span className={log.type === 'error' ? 'text-danger' : log.type === 'success' ? 'text-success' : 'text-dark'}>
                    {log.message}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </Card.Body>
    </Card>
  );
};

export default DebugPanel;