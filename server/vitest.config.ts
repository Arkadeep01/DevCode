import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { defineConfig } from 'vitest/config';

/**
 * Tests boot the real Express app through createApp() but against a throwaway
 * SQLite file in the OS temp directory — never server/data/devcode.sqlite.
 * The env values below land in process.env before any test module imports the
 * app, so config/env.ts parses them instead of the developer's server/.env.
 */
const testDatabaseUrl = join(tmpdir(), `devcode-test-${process.pid}.sqlite`);

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: testDatabaseUrl,
      JWT_SECRET: 'test-only-secret-0123456789abcdef',
      CORS_ORIGIN: 'http://localhost:3000',
    },
  },
});
