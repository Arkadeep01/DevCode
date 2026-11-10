import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config';

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      include: ['src/**/*.test.{ts,tsx}'],
      setupFiles: ['./src/test/setup.ts'],
      // Several suites render the whole application tree. Running every file
      // at once starves the jsdom workers and turns slow renders into false
      // timeouts, so the pool is capped and the per-test budget is generous.
      maxWorkers: 4,
      testTimeout: 20000,
      hookTimeout: 20000,
    },
  }),
);
