import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useSession } from './components/SessionContextProvider';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import { supabase } from './integrations/supabase/client';
import NotFound from './pages/NotFound';
import NoAccess from './pages/NoAccess';
const StatusOrder = React.lazy(() => import('./pages/StatusOrder'));
import ProtectedRoute from "./components/ProtectedRoute";

const App: React.FC = () => {
  const { session, profile, loading } = useSession(); // Get loading state

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const allowedDashboardRoles = ['Super Admin', 'Admin', 'Kasir', 'Operator', 'Designer', 'Finishing'];

  const hasStatusOrderAccess = () => {
    if (!profile) return false;
    if (profile.role === 'Super Admin') return true;
    return profile?.permissions?.['Status Order']?.['status_order'] === true;
  };

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
      <Route
          path="/dashboard/*"
          element={
            <ProtectedRoute
              allowedRoles={allowedDashboardRoles} // opsional, kalau mau tetap filter role kasar
              require="Main.dashboard"             // cek JSON: { "Main": { "dashboard": true } }
            >
              {session ? (
                profile ? (
                  <Dashboard user={profile} onLogout={handleLogout} />
                ) : (
                  <Navigate to="/no-access" replace />
                )
              ) : (
                <Navigate to="/login" replace />
              )}
            </ProtectedRoute>
          }
        />
      <Route path="/no-access" element={<NoAccess />} />
      <Route
        path="/"
        element={session ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />}
      />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default App;