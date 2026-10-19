import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getToken, setToken } from '../services/api';
import { AuthProvider } from './AuthProvider';
import { useAuth } from './useAuth';

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

function renderAuth() {
  return renderHook(() => useAuth(), { wrapper: AuthProvider });
}

describe('AuthProvider', () => {
  it('starts anonymous without touching the network when no token is stored', () => {
    const { result } = renderAuth();

    expect(result.current.status).toBe('anonymous');
    expect(result.current.user).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('restores the session when a stored token resolves to a user', async () => {
    setToken('stored-token');
    fetchMock.mockResolvedValue(jsonResponse({ user: USER }));

    const { result } = renderAuth();

    await waitFor(() => expect(result.current.status).toBe('authenticated'));
    expect(result.current.user).toEqual(USER);
    const call = fetchMock.mock.calls[0];
    if (!call) throw new Error('fetch was not called');
    expect(String(call[0])).toBe('/api/auth/me');
  });

  it('clears an invalid stored token and falls back to anonymous', async () => {
    setToken('stale-token');
    fetchMock.mockResolvedValue(jsonResponse({ error: 'Invalid or expired token' }, 401));

    const { result } = renderAuth();

    await waitFor(() => expect(result.current.status).toBe('anonymous'));
    expect(getToken()).toBeNull();
    expect(result.current.user).toBeNull();
  });

  it('login stores the token and exposes the user', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ token: 'fresh-token', user: USER }));
    const { result } = renderAuth();

    await act(async () => {
      await result.current.login({ email: 'ada@example.com', password: 'password123' });
    });

    expect(getToken()).toBe('fresh-token');
    expect(result.current.status).toBe('authenticated');
    expect(result.current.user?.email).toBe('ada@example.com');
  });

  it('register stores the token and exposes the user', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ token: 'new-token', user: USER }, 201));
    const { result } = renderAuth();

    await act(async () => {
      await result.current.register({
        email: 'ada@example.com',
        password: 'password123',
        displayName: 'Ada Lovelace',
      });
    });

    expect(getToken()).toBe('new-token');
    expect(result.current.status).toBe('authenticated');
  });

  it('logout clears the token and the user', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ token: 'fresh-token', user: USER }));
    const { result } = renderAuth();
    await act(async () => {
      await result.current.login({ email: 'ada@example.com', password: 'password123' });
    });

    act(() => {
      result.current.logout();
    });

    expect(getToken()).toBeNull();
    expect(result.current.status).toBe('anonymous');
    expect(result.current.user).toBeNull();
  });

  it('useAuth throws outside of an AuthProvider', () => {
    expect(() => renderHook(() => useAuth())).toThrow(
      'useAuth must be used within an AuthProvider',
    );
  });
});
