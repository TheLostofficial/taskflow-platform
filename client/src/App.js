import React, { useEffect, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Provider, useSelector, useDispatch } from 'react-redux';
import store from './store/store';
import Header from './components/common/Header';
import Footer from './components/common/Footer';
import ProtectedRoute from './components/common/ProtectedRoute';
import { getCurrentUser } from './store/slices/authSlice';
import websocketService from './services/websocket';
import DebugPanel from './components/debug/DebugPanel';
import './styles/global.css';

// Ленивая загрузка страниц для оптимизации
const HomePage = lazy(() => import('./pages/HomePage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const ProjectsPage = lazy(() => import('./pages/ProjectsPage'));
const ProjectDetailPage = lazy(() => import('./pages/ProjectDetailPage'));
const InvitePage = lazy(() => import('./pages/InvitePage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'));
const HelpPage = lazy(() => import('./pages/HelpPage'));

// Компонент загрузки
const LoadingFallback = () => (
  <div className="d-flex justify-content-center align-items-center min-vh-100">
    <div className="text-center">
      <div className="spinner-border text-primary mb-3" style={{ width: '3rem', height: '3rem' }}>
        <span className="visually-hidden">Загрузка...</span>
      </div>
      <h4 className="text-muted">Загрузка приложения...</h4>
    </div>
  </div>
);

// Компонент инициализации приложения
const AppInit = () => {
  const dispatch = useDispatch();
  const { isAuthenticated, user } = useSelector(state => state.auth);

  useEffect(() => {
    // При монтировании приложения загружаем текущего пользователя
    const token = localStorage.getItem('token');
    if (token) {
      dispatch(getCurrentUser());
    }
  }, [dispatch]);

  // Управление WebSocket соединением
  useEffect(() => {
    if (isAuthenticated && user) {
      websocketService.connect();
      
      // Подключаем обработчики WebSocket событий
      const handleTaskCreated = (data) => {
        console.log('📡 App: Получено событие taskCreated', data);
      };
      
      const handleTaskUpdated = (data) => {
        console.log('📡 App: Получено событие taskUpdated', data);
      };
      
      const handleUserMentioned = (data) => {
        console.log('📡 App: Пользователь упомянут', data);
      };

      websocketService.on('taskCreated', handleTaskCreated);
      websocketService.on('taskUpdated', handleTaskUpdated);
      websocketService.on('userMentioned', handleUserMentioned);

      return () => {
        websocketService.off('taskCreated', handleTaskCreated);
        websocketService.off('taskUpdated', handleTaskUpdated);
        websocketService.off('userMentioned', handleUserMentioned);
      };
    } else {
      websocketService.disconnect();
    }
  }, [isAuthenticated, user]);

  return null;
};

// Основной компонент приложения
const AppContent = () => {
  const isAuthenticated = useSelector(state => state.auth.isAuthenticated);
  const loading = useSelector(state => state.auth.loading);

  if (loading && localStorage.getItem('token')) {
    return <LoadingFallback />;
  }

  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <div className="app d-flex flex-column">
        {isAuthenticated && <Header />}
        <main className="main-content">
          <Suspense fallback={<LoadingFallback />}>
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
              <Route path="/invite/:token" element={<InvitePage />} />
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
              <Route path="/help" element={
                <ProtectedRoute>
                  <HelpPage />
                </ProtectedRoute>
              } />
            </Routes>
          </Suspense>
        </main>
        <Footer />
        {process.env.NODE_ENV === 'development' && <DebugPanel />}
      </div>
    </Router>
  );
};

// Главный компонент App
function App() {
  return (
    <Provider store={store}>
      <AppInit />
      <AppContent />
    </Provider>
  );
}

export default App;