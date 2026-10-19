import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AuthContext, type AuthState, type AuthStatus } from '../../auth/AuthContext';
import { ProtectedRoute } from './ProtectedRoute';

afterEach(cleanup);

function authValue(status: AuthStatus): AuthState {
  return {
    status,
    user: null,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
  };
}

function renderAt(status: AuthStatus, redirectTo?: string) {
  return render(
    <AuthContext.Provider value={authValue(status)}>
      <MemoryRouter initialEntries={['/private']}>
        <Routes>
          <Route
            path="/private"
            element={
              <ProtectedRoute redirectTo={redirectTo}>
                <p>Secret area</p>
              </ProtectedRoute>
            }
          />
          <Route path="/" element={<p>Public home</p>} />
          <Route path="/login" element={<p>Login page</p>} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  );
}

describe('ProtectedRoute', () => {
  it('renders children for authenticated users', () => {
    renderAt('authenticated');

    expect(screen.getByText('Secret area')).toBeTruthy();
  });

  it('redirects anonymous visitors to home by default', () => {
    renderAt('anonymous');

    expect(screen.getByText('Public home')).toBeTruthy();
    expect(screen.queryByText('Secret area')).toBeNull();
  });

  it('honors a custom redirect target', () => {
    renderAt('anonymous', '/login');

    expect(screen.getByText('Login page')).toBeTruthy();
    expect(screen.queryByText('Secret area')).toBeNull();
  });

  it('shows a status fallback while the session is loading', () => {
    renderAt('loading');

    expect(screen.getByText('Loading…')).toBeTruthy();
    expect(screen.queryByText('Secret area')).toBeNull();
  });
});
