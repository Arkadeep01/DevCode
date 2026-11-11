import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Database from 'better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { parseEnv } from '../src/config/env.js';
import { migrationsFolder } from '../src/config/paths.js';

const BASE_ENV = { JWT_SECRET: 'test-only-secret-0123456789abcdef' };
const REMOTE_DATABASE_URL = 'libsql://devcode-production.turso.io';

/** A production environment that points at a remote libSQL server. */
const PRODUCTION_ENV = {
  ...BASE_ENV,
  NODE_ENV: 'production',
  DATABASE_URL: REMOTE_DATABASE_URL,
};

describe('production environment validation', () => {
  it('refuses to boot in production with the placeholder JWT secret', () => {
    const result = parseEnv({
      ...PRODUCTION_ENV,
      JWT_SECRET: 'replace-me-with-a-long-random-string',
    });

    expect(result.success).toBe(false);
    expect(result.issues.join(' ')).toContain('JWT_SECRET');
  });

  it('accepts a real secret in production', () => {
    const result = parseEnv(PRODUCTION_ENV);

    expect(result.success).toBe(true);
  });

  it('refuses to boot in production when the database is a local file', () => {
    const result = parseEnv({ ...PRODUCTION_ENV, DATABASE_URL: './data/devcode.sqlite' });

    expect(result.success).toBe(false);
    expect(result.issues.join(' ')).toContain('DATABASE_URL');
  });

  it('refuses to boot in production with an explicit file: URL', () => {
    const result = parseEnv({ ...PRODUCTION_ENV, DATABASE_URL: 'file:./data/devcode.sqlite' });

    expect(result.success).toBe(false);
    expect(result.issues.join(' ')).toContain('DATABASE_URL');
  });

  it('allows a local database in production when it is explicitly acknowledged', () => {
    const result = parseEnv({
      ...PRODUCTION_ENV,
      DATABASE_URL: './data/devcode.sqlite',
      ALLOW_LOCAL_DATABASE: 'true',
    });

    expect(result.success).toBe(true);
  });

  it('allows a local database outside production', () => {
    const result = parseEnv({ ...BASE_ENV, DATABASE_URL: './data/devcode.sqlite' });

    expect(result.success).toBe(true);
  });

  it('refuses to boot in production when a live provider has no API key', () => {
    const result = parseEnv({
      ...PRODUCTION_ENV,
      COACH_PROVIDER: 'openai',
      COACH_API_KEY: '',
    });

    expect(result.success).toBe(false);
    expect(result.issues.join(' ')).toContain('COACH_API_KEY');
  });

  it('allows a live provider without a key outside production', () => {
    const result = parseEnv({ ...BASE_ENV, COACH_PROVIDER: 'openai' });

    expect(result.success).toBe(true);
  });

  it('parses TRUST_PROXY in its documented forms', () => {
    expect(parseEnv({ ...BASE_ENV, TRUST_PROXY: 'true' }).data?.TRUST_PROXY).toBe(true);
    expect(parseEnv({ ...BASE_ENV, TRUST_PROXY: 'false' }).data?.TRUST_PROXY).toBe(false);
    expect(parseEnv({ ...BASE_ENV, TRUST_PROXY: '2' }).data?.TRUST_PROXY).toBe(2);
    expect(parseEnv({ ...BASE_ENV, TRUST_PROXY: '' }).data?.TRUST_PROXY).toBe(false);
    expect(parseEnv(BASE_ENV).data?.TRUST_PROXY).toBe(false);
  });

  it('keeps the deployment knobs at safe defaults', () => {
    const data = parseEnv(BASE_ENV).data;

    expect(data?.AUTH_RATE_LIMIT_MAX).toBe(10);
    expect(data?.ATTEMPT_RATE_LIMIT_MAX).toBe(60);
    expect(data?.LOG_LEVEL).toBe('info');
    expect(data?.STATIC_DIR).toBeUndefined();
    expect(data?.SEED_ALLOW_PRODUCTION).toBe(false);
  });

  it('accepts a full-length provider token', () => {
    // A Turso read/write token is a ~350-character JWT. A short upper bound
    // on the secret would reject a valid production credential at boot.
    const tursoToken = `${'a'.repeat(340)}.${'b'.repeat(60)}.${'c'.repeat(40)}`;

    const result = parseEnv({
      ...BASE_ENV,
      DATABASE_URL: 'libsql://devcode-production.turso.io',
      DATABASE_AUTH_TOKEN: tursoToken,
    });

    expect(result.success).toBe(true);
    expect(result.data?.DATABASE_AUTH_TOKEN).toBe(tursoToken);
  });
});

describe('the rate limiter', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('rejects requests over the limit and advertises the retry delay', async () => {
    const { createRateLimiter } = await import('../src/middleware/rateLimit.js');
    const limiter = createRateLimiter({ windowMs: 60_000, max: 2 });

    const app = (await import('express')).default();
    app.get('/limited', limiter, (_req, res) => {
      res.json({ ok: true });
    });

    await request(app).get('/limited').expect(200);
    await request(app).get('/limited').expect(200);

    const blocked = await request(app).get('/limited');

    expect(blocked.status).toBe(429);
    expect(blocked.headers['retry-after']).toBeDefined();
    expect(blocked.body.error).toBe('Rate limit exceeded');
  });

  it('counts each key separately', async () => {
    const { createRateLimiter } = await import('../src/middleware/rateLimit.js');
    const limiter = createRateLimiter({
      windowMs: 60_000,
      max: 1,
      keyBy: (req) => String(req.headers['x-key'] ?? 'unknown'),
    });

    const app = (await import('express')).default();
    app.get('/limited', limiter, (_req, res) => {
      res.json({ ok: true });
    });

    await request(app).get('/limited').set('X-Key', 'a').expect(200);
    await request(app).get('/limited').set('X-Key', 'b').expect(200);
    await request(app).get('/limited').set('X-Key', 'a').expect(429);
  });
});

describe('the health endpoints', () => {
  it('reports liveness without touching a dependency', async () => {
    const { createApp } = await import('../src/app.js');

    const response = await request(createApp()).get('/api/live');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ status: 'ok' });
  });

  it('reports readiness with a live database ping', async () => {
    const { createApp } = await import('../src/app.js');

    const response = await request(createApp()).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ status: 'ok', db: 'ok' });
  });

  it('answers an unknown API route with JSON, not the SPA', async () => {
    const { createApp } = await import('../src/app.js');

    const response = await request(createApp()).get('/api/does-not-exist');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'Not found' });
  });

  it('answers a malformed JSON body with 400 and never echoes it', async () => {
    const { createApp } = await import('../src/app.js');

    const response = await request(createApp())
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"email":"a@b.c","password":"super-secret"');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Invalid request' });
    expect(JSON.stringify(response.body)).not.toContain('super-secret');
  });

  it('rejects a body larger than the configured limit', async () => {
    const { createApp } = await import('../src/app.js');

    const response = await request(createApp())
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ email: 'a@b.c', password: 'x'.repeat(2 * 1024 * 1024) }));

    expect(response.status).toBe(413);
    expect(response.body).toEqual({ error: 'Request body is too large' });
  });
});

describe('the CORS allow-list', () => {
  it('answers a configured browser origin with the matching header', async () => {
    const { createApp } = await import('../src/app.js');

    const response = await request(createApp())
      .get('/api/live')
      .set('Origin', 'http://localhost:3000');

    expect(response.status).toBe(200);
    expect(response.headers['access-control-allow-origin']).toBe('http://localhost:3000');
  });

  it('does not allow an origin that is not on the list', async () => {
    const { createApp } = await import('../src/app.js');

    const response = await request(createApp())
      .get('/api/live')
      .set('Origin', 'https://attacker.example');

    expect(response.status).toBe(200);
    expect(response.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('preflights a cross-origin POST only for a listed origin', async () => {
    const { createApp } = await import('../src/app.js');

    const allowed = await request(createApp())
      .options('/api/auth/login')
      .set('Origin', 'http://localhost:3000')
      .set('Access-Control-Request-Method', 'POST');

    expect(allowed.headers['access-control-allow-origin']).toBe('http://localhost:3000');
    expect(allowed.headers['access-control-allow-methods']).toContain('POST');

    const blocked = await request(createApp())
      .options('/api/auth/login')
      .set('Origin', 'https://attacker.example')
      .set('Access-Control-Request-Method', 'POST');

    expect(blocked.headers['access-control-allow-origin']).toBeUndefined();
  });
});

describe('the single-origin static deployment', () => {
  const originalStaticDir = process.env.STATIC_DIR;

  afterEach(() => {
    if (originalStaticDir === undefined) {
      delete process.env.STATIC_DIR;
    } else {
      process.env.STATIC_DIR = originalStaticDir;
    }
    vi.resetModules();
  });

  it('serves the SPA, falls back for deep links and keeps API routes JSON', async () => {
    const root = mkdtempSync(join(tmpdir(), 'devcode-static-'));
    writeFileSync(join(root, 'index.html'), '<!doctype html><title>DevCode</title><div id="root"></div>');
    writeFileSync(join(root, 'app.js'), 'console.log("app");');

    process.env.STATIC_DIR = root;
    vi.resetModules();

    const { createApp } = await import('../src/app.js');
    const app = createApp();

    const rootResponse = await request(app).get('/').set('Accept', 'text/html');
    expect(rootResponse.status).toBe(200);
    expect(rootResponse.text).toContain('<div id="root"></div>');

    // A deep link with a query string must return the app shell, not a 404.
    const deepLink = await request(app)
      .get('/study?topic=must-b-trees-vs-hash')
      .set('Accept', 'text/html');
    expect(deepLink.status).toBe(200);
    expect(deepLink.text).toContain('<div id="root"></div>');

    // A built asset is served as-is.
    const asset = await request(app).get('/app.js');
    expect(asset.status).toBe(200);
    expect(asset.text).toContain('console.log');

    // API routes keep answering with JSON even with the SPA mounted.
    const apiResponse = await request(app).get('/api/does-not-exist');
    expect(apiResponse.status).toBe(404);
    expect(apiResponse.body).toEqual({ error: 'Not found' });

    // A missing asset is not answered with the HTML shell.
    const missing = await request(app).get('/missing.js').set('Accept', '*/*');
    expect(missing.status).toBe(404);
  });
});

describe('the migration sequence', () => {
  it('creates the full schema on a disposable database', async () => {
    const root = mkdtempSync(join(tmpdir(), 'devcode-migrate-'));
    const file = join(root, 'fresh.sqlite');

    const sqlite = new Database(file);
    const db = drizzle(sqlite);

    migrate(db, { migrationsFolder });

    const tables = sqlite
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
      .all()
      .map((row) => (row as { name: string }).name);

    expect(tables).toEqual(
      expect.arrayContaining(['attempts', 'progress', 'questions', 'submissions', 'users']),
    );

    const indexes = sqlite
      .prepare("SELECT name FROM sqlite_master WHERE type = 'index' AND name LIKE '%unique'")
      .all()
      .map((row) => (row as { name: string }).name);

    expect(indexes).toEqual(
      expect.arrayContaining([
        'attempts_user_quiz_question_unique',
        'progress_user_topic_unique',
        'questions_slug_unique',
        'users_email_unique',
      ]),
    );

    sqlite.close();
  });
});
