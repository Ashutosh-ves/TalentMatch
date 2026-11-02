import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { getRoleDashboard } from '../../utils/roles';

export function ProtectedRoute({ allowedRoles, children }) {
  const { isAuthenticated, role, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="font-label-mono text-label-mono text-text-muted animate-pulse">
          Loading session...
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(role)) {
    const targetDashboard = getRoleDashboard(role);
    return <Navigate to={targetDashboard} replace />;
  }

  return children ? children : <Outlet />;
}

export default ProtectedRoute;
