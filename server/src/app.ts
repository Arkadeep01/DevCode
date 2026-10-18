import cors from 'cors';
import express, { type NextFunction, type Request, type Response } from 'express';
import helmet from 'helmet';
import { allowedOrigins, env } from './config/env.js';
import { sqlite } from './db/client.js';

/**
 * Builds the Express application without binding a port, so tests can import
 * it directly. Feature routers are mounted here as they are implemented
 * (auth, questions, submissions, progress).
 */
export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({ origin: allowedOrigins }));
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => {
    const ping = sqlite.prepare('SELECT 1 AS ok').get() as { ok: number } | undefined;
    res.json({
      status: 'ok',
      env: env.NODE_ENV,
      uptimeSeconds: Math.round(process.uptime()),
      db: ping?.ok === 1 ? 'ok' : 'unexpected',
    });
  });

  // Unknown route.
  app.use((_req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  // Central error handler — keeps responses JSON-shaped for the SPA.
  app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    console.error('[devcode-api] unhandled error:', error);
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}
