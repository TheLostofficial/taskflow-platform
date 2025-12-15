import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { 
  Card, 
  Button, 
  Badge, 
  ListGroup, 
  Form, 
  Accordion,
  Alert
} from 'react-bootstrap';

const DebugPanel = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('redux');
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(5000);

  const auth = useSelector((state) => state.auth);
  const projects = useSelector((state) => state.projects);
  const tasks = useSelector((state) => state.tasks);
  const dispatch = useDispatch();

  // Авто-обновление состояния
  useEffect(() => {
    let interval;
    if (autoRefresh && isOpen) {
      interval = setInterval(() => {
        console.log('[Debug] Auto-refreshing state...');
      }, refreshInterval);
    }
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, isOpen]);

  const getStateInfo = () => {
    return {
      auth: {
        isAuthenticated: auth?.isAuthenticated || false,
        user: auth?.user ? `${auth.user.name} (${auth.user.email})` : 'null',
        loading: auth?.loading || false,
        error: auth?.error || null
      },
      projects: {
        count: projects?.projects?.length || 0,
        currentProject: projects?.currentProject?.name || 'null',
        loading: projects?.loading || false,
        error: projects?.error || null
      },
      tasks: {
        count: tasks?.tasks?.length || 0,
        loading: tasks?.loading || false,
        error: tasks?.error || null
      }
    };
  };

  const testWebSocket = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/health/ws');
      const data = await response.json();
      
      if (data.status === 'connected') {
        window.alert('✅ WebSocket connection is active');
      } else {
        window.alert('⚠️ WebSocket connection issue');
      }
      return data;
    } catch (error) {
      window.alert(`❌ WebSocket Test Failed: ${error.message}`);
      throw error;
    }
  };

  const simulateTaskUpdate = () => {
    const mockTaskUpdate = {
      type: 'TASK_UPDATED',
      payload: {
        _id: 'debug_' + Date.now(),
        title: `Debug Task ${new Date().toLocaleTimeString()}`,
        status: 'in_progress',
        priority: 'medium',
        updatedAt: new Date().toISOString()
      }
    };
    
    dispatch(mockTaskUpdate);
    
    window.alert('ℹ️ Task Update Simulated: Mock task update dispatched to Redux');
  };

  const clearAllNotifications = () => {
    window.alert('✅ All notifications have been cleared');
  };

  const resetAllStates = () => {
    if (window.confirm('Are you sure? This will reset all Redux states.')) {
      dispatch({ type: 'RESET_AUTH' });
      dispatch({ type: 'RESET_PROJECTS' });
      dispatch({ type: 'RESET_TASKS' });
      
      window.alert('✅ All Redux states have been reset to initial');
    }
  };

  const renderReduxState = () => (
    <div className="mt-3">
      <h6>Redux State</h6>
      <Accordion>
        <Accordion.Item eventKey="0">
          <Accordion.Header>
            Auth State <Badge bg={getStateInfo().auth.isAuthenticated ? 'success' : 'danger'}>
              {getStateInfo().auth.isAuthenticated ? 'Logged In' : 'Logged Out'}
            </Badge>
          </Accordion.Header>
          <Accordion.Body>
            <pre className="bg-dark text-light p-2 rounded" style={{ fontSize: '12px' }}>
              {JSON.stringify(getStateInfo().auth, null, 2)}
            </pre>
          </Accordion.Body>
        </Accordion.Item>

        <Accordion.Item eventKey="1">
          <Accordion.Header>
            Projects State <Badge bg="info">{getStateInfo().projects.count} projects</Badge>
          </Accordion.Header>
          <Accordion.Body>
            <pre className="bg-dark text-light p-2 rounded" style={{ fontSize: '12px' }}>
              {JSON.stringify(getStateInfo().projects, null, 2)}
            </pre>
          </Accordion.Body>
        </Accordion.Item>

        <Accordion.Item eventKey="2">
          <Accordion.Header>
            Tasks State <Badge bg="info">{getStateInfo().tasks.count} tasks</Badge>
          </Accordion.Header>
          <Accordion.Body>
            <pre className="bg-dark text-light p-2 rounded" style={{ fontSize: '12px' }}>
              {JSON.stringify(getStateInfo().tasks, null, 2)}
            </pre>
          </Accordion.Body>
        </Accordion.Item>
      </Accordion>
    </div>
  );

  const renderActions = () => (
    <div className="mt-3">
      <h6>Debug Actions</h6>
      <ListGroup>
        <ListGroup.Item>
          <Button 
            variant="outline-primary" 
            size="sm" 
            onClick={testWebSocket}
            className="w-100 mb-2"
          >
            Test WebSocket Connection
          </Button>
        </ListGroup.Item>
        <ListGroup.Item>
          <Button 
            variant="outline-warning" 
            size="sm" 
            onClick={simulateTaskUpdate}
            className="w-100 mb-2"
          >
            Simulate Task Update
          </Button>
        </ListGroup.Item>
        <ListGroup.Item>
          <Button 
            variant="outline-info" 
            size="sm" 
            onClick={clearAllNotifications}
            className="w-100 mb-2"
          >
            Clear All Notifications
          </Button>
        </ListGroup.Item>
        <ListGroup.Item>
          <Button 
            variant="outline-danger" 
            size="sm" 
            onClick={resetAllStates}
            className="w-100"
          >
            Reset All States
          </Button>
        </ListGroup.Item>
      </ListGroup>
    </div>
  );

  const renderSettings = () => (
    <div className="mt-3">
      <h6>Debug Settings</h6>
      <Form>
        <Form.Check
          type="switch"
          id="auto-refresh"
          label="Auto-refresh state"
          checked={autoRefresh}
          onChange={(e) => setAutoRefresh(e.target.checked)}
          className="mb-3"
        />
        
        {autoRefresh && (
          <Form.Group className="mb-3">
            <Form.Label>Refresh Interval: {refreshInterval}ms</Form.Label>
            <Form.Range
              min="1000"
              max="30000"
              step="1000"
              value={refreshInterval}
              onChange={(e) => setRefreshInterval(parseInt(e.target.value))}
            />
          </Form.Group>
        )}
      </Form>
    </div>
  );

  if (!isOpen) {
    return (
      <Button
        variant="outline-secondary"
        size="sm"
        onClick={() => setIsOpen(true)}
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          zIndex: 9999,
          borderRadius: '50%',
          width: '50px',
          height: '50px'
        }}
      >
        🐞
      </Button>
    );
  }

  return (
    <Card
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        width: '400px',
        maxHeight: '80vh',
        zIndex: 9999,
        boxShadow: '0 0 20px rgba(0,0,0,0.3)'
      }}
    >
      <Card.Header className="d-flex justify-content-between align-items-center">
        <strong>🐞 Debug Panel</strong>
        <div>
          <Button
            variant="outline-secondary"
            size="sm"
            onClick={() => setIsOpen(false)}
            className="ms-2"
          >
            ✕
          </Button>
        </div>
      </Card.Header>
      
      <Card.Body style={{ overflowY: 'auto' }}>
        <div className="mb-3">
          <Button
            variant={activeTab === 'redux' ? 'primary' : 'outline-primary'}
            size="sm"
            onClick={() => setActiveTab('redux')}
            className="me-2"
          >
            Redux
          </Button>
          <Button
            variant={activeTab === 'actions' ? 'warning' : 'outline-warning'}
            size="sm"
            onClick={() => setActiveTab('actions')}
            className="me-2"
          >
            Actions
          </Button>
          <Button
            variant={activeTab === 'settings' ? 'info' : 'outline-info'}
            size="sm"
            onClick={() => setActiveTab('settings')}
          >
            Settings
          </Button>
        </div>

        {activeTab === 'redux' && renderReduxState()}
        {activeTab === 'actions' && renderActions()}
        {activeTab === 'settings' && renderSettings()}

        <Alert variant="warning" className="mt-3" style={{ fontSize: '12px' }}>
          <strong>Warning:</strong> Debug panel is for development only. 
          Disable in production.
        </Alert>
      </Card.Body>
    </Card>
  );
};

export default DebugPanel;