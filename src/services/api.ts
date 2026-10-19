import { STORAGE_KEYS } from '../utils/storage';

export interface AuthUser {
  id: number;
  email: string;
  displayName: string;
  createdAt: string;
}

export interface AuthSession {
  token: string;
  user: AuthUser;
}

export interface AuthCredentials {
  email: string;
  password: string;
}

export interface RegisterInput extends AuthCredentials {
  displayName: string;
}

export interface ApiErrorDetail {
  path: string;
  message: string;
}

export class ApiError extends Error {
  readonly status: number;
  readonly details: ApiErrorDetail[];

  constructor(message: string, status: number, details: ApiErrorDetail[] = []) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

const API_BASE = import.meta.env.VITE_API_URL || '/api';

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  return { ...value };
}

export function getToken(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEYS.authToken);
  } catch {
    return null;
  }
}

export function setToken(token: string | null): void {
  try {
    if (token === null) {
      window.localStorage.removeItem(STORAGE_KEYS.authToken);
    } else {
      window.localStorage.setItem(STORAGE_KEYS.authToken, token);
    }
  } catch {
    /* storage unavailable — the session stays in memory only */
  }
}

async function readPayload(response: Response): Promise<unknown> {
  try {
    const payload: unknown = await response.json();
    return payload;
  } catch {
    return null;
  }
}

function parseDetails(payload: unknown): ApiErrorDetail[] {
  const record = asRecord(payload);
  const details = record?.['details'];
  if (!Array.isArray(details)) return [];
  return details.flatMap((item) => {
    const entry = asRecord(item);
    const path = entry?.['path'];
    const message = entry?.['message'];
    return typeof path === 'string' && typeof message === 'string' ? [{ path, message }] : [];
  });
}

function parseUser(value: unknown): AuthUser {
  const record = asRecord(value);
  const id = record?.['id'];
  const email = record?.['email'];
  const displayName = record?.['displayName'];
  const createdAt = record?.['createdAt'];
  if (
    typeof id !== 'number' ||
    typeof email !== 'string' ||
    typeof displayName !== 'string' ||
    typeof createdAt !== 'string'
  ) {
    throw new ApiError('Unexpected user payload', 500);
  }
  return { id, email, displayName, createdAt };
}

function parseSession(payload: unknown): AuthSession {
  const record = asRecord(payload);
  const token = record?.['token'];
  if (typeof token !== 'string' || token.length === 0) {
    throw new ApiError('Unexpected session payload', 500);
  }
  return { token, user: parseUser(record?.['user']) };
}

async function request(path: string, init: RequestInit = {}): Promise<unknown> {
  const headers = new Headers(init.headers);
  if (init.body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  const token = getToken();
  if (token !== null) headers.set('Authorization', `Bearer ${token}`);

  const response = await fetch(`${API_BASE}${path}`, { ...init, headers });
  const payload = await readPayload(response);

  if (!response.ok) {
    const record = asRecord(payload);
    const error = record?.['error'];
    const message =
      typeof error === 'string' ? error : `Request failed with status ${response.status}`;
    throw new ApiError(message, response.status, parseDetails(payload));
  }

  return payload;
}

export async function register(input: RegisterInput): Promise<AuthSession> {
  const payload = await request('/auth/register', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return parseSession(payload);
}

export async function login(credentials: AuthCredentials): Promise<AuthSession> {
  const payload = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  });
  return parseSession(payload);
}

export async function fetchMe(): Promise<AuthUser> {
  const payload = await request('/auth/me');
  const record = asRecord(payload);
  return parseUser(record?.['user']);
}
