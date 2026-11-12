import cors from 'cors';
import express, {
  type NextFunction,
  type Request,
  type RequestHandler,
  type Response,
} from 'express';
import * as helmetModule from 'helmet';
import type { HelmetOptions } from 'helmet';
import { readFileSync } from 'node:fs';
import { allowedOrigins, env, isProduction } from './config/env.js';
import { staticEnabled, staticIndex, staticRoot } from './config/static.js';
import { pingDatabase } from './db/client.js';
import { CoachError } from './coach/errors.js';
import { coachRouter } from './routes/coach.js';
import { authRouter } from './routes/auth.js';
import { attemptsRouter } from './routes/attempts.js';
import { createRateLimiter } from './middleware/rateLimit.js';
import { createRequestLogger } from './middleware/requestLogger.js';

/**
 * The shape of helmet's default export: a factory that takes the helmet
 * options and returns an Express middleware.
 */
type HelmetFactory = (options?: Readonly<HelmetOptions>) => RequestHandler;

/**
 * helmet's middleware factory (the package's default export).
 *
 * helmet ships two declaration files: an ESM one (`index.d.mts`) and a
 * CommonJS one (`index.d.cts`). Which one a compiler picks depends on the
 * module resolution mode it uses: the project's own `tsc` run resolves the
 * ESM entry point, while the hosting platform's build resolves the CommonJS
 * one. When an ES module imports a CommonJS module, TypeScript binds the
 * default import to `module.exports` — the whole namespace — so
 * `helmet(...)` stops being callable and the build fails with
 * "TS2349: This expression is not callable".
 *
 * At runtime the factory is always the `default` property of the module
 * (the CommonJS entry even sets `module.exports.default = module.exports`),
 * so it is read from there and typed explicitly. That keeps the import valid
 * under every resolution mode the code is compiled with.
 */
const helmet = helmetModule.default as unknown as HelmetFactory;

/** Attempt-submission throttling, keyed by the authenticated user. */
const attemptRateLimiter = createRateLimiter({
  windowMs: env.ATTEMPT_RATE_LIMIT_WINDOW_MS,
  max: env.ATTEMPT_RATE_LIMIT_MAX,
});

/**
 * Content-Security-Policy for the responses the API serves.
 *
 * `'unsafe-inline'` is required for scripts because `index.html` carries a
 * small inline theme bootstrap, and for styles because the app sets inline
 * styles (progress bars, dynamic widths). `upgrade-insecure-requests` is
 * deliberately not used: TLS is terminated by the hosting platform, and the
 * directive would break a plain-HTTP local deployment.
 */
function contentSecurityPolicy() {
  const connectSrc = ["'self'"];
  if (env.CSP_CONNECT_SRC) {
    for (const origin of env.CSP_CONNECT_SRC.split(',').map((value) => value.trim())) {
      if (origin) connectSrc.push(origin);
    }
  }

  return {
    useDefaults: false,
    directives: {
      defaultSrc: ["'self'"],
      baseUri: ["'self'"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
      formAction: ["'self'"],
      imgSrc: ["'self'", 'data:', 'blob:'],
      fontSrc: ["'self'", 'data:', 'https://fonts.gstatic.com'],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      connectSrc,
      manifestSrc: ["'self'"],
    },
  };
}

/**
 * Builds the Express application without binding a port, so tests can import
 * it directly. Feature routers are mounted here as they are implemented
 * (auth, questions, submissions, progress).
 */
export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  // Behind a reverse proxy the client IP and protocol arrive in
  // `X-Forwarded-*`. Trusting those headers is opt-in: with TRUST_PROXY=false
  // (the default) a client cannot spoof its address to dodge the IP-keyed
  // rate limits.
  app.set('trust proxy', env.TRUST_PROXY);

  app.use(createRequestLogger({ level: env.LOG_LEVEL, quietPaths: ['/api/live'] }));

  app.use(
    helmet({
      contentSecurityPolicy: env.CSP_ENABLED ? contentSecurityPolicy() : false,
      // HSTS only makes sense once TLS is terminated in front of the app.
      hsts: isProduction ? { maxAge: 15552000, includeSubDomains: false } : false,
    }),
  );

  app.use(
    cors({
      origin: allowedOrigins,
      methods: ['GET', 'POST', 'OPTIONS'],
      // The API is bearer-token authenticated; it never uses cookies, so
      // credentialed cross-origin requests are not enabled.
      credentials: false,
      maxAge: 600,
    }),
  );

  app.use(express.json({ limit: '1mb' }));

  // Liveness: the process is up and able to answer. It checks no dependency,
  // so a slow database can never cause the platform to restart the app. This
  // is the endpoint an uptime monitor should poll.
  app.get('/api/live', (_req, res) => {
    res.json({ status: 'ok', uptimeSeconds: Math.round(process.uptime()) });
  });

  // Readiness: the process is up *and* the database answers. It does not
  // claim anything about the AI provider — that is checked per request.
  app.get('/api/health', async (_req, res) => {
    const dbStatus = (await pingDatabase()) ? 'ok' : 'unavailable';

    res.status(dbStatus === 'ok' ? 200 : 503).json({
      status: dbStatus === 'ok' ? 'ok' : 'degraded',
      uptimeSeconds: Math.round(process.uptime()),
      db: dbStatus,
    });
  });

  app.use('/api/auth', authRouter);

  app.use('/api/coach', coachRouter);

  app.use('/api/attempts', attemptRateLimiter, attemptsRouter);

  // Unknown API route — stays JSON so the SPA can distinguish it from a
  // missing asset.
  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  if (staticEnabled && staticRoot && staticIndex) {
    // The entry document is read once at boot and served from memory: it is
    // tiny, and it lets the fallback set exact cache headers.
    const indexHtml = readFileSync(staticIndex, 'utf-8');

    // Built assets. `index: false` keeps the SPA fallback in charge of
    // serving index.html so the fallback can set the right cache headers.
    app.use(express.static(staticRoot, { index: false, maxAge: '1h' }));

    // SPA fallback: any non-API GET that did not match a file returns
    // index.html, so a deep link or a refresh on /study?topic=… works.
    app.use((req: Request, res: Response, next: NextFunction) => {
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        next();
        return;
      }

      const accept = req.headers.accept ?? '';
      if (!accept.includes('text/html')) {
        next();
        return;
      }

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      // The entry document must never be cached, or a deploy would not
      // reach clients that already have it cached.
      res.setHeader('Cache-Control', 'no-cache');
      res.status(200).send(indexHtml);
    });
  }

  // Unknown route.
  app.use((_req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  // Central error handler - keeps responses JSON-shaped for the SPA.
  app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (error instanceof CoachError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }

    const status = statusOf(error);

    // A client error (malformed JSON, payload too large, bad content type)
    // is the caller's problem, not an incident: answer with 4xx and do not
    // log the error, because parser errors carry the request body — which
    // would put a submitted password into the log file.
    if (status >= 400 && status < 500) {
      res.status(status).json({ error: clientErrorMessage(status) });
      return;
    }

    console.error('[devcode-api] unhandled error:', describeError(error));
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}

/**
 * The shared application instance.
 *
 * Vercel's zero-configuration Express support looks for an `app.*`, `index.*`
 * or `server.*` file that exports the Express application as its default
 * export, and routes every request of the project to it. Exporting the
 * instance here means both `src/app.ts` and `src/index.ts` resolve to the
 * same app, whichever file the platform picks as the entry point.
 */
export default createApp();

/** Reads the HTTP status an error carries, if it has one. */
function statusOf(error: unknown): number {
  if (typeof error !== 'object' || error === null) return 500;
  const record = error as { status?: unknown; statusCode?: unknown };
  if (typeof record.status === 'number' && record.status >= 100) return record.status;
  if (typeof record.statusCode === 'number' && record.statusCode >= 100) {
    return record.statusCode;
  }
  return 500;
}

/** A safe, generic message for a client error. Never echoes the input. */
function clientErrorMessage(status: number): string {
  if (status === 413) return 'Request body is too large';
  if (status === 415) return 'Unsupported media type';
  return 'Invalid request';
}

/**
 * Renders an error for the log without its extra properties. A parser error
 * object carries the raw request body, so only the name, message and stack
 * are logged.
 */
function describeError(error: unknown): string {
  if (error instanceof Error) {
    return `${error.name}: ${error.message}\n${error.stack ?? ''}`;
  }
  return String(error);
}
