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
    // The suites run in parallel with the other packages on a busy machine;
    // a generous per-test budget avoids turning a slow worker into a false
    // failure.
    testTimeout: 20000,
    hookTimeout: 20000,
    env: {
      NODE_ENV: 'test',
      JWT_SECRET: 'test-only-secret-0123456789abcdef',
      CORS_ORIGIN: 'http://localhost:3000',
      // The suite creates many accounts from the same address; the
      // credential limiter is exercised by its own test instead of by
      // accidentally blocking the other suites.
      AUTH_RATE_LIMIT_MAX: '1000',
      // The request logger would otherwise bury the test output.
      LOG_LEVEL: 'silent',
    },
  },
});
