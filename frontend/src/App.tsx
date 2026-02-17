import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/useStore';
import { Login } from './pages/Login';
import { Setup } from './pages/Setup';
import { Dashboard } from './pages/Dashboard';
import { Onboarding } from './pages/Onboarding';
import { Settings } from './pages/Settings';
import { ActivityLogs } from './pages/ActivityLogs';

const App: React.FC = () => {
  const { isAuthenticated, checkSession } = useAuthStore();

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/setup" element={<Setup />} />
        <Route path="/login" element={<Login />} />
        <Route 
          path="/onboarding" 
          element={isAuthenticated ? <Onboarding /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/settings" 
          element={isAuthenticated ? <Settings /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/activity" 
          element={isAuthenticated ? <ActivityLogs /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/dashboard" 
          element={isAuthenticated ? <Dashboard /> : <Navigate to="/login" />} 
        />
        <Route path="/" element={<Navigate to="/setup" />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
