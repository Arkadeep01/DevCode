import { mkdtempSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { migrate } from 'drizzle-orm/libsql/migrator';
import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app.js';
import { client } from '../src/db/client.js';
import { migrationsFolder } from '../src/config/paths.js';

/**
 * The liveness endpoint is the URL an uptime monitor polls, so its contract
 * is deliberately narrow: it must answer 200 as long as the process can
 * serve a request, and it must not touch a dependency, spend time, or reveal
 * anything about the deployment.
 */
describe('GET /api/live', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('answers 200 without a session', async () => {
    const response = await request(createApp()).get('/api/live');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ status: 'ok' });
  });

  it('never touches the database', async () => {
    const execute = vi.spyOn(client, 'execute');

    const response = await request(createApp()).get('/api/live');

    expect(response.status).toBe(200);
    expect(execute).not.toHaveBeenCalled();
  });

  it('reveals nothing but the status and the uptime', async () => {
    const response = await request(createApp()).get('/api/live');

    expect(Object.keys(response.body).sort()).toEqual(['status', 'uptimeSeconds']);
    expect(typeof response.body.uptimeSeconds).toBe('number');
    expect(JSON.stringify(response.body)).not.toMatch(/secret|token|password|database|libsql/i);
  });

  it('answers an unsupported method with the project-wide JSON 404', async () => {
    const response = await request(createApp()).post('/api/live');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'Not found' });
  });

  it('does not require a bearer token or a cookie', async () => {
    const response = await request(createApp()).get('/api/live');

    expect(response.status).toBe(200);
    expect(response.headers['www-authenticate']).toBeUndefined();
  });
});

describe('GET /api/health', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('reports readiness only after the database answered', async () => {
    const execute = vi.spyOn(client, 'execute');

    const response = await request(createApp()).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ status: 'ok', db: 'ok' });
    expect(execute).toHaveBeenCalled();
  });
});

describe('the production migration path', () => {
  it('applies the committed migrations through the libSQL client', async () => {
    const root = mkdtempSync(join(tmpdir(), 'devcode-libsql-migrate-'));
    const local = createClient({ url: `file:${join(root, 'fresh.sqlite')}` });

    try {
      await migrate(drizzle(local), { migrationsFolder });

      const tables = (await local.execute("SELECT name FROM sqlite_master WHERE type = 'table'")).rows.map(
        (row) => row.name as string,
      );

      expect(tables).toEqual(
        expect.arrayContaining(['attempts', 'progress', 'questions', 'submissions', 'users']),
      );
    } finally {
      local.close();
    }
  });
});

describe('the Vercel entry point', () => {
  it('exports the Express application as the default export', async () => {
    // Vercel routes every request of the project to the default export of the
    // entry file, and the platform owns the socket — so the entry must not
    // bind a port itself.
    const entry = await import('../src/index.js');

    expect(typeof entry.default).toBe('function');
    expect(typeof entry.default.listen).toBe('function');
    expect(typeof entry.default.use).toBe('function');
  });

  it('keeps the listener out of the Vercel entry point', async () => {
    const source = await readFile(new URL('../src/index.ts', import.meta.url), 'utf-8');

    expect(source).not.toMatch(/\.listen\(/);
  });
});
