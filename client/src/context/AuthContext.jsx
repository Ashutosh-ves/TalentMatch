import { createContext, useState } from 'react';

export const AuthContext = createContext(null);

const TOKEN_KEY = 'talent_match_token';
const USER_KEY = 'talent_match_user';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem(USER_KEY);
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState(() => {
    return localStorage.getItem(TOKEN_KEY) || null;
  });

  const loading = false;

  const role = user?.role || null;
  const isAuthenticated = Boolean(token && user);

  const login = (userData, authToken) => {
    setUser(userData);
    setToken(authToken);
    if (authToken) {
      localStorage.setItem(TOKEN_KEY, authToken);
    }
    if (userData) {
      localStorage.setItem(USER_KEY, JSON.stringify(userData));
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  };

  const updateUser = (updatedUser) => {
    setUser(updatedUser);
    localStorage.setItem(USER_KEY, JSON.stringify(updatedUser));
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
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
