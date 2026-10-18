import jwt from 'jsonwebtoken';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { signToken } from '../src/auth/tokens.js';
import { sqlite } from '../src/db/client.js';

const app = createApp();

const CREDENTIALS = {
  email: 'ada@example.com',
  password: 'password123',
  displayName: 'Ada Lovelace',
};

function register(overrides: Partial<typeof CREDENTIALS> = {}) {
  return request(app)
    .post('/api/auth/register')
    .send({ ...CREDENTIALS, ...overrides });
}

function login(email: string, password: string) {
  return request(app).post('/api/auth/login').send({ email, password });
}

beforeEach(() => {
  sqlite.prepare('DELETE FROM users').run();
});

describe('POST /api/auth/register', () => {
  it('creates the account and returns a token plus the public user', async () => {
    const response = await register();

    expect(response.status).toBe(201);
    expect(response.body.token).toEqual(expect.any(String));
    expect(response.body.user).toMatchObject({
      email: 'ada@example.com',
      displayName: 'Ada Lovelace',
    });
    expect(response.body.user.passwordHash).toBeUndefined();
  });

  it('normalizes email case and surrounding whitespace', async () => {
    const response = await register({ email: '  Ada@Example.COM ' });

    expect(response.status).toBe(201);
    expect(response.body.user.email).toBe('ada@example.com');
  });

  it('rejects an invalid payload with per-field details', async () => {
    const response = await register({ email: 'not-an-email', password: 'short' });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Invalid input');
    expect(response.body.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: 'email' }),
        expect.objectContaining({ path: 'password' }),
      ]),
    );
  });

  it('rejects a duplicate email regardless of case', async () => {
    await register();
    const response = await register({ email: 'ADA@example.com' });

    expect(response.status).toBe(409);
    expect(response.body.error).toBe('Email already registered');
  });
});

describe('POST /api/auth/login', () => {
  beforeEach(async () => {
    await register();
  });

  it('returns a token and the public user for correct credentials', async () => {
    const response = await login(CREDENTIALS.email, CREDENTIALS.password);

    expect(response.status).toBe(200);
    expect(response.body.token).toEqual(expect.any(String));
    expect(response.body.user.email).toBe(CREDENTIALS.email);
    expect(response.body.user.passwordHash).toBeUndefined();
  });

  it('accepts an email in a different case', async () => {
    const response = await login('ADA@EXAMPLE.COM', CREDENTIALS.password);

    expect(response.status).toBe(200);
  });

  it('rejects a wrong password with 401', async () => {
    const response = await login(CREDENTIALS.email, 'wrong-password');

    expect(response.status).toBe(401);
    expect(response.body.error).toBe('Invalid email or password');
  });

  it('rejects an unknown email with the same 401 shape', async () => {
    const response = await login('nobody@example.com', 'password123');

    expect(response.status).toBe(401);
    expect(response.body.error).toBe('Invalid email or password');
  });

  it('rejects a malformed body with 400', async () => {
    const response = await login('not-an-email', '');

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Invalid input');
  });
});

describe('GET /api/auth/me', () => {
  it('returns the current user for a valid bearer token', async () => {
    const registration = await register();
    const response = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${registration.body.token}`);

    expect(response.status).toBe(200);
    expect(response.body.user).toMatchObject({
      email: CREDENTIALS.email,
      displayName: CREDENTIALS.displayName,
    });
  });

  it('rejects a request without a token', async () => {
    const response = await request(app).get('/api/auth/me');

    expect(response.status).toBe(401);
    expect(response.body.error).toBe('Missing bearer token');
  });

  it('rejects a malformed authorization header', async () => {
    const response = await request(app).get('/api/auth/me').set('Authorization', 'Token abc');

    expect(response.status).toBe(401);
    expect(response.body.error).toBe('Missing bearer token');
  });

  it('rejects a garbage token', async () => {
    const response = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer not-a-jwt');

    expect(response.status).toBe(401);
    expect(response.body.error).toBe('Invalid or expired token');
  });

  it('rejects a token signed with the wrong secret', async () => {
    const forged = jwt.sign({ sub: '1' }, 'a-different-secret-0123456789');
    const response = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${forged}`);

    expect(response.status).toBe(401);
    expect(response.body.error).toBe('Invalid or expired token');
  });

  it('rejects a valid token whose user no longer exists', async () => {
    const response = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${signToken(9999)}`);

    expect(response.status).toBe(401);
    expect(response.body.error).toBe('Unauthorized');
  });
});
