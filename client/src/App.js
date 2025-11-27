// client/src/App.js
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Container } from 'react-bootstrap';

// Components
import Header from './components/common/Header';
import Footer from './components/common/Footer';
import ProtectedRoute from './components/common/ProtectedRoute';

// Pages
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import ProjectsPage from './pages/ProjectsPage';
import ProfilePage from './pages/ProfilePage';

function App() {
  return (
    <div className="App d-flex flex-column min-vh-100">
      <Header />
      <main className="flex-grow-1">
        <Container fluid className="py-4">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
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
