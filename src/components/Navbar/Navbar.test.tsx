import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { AuthContext, type AuthState } from '../../auth/AuthContext';
import { ThemeProvider } from '../../theme/ThemeProvider';
import { Navbar } from './Navbar';

const USER = {
  id: 1,
  email: 'ada@example.com',
  displayName: 'Ada Lovelace',
  createdAt: '2026-01-01T00:00:00.000Z',
};

function authValue(overrides: Partial<AuthState> = {}): AuthState {
  return {
    status: 'anonymous',
    user: null,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    ...overrides,
  };
}

afterEach(cleanup);

function RouteControl() {
  const navigate = useNavigate();
  return (
    <button type="button" onClick={() => navigate('/practice')}>
      go-practice
    </button>
  );
}

function renderNavbar(path = '/', auth = authValue()) {
  render(
    <ThemeProvider>
      <MemoryRouter initialEntries={[path]}>
        <AuthContext.Provider value={auth}>
          <Navbar />
          <RouteControl />
        </AuthContext.Provider>
      </MemoryRouter>
    </ThemeProvider>
  );
}

function panel() {
  const element = document.getElementById('navbar-nav');
  if (!element) throw new Error('navbar panel not found');
  return element;
}

describe('Navbar mobile menu', () => {
  it('exposes a collapsed menu toggle by default', () => {
    renderNavbar();

    const toggle = screen.getByRole('button', { name: 'Open menu' });
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(toggle.getAttribute('aria-controls')).toBe('navbar-nav');
  });

  it('opens and closes the panel on toggle click', () => {
    renderNavbar();

    fireEvent.click(screen.getByRole('button', { name: 'Open menu' }));

    expect(panel().className).toContain('navbar__links--open');
    expect(
      screen.getByRole('button', { name: 'Close menu' }).getAttribute('aria-expanded')
    ).toBe('true');

    fireEvent.click(screen.getByRole('button', { name: 'Close menu' }));

    expect(panel().className).not.toContain('navbar__links--open');
    expect(screen.getByRole('button', { name: 'Open menu' })).toBeTruthy();
  });

  it('closes on Escape and returns focus to the toggle', () => {
    renderNavbar();

    const toggle = screen.getByRole('button', { name: 'Open menu' });
    fireEvent.click(toggle);
    fireEvent.keyDown(toggle, { key: 'Escape' });

    expect(screen.getByRole('button', { name: 'Open menu' })).toBeTruthy();
    expect(panel().className).not.toContain('navbar__links--open');
    expect(document.activeElement).toBe(toggle);
  });

  it('closes when a route link is clicked, even without a path change', () => {
    renderNavbar('/study');

    fireEvent.click(screen.getByRole('button', { name: 'Open menu' }));
    fireEvent.click(screen.getByRole('link', { name: 'Study' }));

    expect(panel().className).not.toContain('navbar__links--open');
  });

  it('closes when a home section link is clicked', () => {
    renderNavbar('/');

    fireEvent.click(screen.getByRole('button', { name: 'Open menu' }));
    fireEvent.click(screen.getByRole('button', { name: 'Study paths' }));

    expect(panel().className).not.toContain('navbar__links--open');
  });

  it('closes when the route changes', () => {
    renderNavbar('/');

    fireEvent.click(screen.getByRole('button', { name: 'Open menu' }));
    fireEvent.click(screen.getByRole('button', { name: 'go-practice' }));

    expect(panel().className).not.toContain('navbar__links--open');
    expect(screen.getByRole('button', { name: 'Open menu' })).toBeTruthy();
  });
});

describe('Navbar auth state', () => {
  it('offers login and signup links in the mobile menu when anonymous', () => {
    renderNavbar('/study');

    fireEvent.click(screen.getByRole('button', { name: 'Open menu' }));

    expect(within(panel()).getByRole('link', { name: 'Log in' }).getAttribute('href')).toBe(
      '/login',
    );
    expect(within(panel()).getByRole('link', { name: 'Sign up' }).getAttribute('href')).toBe(
      '/signup',
    );
  });

  it('shows the user and logs out from the mobile menu', () => {
    const logout = vi.fn();
    renderNavbar('/study', authValue({ status: 'authenticated', user: USER, logout }));

    fireEvent.click(screen.getByRole('button', { name: 'Open menu' }));

    expect(within(panel()).getByText('Ada Lovelace')).toBeTruthy();
    fireEvent.click(within(panel()).getByRole('button', { name: 'Log out' }));

    expect(logout).toHaveBeenCalledTimes(1);
    expect(panel().className).not.toContain('navbar__links--open');
  });
});
