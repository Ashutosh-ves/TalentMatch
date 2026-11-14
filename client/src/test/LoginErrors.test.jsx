import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Login } from '../pages/Login';
import { authService } from '../services/authService';
import { useAuth } from '../hooks/useAuth';

vi.mock('../hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../services/authService', () => ({
  authService: {
    login: vi.fn(),
  },
  default: {
    login: vi.fn(),
  },
}));

describe('Login Error Mapping', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.mockReturnValue({
      isAuthenticated: false,
      role: null,
      login: vi.fn(),
    });
  });

  const submitForm = () => {
    fireEvent.change(screen.getByPlaceholderText(/enter your email/i), {
      target: { value: 'user@talentmatch.com' },
    });
    fireEvent.change(screen.getByPlaceholderText(/enter your password/i), {
      target: { value: 'password123' },
    });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
  };

  it('displays connection error message when server is unreachable (no err.response)', async () => {
    authService.login.mockRejectedValueOnce(new Error('Network Error'));

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    submitForm();

    await waitFor(() => {
      expect(
        screen.getByText("Can't reach the server. Check your connection and try again in a moment.")
      ).toBeInTheDocument();
    });
  });

  it('displays rate limit message on HTTP 429', async () => {
    authService.login.mockRejectedValueOnce({
      response: { status: 429 },
    });

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    submitForm();

    await waitFor(() => {
      expect(screen.getByText('Too many attempts. Please wait a few minutes.')).toBeInTheDocument();
    });
  });

  it('displays generic server error message on HTTP 5xx', async () => {
    authService.login.mockRejectedValueOnce({
      response: { status: 500 },
    });

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    submitForm();

    await waitFor(() => {
      expect(screen.getByText('Something went wrong on our side. Please try again.')).toBeInTheDocument();
    });
  });

  it('displays "Invalid credentials." title on HTTP 401', async () => {
    authService.login.mockRejectedValueOnce({
      response: {
        status: 401,
        data: { message: 'Invalid email or password.' },
      },
    });

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    submitForm();

    await waitFor(() => {
      expect(screen.getByText('Invalid credentials.')).toBeInTheDocument();
      expect(screen.getByText('Invalid email or password.')).toBeInTheDocument();
    });
  });
});
