import { createApp } from './app.js';
import { collectStartupWarnings, env } from './config/env.js';
import { closeDatabase, databaseTarget } from './db/client.js';

/**
 * Local / container entry point.
 *
 * Binds an HTTP server so the API can be run directly (`npm run dev`,
 * `npm start`) or inside the Docker image. On Vercel the platform owns the
 * socket and imports `src/index.ts` instead, which exports the application
 * without listening.
 */
const app = createApp();

let shuttingDown = false;

function shutdown(signal: string): void {
  if (shuttingDown) return;
  shuttingDown = true;

  console.log(`[devcode-api] ${signal} received, shutting down`);

  void closeDatabase().finally(() => {
    console.log('[devcode-api] shutdown complete');
    process.exit(0);
  });

  // Fallback if the close never settles.
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

process.on('unhandledRejection', (reason) => {
  console.error('[devcode-api] unhandled promise rejection:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('[devcode-api] uncaught exception:', error);
  shutdown('uncaughtException');
});

const server = app.listen(env.PORT, () => {
  const address = server.address();
  const boundPort = typeof address === 'object' && address ? address.port : env.PORT;
  console.log(
    `[devcode-api] ${env.NODE_ENV} — listening on http://0.0.0.0:${boundPort}/api (database: ${databaseTarget})`,
  );

  for (const warning of collectStartupWarnings()) {
    console.warn(`[devcode-api] warning: ${warning}`);
  }
});

server.on('error', (error: NodeJS.ErrnoException) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`[devcode-api] port ${env.PORT} is already in use — stop the other process or set PORT.`);
    process.exit(1);
  }
  console.error('[devcode-api] server error:', error);
  process.exit(1);
});

// Stop accepting new connections on shutdown, then release the database.
server.on('close', () => {
  void closeDatabase();
});
