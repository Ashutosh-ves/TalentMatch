import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from '../components/common/ProtectedRoute';
import { useAuth } from '../hooks/useAuth';

vi.mock('../hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('redirects unauthenticated users to /login', () => {
    useAuth.mockReturnValue({
      isAuthenticated: false,
      role: null,
      loading: false,
    });

    render(
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route
            path="/protected"
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <div>Protected Student Content</div>
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<div>Login Page</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Login Page')).toBeInTheDocument();
    expect(screen.queryByText('Protected Student Content')).not.toBeInTheDocument();
  });

  it('redirects users with wrong role to their own dashboard', () => {
    // Authenticated as student, but route requires recruiter
    useAuth.mockReturnValue({
      isAuthenticated: true,
      role: 'student',
      loading: false,
    });

    render(
      <MemoryRouter initialEntries={['/recruiter/post']}>
        <Routes>
          <Route
            path="/recruiter/post"
            element={
              <ProtectedRoute allowedRoles={['recruiter']}>
                <div>Recruiter Job Post Form</div>
              </ProtectedRoute>
            }
          />
          <Route path="/student/dashboard" element={<div>Student Dashboard</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Student Dashboard')).toBeInTheDocument();
    expect(screen.queryByText('Recruiter Job Post Form')).not.toBeInTheDocument();
  });

  it('renders children when authenticated with authorized role', () => {
    useAuth.mockReturnValue({
      isAuthenticated: true,
      role: 'recruiter',
      loading: false,
    });

    render(
      <MemoryRouter initialEntries={['/recruiter/post']}>
        <Routes>
          <Route
            path="/recruiter/post"
            element={
              <ProtectedRoute allowedRoles={['recruiter']}>
                <div>Recruiter Job Post Form</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Recruiter Job Post Form')).toBeInTheDocument();
  });
});
