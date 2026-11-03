import { useState, useRef, useEffect } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../hooks/useAuth';
import { getRoleDashboard } from '../../utils/roles';
import { notificationService } from '../../services/notificationService';

export function Navbar() {
  const { isAuthenticated, user, role, logout } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const bellContainerRef = useRef(null);

  // Fetch notifications for authenticated users
  const { data: notificationsData } = useQuery({
    queryKey: ['notifications'],
    queryFn: notificationService.getNotifications,
    enabled: isAuthenticated,
  });

  const unreadCount = notificationsData?.unreadCount || 0;
  const notificationsList = (notificationsData?.notifications || []).slice(0, 10);

  // Mark single notification read mutation
  const markReadMutation = useMutation({
    mutationFn: (id) => notificationService.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  // Mark all read mutation
  const markAllReadMutation = useMutation({
    mutationFn: () => notificationService.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  // Outside click and Esc key to close dropdown
  useEffect(() => {
    if (!dropdownOpen) return;

    const handleClickOutside = (e) => {
      if (bellContainerRef.current && !bellContainerRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [dropdownOpen]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleNotificationClick = (item) => {
    if (!item.isRead) {
      markReadMutation.mutate(item._id);
    }
    setDropdownOpen(false);

    if (item.type === 'recruiter_approved' || item.type === 'recruiter_rejected') {
      navigate('/recruiter/dashboard');
      return;
    }

    if (role === 'student') {
      if (
        (item.type === 'application_shortlisted' || item.type === 'application_accepted') &&
        item.applicationId
      ) {
        navigate(`/chat/${item.applicationId}`);
      } else {
        navigate('/student/applications');
      }
      return;
    }

    if (role === 'recruiter') {
      if (item.openingId) {
        navigate(`/recruiter/openings/${item.openingId}/candidates`);
      } else {
        navigate('/recruiter/dashboard');
      }
      return;
    }

    if (role === 'admin') {
      navigate('/admin/dashboard');
    }
  };

  const formatNotificationTime = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const navLinkClass = ({ isActive }) =>
    isActive
      ? 'text-primary font-bold border-b-2 border-primary pb-1 transition-all duration-150'
      : 'text-text-muted hover:text-primary transition-colors duration-150 pb-1';

  return (
    <header className="w-full top-0 bg-background border-b border-border-hairline sticky z-50">
      <div className="flex justify-between items-center w-full px-4 md:px-8 lg:px-16 py-5 max-w-[1440px] mx-auto">
        {/* Brand Logo */}
        <div className="flex items-center gap-4 lg:gap-8">
          <Link
            to={isAuthenticated ? getRoleDashboard(role) : '/'}
            className="font-display-xl text-2xl md:text-3xl font-extrabold tracking-tighter text-primary hover:text-match-indicator transition-colors whitespace-nowrap"
          >
            TALENT MATCH
          </Link>

          {/* Role-Specific Navigation Links (Desktop) */}
          {isAuthenticated && (
            <nav className="hidden md:flex gap-4 lg:gap-6 items-center font-label-mono text-label-mono text-xs lg:text-sm">
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
        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          {isAuthenticated ? (
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Notification Bell for All Roles */}
              <div className="relative" ref={bellContainerRef}>
                <button
                  type="button"
                  onClick={() => setDropdownOpen((prev) => !prev)}
                  aria-expanded={dropdownOpen}
                  aria-haspopup="true"
                  aria-label={`Notifications (${unreadCount} unread)`}
                  className="relative p-2 text-text-muted hover:text-primary transition-colors border border-border-hairline rounded hover:bg-surface-container flex items-center justify-center cursor-pointer"
                >
                  <span className="material-symbols-outlined text-xl leading-none">
                    notifications
                  </span>
                  {unreadCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 bg-match-indicator text-white text-[10px] font-label-mono font-bold rounded-full min-w-4 h-4 px-1 flex items-center justify-center border-2 border-background">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </button>

                {/* Dropdown Menu */}
                {dropdownOpen && (
                  <div
                    role="menu"
                    aria-label="Notifications"
                    className="absolute right-0 mt-2 w-80 sm:w-96 bg-surface-container-lowest border border-border-hairline shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-150"
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between p-3.5 border-b border-border-hairline bg-surface-container-low/40">
                      <div className="flex items-center gap-2">
                        <h3 className="font-headline-md text-xs font-bold uppercase tracking-wider text-primary">
                          Notifications
                        </h3>
                        {unreadCount > 0 && (
                          <span className="font-label-mono text-[10px] bg-match-indicator/10 text-match-indicator border border-match-indicator/20 px-1.5 py-0.5 rounded font-bold">
                            {unreadCount} new
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => markAllReadMutation.mutate()}
                        disabled={unreadCount === 0 || markAllReadMutation.isPending}
                        className="font-label-mono text-[11px] text-text-muted hover:text-primary disabled:opacity-40 disabled:pointer-events-none uppercase tracking-wider underline cursor-pointer"
                      >
                        Mark all read
                      </button>
                    </div>

                    {/* List */}
                    <div className="max-h-80 overflow-y-auto divide-y divide-border-hairline">
                      {notificationsList.length === 0 ? (
                        <div className="p-6 text-center text-text-muted font-label-mono text-xs">
                          No notifications yet.
                        </div>
                      ) : (
                        notificationsList.map((item) => (
                          <div
                            key={item._id}
                            role="menuitem"
                            onClick={() => handleNotificationClick(item)}
                            className={`p-3.5 hover:bg-surface-container-low transition-colors cursor-pointer flex items-start gap-3 ${
                              !item.isRead ? 'bg-surface-container-low/40' : ''
                            }`}
                          >
                            <span
                              className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                                !item.isRead ? 'bg-match-indicator' : 'bg-transparent'
                              }`}
                            />
                            <div className="flex-grow min-w-0">
                              <p
                                className={`font-body-md text-xs leading-snug line-clamp-2 ${
                                  !item.isRead ? 'text-primary font-semibold' : 'text-text-muted'
                                }`}
                              >
                                {item.message}
                              </p>
                              <span className="font-label-mono text-[10px] text-text-muted mt-1 block">
                                {formatNotificationTime(item.createdAt)}
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Role badge */}
              <span className="px-2 py-0.5 sm:px-2.5 sm:py-1 text-[10px] sm:text-[11px] font-label-mono font-semibold bg-surface-container border border-border-hairline text-primary uppercase rounded tracking-wider">
                {role}
              </span>

              {/* User info */}
              <span className="hidden lg:inline font-label-mono text-xs text-text-muted max-w-[150px] truncate">
                {user?.name || user?.email}
              </span>

              {/* Avatar circle */}
              <div className="w-8 h-8 rounded-full border border-border-hairline bg-primary text-on-primary flex items-center justify-center font-display-xl font-bold text-xs uppercase shrink-0">
                {(user?.name || user?.email || role || 'U')[0]}
              </div>

              {/* Sign out button */}
              <button
                onClick={handleLogout}
                className="font-label-mono text-label-mono text-xs px-2.5 py-1 sm:px-3 sm:py-1.5 border border-border-hairline text-primary hover:bg-black hover:text-white transition-all uppercase tracking-wider whitespace-nowrap cursor-pointer"
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
