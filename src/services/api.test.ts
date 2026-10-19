import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, fetchMe, getToken, login, register, setToken } from './api';

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

function firstCall(): FetchArgs {
  const call = fetchMock.mock.calls[0];
  if (!call) throw new Error('fetch was not called');
  return call;
}

beforeEach(() => {
  window.localStorage.clear();
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  window.localStorage.clear();
});

describe('api client', () => {
  it('posts registration JSON and parses the session', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ token: 'jwt-token', user: USER }, 201));

    const input = { email: 'ada@example.com', password: 'password123', displayName: 'Ada Lovelace' };
    const session = await register(input);

    const [url, init] = firstCall();
    expect(String(url)).toBe('/api/auth/register');
    expect(init?.method).toBe('POST');
    expect(init?.body).toBe(JSON.stringify(input));
    const headers = new Headers(init?.headers);
    expect(headers.get('content-type')).toBe('application/json');
    expect(headers.get('authorization')).toBeNull();

    expect(session.token).toBe('jwt-token');
    expect(session.user.email).toBe('ada@example.com');
  });

  it('throws an ApiError carrying the server message and field details', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(
        {
          error: 'Invalid input',
          details: [{ path: 'email', message: 'Invalid email' }],
        },
        400,
      ),
    );

    const error: unknown = await login({ email: 'bad', password: 'x' }).catch(
      (caught: unknown) => caught,
    );

    expect(error).toBeInstanceOf(ApiError);
    if (!(error instanceof ApiError)) return;
    expect(error.status).toBe(400);
    expect(error.message).toBe('Invalid input');
    expect(error.details).toEqual([{ path: 'email', message: 'Invalid email' }]);
  });

  it('falls back to a status message when the error body is not JSON', async () => {
    fetchMock.mockResolvedValue(new Response('<html>oops</html>', { status: 502 }));

    const error: unknown = await fetchMe().catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ApiError);
    if (!(error instanceof ApiError)) return;
    expect(error.status).toBe(502);
    expect(error.message).toBe('Request failed with status 502');
  });

  it('attaches the stored bearer token and unwraps the current user', async () => {
    setToken('stored-token');
    fetchMock.mockResolvedValue(jsonResponse({ user: USER }));

    const user = await fetchMe();

    const [url, init] = firstCall();
    expect(String(url)).toBe('/api/auth/me');
    expect(new Headers(init?.headers).get('authorization')).toBe('Bearer stored-token');
    expect(user).toEqual(USER);
  });

  it('rejects an unexpected success payload', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ token: '', user: USER }));

    await expect(login({ email: 'ada@example.com', password: 'password123' })).rejects.toThrow(
      ApiError,
    );
  });

  it('stores and clears the token', () => {
    expect(getToken()).toBeNull();
    setToken('abc');
    expect(getToken()).toBe('abc');
    setToken(null);
    expect(getToken()).toBeNull();
  });
});
