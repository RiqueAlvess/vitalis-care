import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Layout
import Layout from './components/layout/Layout';

// Auth Pages
import Login from './pages/Auth/Login';
import Register from './pages/Auth/Register';

// Dashboard Pages
import Dashboard from './pages/Dashboard/Dashboard';
import Settings from './pages/Settings/Settings';

// Novas páginas
import Empresas from './pages/Empresas/Empresas';
import Funcionarios from './pages/Funcionarios/Funcionarios';
import Absenteismo from './pages/Absenteismo/Absenteismo';
import Profile from './pages/Profile/Profile';
import SyncMonitor from './pages/SyncMonitor/SyncMonitor';

// Protected Routes
import ProtectedRoute from './components/common/ProtectedRoute';

// Other Pages
import NotFound from './pages/NotFound';

const AppRoutes = () => {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      
      {/* Protected Routes */}
      <Route 
        path="/" 
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="settings" element={<Settings />} />
        
        {/* Páginas adicionadas */}
        <Route path="empresas" element={<Empresas />} />
        <Route path="funcionarios" element={<Funcionarios />} />
        <Route path="absenteismo" element={<Absenteismo />} />
        <Route path="profile" element={<Profile />} />
        <Route path="sync-monitor" element={<SyncMonitor />} />
        
        {/* Catch-all route */}
        <Route path="*" element={<NotFound />} />
      </Route>
      
      {/* Redirect root to login */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
};

export default AppRoutes;
