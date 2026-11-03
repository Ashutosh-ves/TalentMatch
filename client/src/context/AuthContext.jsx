import { createContext, useState, useEffect, useCallback } from 'react';
import { authService } from '../services/authService';

export const AuthContext = createContext(null);

const TOKEN_KEY = 'talent_match_token';
const USER_KEY = 'talent_match_user';

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => {
    return localStorage.getItem(TOKEN_KEY) || null;
  });

  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem(USER_KEY);
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });

  // Real loading state initialized based on whether a token is stored
  const [loading, setLoading] = useState(() => Boolean(localStorage.getItem(TOKEN_KEY)));

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }, []);

  // Validate stored token and refresh user on load
  useEffect(() => {
    const storedToken = localStorage.getItem(TOKEN_KEY);
    if (!storedToken) return;

    let isMounted = true;
    authService
      .getMe()
      .then((res) => {
        if (!isMounted) return;
        if (res.success && res.user) {
          const normalizedUser = {
            ...res.user,
            id: res.user._id || res.user.id,
          };
          setUser(normalizedUser);
          localStorage.setItem(USER_KEY, JSON.stringify(normalizedUser));
        }
      })
      .catch((err) => {
        if (err?.response?.status === 401) {
          if (isMounted) {
            logout();
          }
        }
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [logout]);

  // Method to refresh user on demand (e.g. on RecruiterDashboard mount)
  const refreshUser = useCallback(async () => {
    const currentToken = localStorage.getItem(TOKEN_KEY);
    if (!currentToken) return null;

    try {
      const res = await authService.getMe();
      if (res.success && res.user) {
        const normalizedUser = {
          ...res.user,
          id: res.user._id || res.user.id,
        };
        setUser(normalizedUser);
        localStorage.setItem(USER_KEY, JSON.stringify(normalizedUser));
        return normalizedUser;
      }
    } catch {
      // Ignored or handled by 401 interceptor
    }
    return null;
  }, []);

  const role = user?.role || null;
  const isAuthenticated = Boolean(token && user);

  const login = (userData, authToken) => {
    const normalizedUser = userData
      ? {
          ...userData,
          id: userData._id || userData.id,
        }
      : null;

    setUser(normalizedUser);
    setToken(authToken);

    if (authToken) {
      localStorage.setItem(TOKEN_KEY, authToken);
    }
    if (normalizedUser) {
      localStorage.setItem(USER_KEY, JSON.stringify(normalizedUser));
    }
  };

  const updateUser = (updatedUser) => {
    const normalized = updatedUser
      ? {
          ...updatedUser,
          id: updatedUser._id || updatedUser.id,
        }
      : null;
    setUser(normalized);
    if (normalized) {
      localStorage.setItem(USER_KEY, JSON.stringify(normalized));
    }
  };

  const value = {
    user,
    token,
    role,
    isAuthenticated,
    loading,
    login,
    logout,
    updateUser,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export default AuthContext;
