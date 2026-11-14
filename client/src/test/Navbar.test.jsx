import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Navbar } from '../components/common/Navbar';
import { useAuth } from '../hooks/useAuth';

vi.mock('../hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../services/notificationService', () => ({
  notificationService: {
    getNotifications: vi.fn().mockResolvedValue({ notifications: [], unreadCount: 0 }),
    markAsRead: vi.fn().mockResolvedValue({}),
    markAllAsRead: vi.fn().mockResolvedValue({}),
  },
}));

describe('Navbar mobile drawer', () => {
  let queryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    useAuth.mockReturnValue({
      isAuthenticated: true,
      user: { name: 'Ashutosh M', email: 'ashu@test.com' },
      role: 'student',
      logout: vi.fn(),
    });
  });

  const renderNavbar = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <Navbar />
        </MemoryRouter>
      </QueryClientProvider>
    );
  };

  it('toggles aria-expanded between false and true on mobile menu button click', () => {
    renderNavbar();

    const menuButton = screen.getByRole('button', { name: /open navigation menu/i });
    expect(menuButton).toHaveAttribute('aria-expanded', 'false');

    // Click to open
    fireEvent.click(menuButton);
    expect(menuButton).toHaveAttribute('aria-expanded', 'true');
    expect(menuButton).toHaveAttribute('aria-label', 'Close navigation menu');

    // Click again to close
    fireEvent.click(menuButton);
    expect(menuButton).toHaveAttribute('aria-expanded', 'false');
    expect(menuButton).toHaveAttribute('aria-label', 'Open navigation menu');
  });

  it('closes mobile drawer and sets aria-expanded to false on Escape key press', () => {
    renderNavbar();

    const menuButton = screen.getByRole('button', { name: /open navigation menu/i });
    expect(menuButton).toHaveAttribute('aria-expanded', 'false');

    // Open menu
    fireEvent.click(menuButton);
    expect(menuButton).toHaveAttribute('aria-expanded', 'true');

    // Press Escape
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(menuButton).toHaveAttribute('aria-expanded', 'false');
  });
});
