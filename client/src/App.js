import React, { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Container } from 'react-bootstrap';
import { useDispatch, useSelector } from 'react-redux';
import { getCurrentUser } from './store/slices/authSlice';
import websocketService from './services/websocket';

import Header from './components/common/Header';
import Footer from './components/common/Footer';
import ProtectedRoute from './components/common/ProtectedRoute';

import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import ProjectsPage from './pages/ProjectsPage';
import ProjectDetailPage from './pages/ProjectDetailPage';
import ProfilePage from './pages/ProfilePage';
import InvitePage from './pages/InvitePage';

function App() {
  const dispatch = useDispatch();
  const { token, isAuthenticated, user } = useSelector(state => state.auth);

  useEffect(() => {
    websocketService.requestNotificationPermission();

    if (token && isAuthenticated) {
      dispatch(getCurrentUser());
    }
  }, [dispatch, token, isAuthenticated]);

  // WebSocket connection management
  useEffect(() => {
    if (isAuthenticated && token) {
      websocketService.connect(token);
      
      const pingInterval = setInterval(() => {
        if (websocketService.isConnected()) {
          websocketService.sendPing();
        }
      }, 30000); // Каждые 30 секунд

      return () => {
        clearInterval(pingInterval);
        websocketService.disconnect();
      };
    } else {
      websocketService.disconnect();
    }
  }, [isAuthenticated, token]);

  return (
    <div className="App d-flex flex-column min-vh-100">
      <Header />
      <main className="flex-grow-1">
        <Container fluid className="py-4">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/invite/:code" element={<InvitePage />} />
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/projects" 
              element={
                <ProtectedRoute>
                  <ProjectsPage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/projects/:projectId" 
              element={
                <ProtectedRoute>
                  <ProjectDetailPage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/profile" 
              element={
                <ProtectedRoute>
                  <ProfilePage />
                </ProtectedRoute>
              } 
            />
          </Routes>
        </Container>
      </main>
      <Footer />
    </div>
  );
}

export default App;
