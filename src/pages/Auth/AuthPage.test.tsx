import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '../../auth/AuthProvider';
import { ROUTES } from '../../routes';
import { getToken } from '../../services/api';
import { LoginPage } from './LoginPage';
import { SignupPage } from './SignupPage';

const USER = {
  id: 1,
  email: 'ada@example.com',
  displayName: 'Ada Lovelace',
  createdAt: '2026-01-01T00:00:00.000Z',
};

type FetchArgs = [input: RequestInfo | URL, init?: RequestInit];

const fetchMock = vi.fn<(...args: FetchArgs) => Promise<Response>>();

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

beforeEach(() => {
  window.localStorage.clear();
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  window.localStorage.clear();
});

function renderPage(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <Routes>
          <Route path={ROUTES.login} element={<LoginPage />} />
          <Route path={ROUTES.signup} element={<SignupPage />} />
          <Route path={ROUTES.home} element={<p>Home destination</p>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

function fillLogin() {
  fireEvent.change(screen.getByLabelText('Email'), {
    target: { value: ' Ada@Example.com ' },
  });
  fireEvent.change(screen.getByLabelText('Password'), {
    target: { value: 'password123' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Log in' }));
}

describe('login page', () => {
  it('logs in, stores the token and redirects home', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ token: 'fresh-token', user: USER }));

    renderPage(ROUTES.login);
    fillLogin();

    expect(await screen.findByText('Home destination')).toBeTruthy();
    expect(getToken()).toBe('fresh-token');

    const call = fetchMock.mock.calls[0];
    if (!call) throw new Error('fetch was not called');
    expect(String(call[0])).toBe('/api/auth/login');
    expect(call[1]?.body).toBe(
      JSON.stringify({ email: 'ada@example.com', password: 'password123' }),
    );
  });

  it('shows the API error and stays on the page when credentials are rejected', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ error: 'Invalid email or password' }, 401));

    renderPage(ROUTES.login);
    fillLogin();

    expect(await screen.findByText('Invalid email or password')).toBeTruthy();
    expect(screen.queryByText('Home destination')).toBeNull();
    expect(screen.getByRole('button', { name: 'Log in' })).toBeTruthy();
  });
});

describe('signup page', () => {
  it('validates fields before calling the API', () => {
    renderPage(ROUTES.signup);

    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    expect(screen.getByText('Email is required.')).toBeTruthy();
    expect(screen.getByText('Password must be at least 8 characters.')).toBeTruthy();
    expect(screen.getByText('Display name must be 2 to 60 characters.')).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('maps server field errors back to the form', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(
        {
          error: 'Invalid input',
          details: [{ path: 'email', message: 'Email already registered' }],
        },
        409,
      ),
    );

    renderPage(ROUTES.signup);
    fireEvent.change(screen.getByLabelText('Display name'), {
      target: { value: 'Ada Lovelace' },
    });
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'ada@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'password123' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findByText('Invalid input')).toBeTruthy();
    expect(screen.getByText('Email already registered')).toBeTruthy();
    expect(screen.queryByText('Home destination')).toBeNull();
  });
});
