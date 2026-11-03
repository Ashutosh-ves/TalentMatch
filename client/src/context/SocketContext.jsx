import { createContext, useEffect, useState, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../hooks/useAuth';

export const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { token, isAuthenticated, refreshUser } = useAuth();
  const queryClient = useQueryClient();
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [toasts, setToasts] = useState([]);

  const socketRef = useRef(null);
  const refreshUserRef = useRef(refreshUser);

  useEffect(() => {
    refreshUserRef.current = refreshUser;
  }, [refreshUser]);

  const addToast = useCallback((notification) => {
    const id = notification._id || `${Date.now()}-${Math.random()}`;
    const newToast = {
      id,
      message: notification.message || 'New notification',
      type: notification.type || 'info',
    };
    setToasts((prev) => [...prev, newToast]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    // Only connect if user is authenticated and has a valid token
    if (!isAuthenticated || !token) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

    const s = io(socketUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socketRef.current = s;

    s.on('connect', () => {
      setIsConnected(true);
    });

    s.on('disconnect', () => {
      setIsConnected(false);
    });

    s.on('connect_error', (err) => {
      console.warn('Socket connection warning:', err.message);
      setIsConnected(false);
    });

    // 1. Notification Event Handler
    s.on('notification', (notification) => {
      if (!notification) return;

      // Update ['notifications'] React Query cache
      queryClient.setQueryData(['notifications'], (old) => {
        if (!old) return old;
        const currentList = old.notifications || [];
        if (currentList.some((n) => n._id === notification._id)) return old;
        return {
          ...old,
          count: (old.count || 0) + 1,
          unreadCount: (old.unreadCount || 0) + (notification.isRead ? 0 : 1),
          notifications: [notification, ...currentList],
        };
      });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });

      // Show auto-dismiss toast (~5s)
      addToast(notification);

      // On approval/rejection notification, refresh user to update pending banner live
      if (
        notification.type === 'recruiter_approved' ||
        notification.type === 'recruiter_rejected'
      ) {
        refreshUserRef.current?.();
      }
    });

    // 2. Application Updated Event Handler
    s.on('application_updated', () => {
      // Invalidate relevant query keys
      queryClient.invalidateQueries({ queryKey: ['myApplications'] });
      queryClient.invalidateQueries({ queryKey: ['openingRankedCandidates'] });
      queryClient.invalidateQueries({ queryKey: ['openingApplications'] });
      queryClient.invalidateQueries({ queryKey: ['application'] });
      queryClient.invalidateQueries({ queryKey: ['allRecruiterApplications'] });
      queryClient.invalidateQueries({ queryKey: ['myOpenings'] });
      queryClient.invalidateQueries({ queryKey: ['recommendedOpenings'] });
    });

    setSocket(s);

    const handleBeforeUnload = () => {
      s.disconnect();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handleBeforeUnload);
      s.disconnect();
      socketRef.current = null;
    };
  }, [token, isAuthenticated, queryClient, addToast]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}

      {/* Accessible Toast Notification Region */}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm pointer-events-none"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="status"
            className="pointer-events-auto bg-surface-container-lowest border border-border-hairline shadow-lg p-3.5 flex items-start justify-between gap-3 text-primary animate-in fade-in slide-in-from-bottom-2 duration-200"
          >
            <div className="flex items-start gap-2.5">
              <span className="w-2 h-2 rounded-full bg-match-indicator mt-1.5 shrink-0 animate-pulse" />
              <div>
                <p className="font-headline-md text-xs font-semibold text-primary">
                  Notification
                </p>
                <p className="font-body-md text-xs text-text-muted mt-0.5 leading-snug">
                  {toast.message}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => removeToast(toast.id)}
              className="text-text-muted hover:text-primary transition-colors text-base font-bold leading-none -mt-0.5 -mr-0.5 p-1 cursor-pointer"
              aria-label="Dismiss notification"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </SocketContext.Provider>
  );
}

export default SocketContext;
