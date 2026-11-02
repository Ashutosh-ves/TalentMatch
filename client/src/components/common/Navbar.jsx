import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { getRoleDashboard } from '../../utils/roles';

export function Navbar() {
  const { isAuthenticated, user, role, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navLinkClass = ({ isActive }) =>
    isActive
      ? 'text-primary font-bold border-b-2 border-primary pb-1 transition-all duration-150'
      : 'text-text-muted hover:text-primary transition-colors duration-150 pb-1';

  return (
    <header className="w-full top-0 bg-background border-b border-border-hairline sticky z-50">
      <div className="flex justify-between items-center w-full px-4 md:px-16 py-5 max-w-[1440px] mx-auto">
        {/* Brand Logo */}
        <div className="flex items-center gap-8">
          <Link
            to={isAuthenticated ? getRoleDashboard(role) : '/'}
            className="font-display-xl text-2xl md:text-3xl font-extrabold tracking-tighter text-primary hover:text-match-indicator transition-colors"
          >
            TALENT MATCH
          </Link>

          {/* Role-Specific Navigation Links (Desktop) */}
          {isAuthenticated && (
            <nav className="hidden md:flex gap-6 items-center font-label-mono text-label-mono">
              {role === 'student' && (
                <>
                  <NavLink to="/student/dashboard" className={navLinkClass}>
                    Explore
                  </NavLink>
                  <NavLink to="/student/applications" className={navLinkClass}>
                    Applications
                  </NavLink>
                  <NavLink to="/student/profile" className={navLinkClass}>
                    Profile
                  </NavLink>
                  <NavLink to="/chat" className={navLinkClass}>
                    Messages
                  </NavLink>
                </>
              )}

              {role === 'recruiter' && (
                <>
                  <NavLink to="/recruiter/dashboard" className={navLinkClass}>
                    Dashboard
                  </NavLink>
                  <NavLink to="/recruiter/openings/new" className={navLinkClass}>
                    Post Job
                  </NavLink>
                  <NavLink to="/chat" className={navLinkClass}>
                    Messages
                  </NavLink>
                </>
              )}

              {role === 'admin' && (
                <>
                  <NavLink to="/admin/dashboard" className={navLinkClass}>
                    Dashboard
                  </NavLink>
                </>
              )}
            </nav>
          )}
        </div>

        {/* Trailing Actions */}
        <div className="flex items-center gap-4">
          {isAuthenticated ? (
            <div className="flex items-center gap-3">
              {/* Role badge */}
              <span className="px-2.5 py-1 text-[11px] font-label-mono font-semibold bg-surface-container border border-border-hairline text-primary uppercase rounded tracking-wider">
                {role}
              </span>

              {/* User info */}
              <span className="hidden sm:inline font-label-mono text-xs text-text-muted">
                {user?.name || user?.email}
              </span>

              {/* Avatar circle */}
              <div className="w-8 h-8 rounded-full border border-border-hairline bg-primary text-on-primary flex items-center justify-center font-display-xl font-bold text-xs uppercase">
                {(user?.name || user?.email || role || 'U')[0]}
              </div>

              {/* Sign out button */}
              <button
                onClick={handleLogout}
                className="font-label-mono text-label-mono text-xs px-3 py-1.5 border border-border-hairline text-primary hover:bg-black hover:text-white transition-all uppercase tracking-wider"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-4 font-label-mono text-label-mono">
              <Link
                to="/login"
                className="text-on-surface-variant hover:text-match-indicator transition-colors uppercase text-xs tracking-wider"
              >
                Login
              </Link>
              <Link
                to="/register"
                className="px-4 py-2 border border-border-hairline bg-white text-primary hover:bg-black hover:text-white transition-all uppercase text-xs tracking-wider"
              >
                Register
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default Navbar;
