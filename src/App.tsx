import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useSession } from './components/SessionContextProvider';
import Login from './components/Login';
import ResetPasswordPage from './components/ResetPasswordPage';
import Dashboard from './components/Dashboard';
import { supabase } from './integrations/supabase/client';
import NotFound from './pages/NotFound';
import NoAccess from './pages/NoAccess';
import ProtectedRoute from "./components/ProtectedRoute";

const App: React.FC = () => {
  const { session, profile, loading } = useSession(); // Get loading state

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const allowedDashboardRoles = ['Super Admin', 'Admin', 'Kasir', 'CS', 'Manager', 'Operator', 'Designer', 'Finishing'];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-lg text-gray-700">Memuat autentikasi...</p>
      </div>
    );
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={!session ? <Login /> : <Navigate to="/dashboard" replace />}
      />
      <Route path="/auth/reset-password" element={<ResetPasswordPage />} />
      <Route
        path="/dashboard/*"
        element={
          session ? (
            profile && allowedDashboardRoles.includes(profile.role || '') ? (
              <Dashboard user={profile} onLogout={handleLogout} />
            ) : (
              <Navigate to="/no-access" replace />
            )
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      {/* Redirect URL lama/typo ke slug resmi */}
      <Route path="/status_order" element={<Navigate to="/dashboard/status-order" replace />} />
      <Route path="/status-order" element={<Navigate to="/dashboard/status-order" replace />} />
      <Route path="/dashboard/status_order" element={<Navigate to="/dashboard/status-order" replace />} />
      <Route path="/no-access" element={<NoAccess />} />
      <Route
        path="/"
        element={session ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />}
      />
      <Route path="/not-found" element={<NotFound />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default App;