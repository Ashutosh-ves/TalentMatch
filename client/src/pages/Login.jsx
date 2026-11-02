import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getRoleDashboard } from '../utils/roles';

export function Login() {
  const { isAuthenticated, role, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  if (isAuthenticated) {
    return <Navigate to={getRoleDashboard(role)} replace />;
  }

  const handleMockLogin = (targetRole) => {
    const mockProfiles = {
      student: {
        user: { _id: 's1', name: 'Alex Rivera', email: 'alex@student.edu', role: 'student' },
        token: 'mock-jwt-token-student',
        defaultPath: '/student/dashboard',
      },
      recruiter: {
        user: { _id: 'r1', name: 'Sarah Chen', email: 'sarah@techcorp.io', role: 'recruiter' },
        token: 'mock-jwt-token-recruiter',
        defaultPath: '/recruiter/dashboard',
      },
      admin: {
        user: { _id: 'a1', name: 'Admin Officer', email: 'admin@talentmatch.io', role: 'admin' },
        token: 'mock-jwt-token-admin',
        defaultPath: '/admin/dashboard',
      },
    };

    const config = mockProfiles[targetRole];
    login(config.user, config.token);

    // If redirected here from a protected route, go back there if authorized, else default
    const fromPath = location.state?.from?.pathname;
    const destination = fromPath && fromPath.startsWith(`/${targetRole}`) ? fromPath : config.defaultPath;
    navigate(destination, { replace: true });
  };

  return (
    <div className="py-12 max-w-xl mx-auto">
      <div className="bg-surface-container-lowest border border-border-hairline p-8 md:p-12 shadow-sm">
        <h1 className="font-display-xl text-3xl md:text-4xl font-bold tracking-tight text-primary mb-2">
          Sign In
        </h1>
        <p className="font-body-md text-text-muted mb-8">
          Select a role to test authentication, session persistence, and protected routing.
        </p>

        {location.state?.from && (
          <div className="p-3 mb-6 bg-surface-container border border-border-hairline text-xs font-label-mono text-primary">
            Redirected from protected route: <span className="font-bold">{location.state.from.pathname}</span>
          </div>
        )}

        <div className="flex flex-col gap-4">
          <button
            onClick={() => handleMockLogin('student')}
            className="w-full text-left p-4 border border-border-hairline hover:border-primary transition-all bg-white group"
          >
            <div className="font-display-xl font-bold text-base text-primary group-hover:text-match-indicator">
              Log in as Student
            </div>
            <div className="font-label-mono text-xs text-text-muted">
              Role: student • Access /student/*, /chat
            </div>
          </button>

          <button
            onClick={() => handleMockLogin('recruiter')}
            className="w-full text-left p-4 border border-border-hairline hover:border-primary transition-all bg-white group"
          >
            <div className="font-display-xl font-bold text-base text-primary group-hover:text-match-indicator">
              Log in as Recruiter
            </div>
            <div className="font-label-mono text-xs text-text-muted">
              Role: recruiter • Access /recruiter/*, /chat
            </div>
          </button>

          <button
            onClick={() => handleMockLogin('admin')}
            className="w-full text-left p-4 border border-border-hairline hover:border-primary transition-all bg-white group"
          >
            <div className="font-display-xl font-bold text-base text-primary group-hover:text-match-indicator">
              Log in as Admin
            </div>
            <div className="font-label-mono text-xs text-text-muted">
              Role: admin • Access /admin/*
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}

export default Login;
