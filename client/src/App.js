import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './store/store';
import { initializeWebSocket, disconnectWebSocket } from './services/websocket';
import './styles/global.css';

// Импорт страниц
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import ProjectsPage from './pages/ProjectsPage';
import ProjectDetailPage from './pages/ProjectDetailPage';
import ProfilePage from './pages/ProfilePage';
import SettingsPage from './pages/SettingsPage';
import NotificationsPage from './pages/NotificationsPage';
import HelpPage from './pages/HelpPage';
import InvitePage from './pages/InvitePage';

// Импорт компонентов
import Header from './components/common/Header';
import Footer from './components/common/Footer';
import ProtectedRoute from './components/common/ProtectedRoute';

// Компонент для отлова глобальных ошибок
const ErrorBoundary = ({ children }) => {
  useEffect(() => {
    const handleError = (event) => {
      console.error('Глобальная ошибка:', event.error);
    };

    window.addEventListener('error', handleError);
    
    return () => {
      window.removeEventListener('error', handleError);
    };
  }, []);

  return children;
};

const AppContent = () => {
  useEffect(() => {
    // Инициализируем WebSocket при загрузке приложения
    initializeWebSocket();
    
    // Очистка при размонтировании
    return () => {
      disconnectWebSocket();
    };
  }, []);

  return (
    <ErrorBoundary>
      <Router>
        <div className="app d-flex flex-column min-vh-100">
          <Header />
          <main className="flex-grow-1">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              } />
              
              <Route path="/projects" element={
                <ProtectedRoute>
                  <ProjectsPage />
                </ProtectedRoute>
              } />
              
              <Route path="/projects/:id" element={
                <ProtectedRoute>
                  <ProjectDetailPage />
                </ProtectedRoute>
              } />
              
              <Route path="/profile" element={
                <ProtectedRoute>
                  <ProfilePage />
                </ProtectedRoute>
              } />
              
              <Route path="/settings" element={
                <ProtectedRoute>
                  <SettingsPage />
                </ProtectedRoute>
              } />
              
              <Route path="/notifications" element={
                <ProtectedRoute>
                  <NotificationsPage />
                </ProtectedRoute>
              } />
              
              <Route path="/help" element={<HelpPage />} />
              
              <Route path="/invite/:token" element={<InvitePage />} />
              
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </Router>
    </ErrorBoundary>
  );
};

function App() {
  return (
    <Provider store={store}>
      <AppContent />
    </Provider>
  );
}

export default App;