import { createApp } from './app.js';
import { env } from './config/env.js';

const app = createApp();

const server = app.listen(env.PORT, () => {
  console.log(`[devcode-api] ${env.NODE_ENV} — listening on http://localhost:${env.PORT}/api`);
});

function shutdown(signal: string) {
  console.log(`[devcode-api] ${signal} received, shutting down`);
  server.close(() => process.exit(0));
  // Fallback if open connections keep the server from closing.
  setTimeout(() => process.exit(1), 5_000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
