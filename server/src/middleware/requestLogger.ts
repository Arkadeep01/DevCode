import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

type Level = 'silent' | 'error' | 'warn' | 'info' | 'debug';

const LEVEL_ORDER: Record<Level, number> = {
  silent: 0,
  error: 1,
  warn: 2,
  info: 3,
  debug: 4,
};

/**
 * Request logging for production.
 *
 * The log line contains the method, the path (never the query string, which
 * can carry user input), the status, the duration and a correlation id. It
 * deliberately contains **no** headers, no cookies and no request body, so an
 * `Authorization` header or a submitted answer can never end up in a log
 * file.
 */
export interface RequestLoggerOptions {
  level: Level;
  /**
   * Paths whose *successful* responses are not logged.
   *
   * An uptime monitor polls the liveness endpoint every few minutes; logging
   * every successful poll would bury the interesting lines. Failures on these
   * paths are still logged, and the platform's own access log still records
   * every request.
   */
  quietPaths?: string[];
}

function isEnabled(level: Level, threshold: Level): boolean {
  return LEVEL_ORDER[level] <= LEVEL_ORDER[threshold];
}

export function createRequestLogger(options: RequestLoggerOptions) {
  const { level } = options;
  const quietPaths = options.quietPaths ?? [];
  const structured = level !== 'debug';

  return function requestLogger(req: Request, res: Response, next: NextFunction): void {
    const incoming = req.headers['x-request-id'];
    const requestId =
      typeof incoming === 'string' && incoming.length > 0 && incoming.length <= 128
        ? incoming
        : randomUUID();

    res.setHeader('X-Request-Id', requestId);

    const startedAt = process.hrtime.bigint();

    res.on('finish', () => {
      const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
      const status = res.statusCode;
      const lineLevel: Level = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info';

      if (!isEnabled(lineLevel, level)) {
        return;
      }

      // A successful uptime ping is not news; a failing one is.
      if (status < 400 && quietPaths.includes(req.path)) {
        return;
      }

      const line = {
        time: new Date().toISOString(),
        level: lineLevel,
        msg: 'request',
        requestId,
        method: req.method,
        path: req.originalUrl.split('?')[0],
        status,
        durationMs: Math.round(durationMs * 100) / 100,
        ip: req.ip,
        userId: req.userId,
      };

      if (structured) {
        // One JSON object per line — parseable by any log shipper.
        process.stdout.write(`${JSON.stringify(line)}\n`);
        return;
      }

      process.stdout.write(
        `[devcode-api] ${line.method} ${line.path} ${status} ${line.durationMs}ms requestId=${requestId}\n`,
      );
    });

    next();
  };
}
