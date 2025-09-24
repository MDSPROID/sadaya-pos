import React from 'react';
import { Navigate } from 'react-router-dom';
import { useSession } from '../components/SessionContextProvider';
import { hasPermissionPath, UserProfile } from '../utils/permissions';

type ProtectedRouteProps = {
  children: React.ReactNode;
  require?: string | string[];      // contoh: "Main.dashboard"
  allowedRoles?: string[];          // opsional: batasi berdasar role
  redirectTo?: string;              // default: /no-access
};

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  require,
  allowedRoles,
  redirectTo = '/no-access',
}) => {
  const { session, profile, loading } = useSession();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-lg text-gray-700">Memuat autentikasi...</p>
      </div>
    );
  }

  if (!session) return <Navigate to="/login" replace />;

  if (allowedRoles?.length) {
    if (!profile?.role || !allowedRoles.includes(profile.role)) {
      return <Navigate to={redirectTo} replace />;
    }
  }

  if (require && !hasPermissionPath(profile, require)) {
    return <Navigate to="/no-access" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
