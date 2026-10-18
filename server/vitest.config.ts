import { defineConfig } from 'vitest/config';

/**
 * Tests boot the real Express app through createApp() but against a throwaway
 * SQLite database: test/setup.ts points DATABASE_URL at a fresh file in the OS
 * temp directory before any test module imports the app. The env values below
 * therefore land in process.env first, so config/env.ts parses them instead of
 * the developer's server/.env.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
    setupFiles: ['test/setup.ts'],
    env: {
      NODE_ENV: 'test',
      JWT_SECRET: 'test-only-secret-0123456789abcdef',
      CORS_ORIGIN: 'http://localhost:3000',
    },
  },
});
