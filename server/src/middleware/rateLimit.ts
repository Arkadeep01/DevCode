import type { NextFunction, Request, Response } from 'express';

export interface RateLimitRule {
  windowMs: number;
  max: number;
  /** Overrides the default key (authenticated user id, otherwise client IP). */
  keyBy?: (req: Request) => string;
}

interface Hit {
  count: number;
  resetAt: number;
}

/**
 * Minimal in-memory rate limiter (fixed window counter). Per-user keyed when
 * the auth middleware already resolved a user id, otherwise per client IP.
 *
 * The store is in-process, so the limits are per instance — see the
 * deployment guide for multi-instance deployments, where a shared store is
 * required. Expired entries are swept periodically so a long-running process
 * cannot grow the map without bound.
 */
export function createRateLimiter(rule: RateLimitRule) {
  const hits = new Map<string, Hit>();

  const keyFor = (req: Request): string => {
    if (rule.keyBy) return rule.keyBy(req);
    return req.userId !== undefined ? `user:${req.userId}` : `ip:${req.ip ?? 'unknown'}`;
  };

  // Sweep expired windows. `unref` keeps the timer from holding the process
  // open during shutdown.
  const sweeper = setInterval(() => {
    const now = Date.now();
    for (const [key, hit] of hits) {
      if (hit.resetAt <= now) hits.delete(key);
    }
  }, Math.max(rule.windowMs, 30_000));
  sweeper.unref();

  return function rateLimiter(req: Request, res: Response, next: NextFunction): void {
    const key = keyFor(req);
    const now = Date.now();
    const hit = hits.get(key);

    if (hit === undefined || hit.resetAt <= now) {
      hits.set(key, { count: 1, resetAt: now + rule.windowMs });
      res.setHeader('X-RateLimit-Limit', String(rule.max));
      res.setHeader('X-RateLimit-Remaining', String(Math.max(rule.max - 1, 0)));
      next();
      return;
    }

    if (hit.count >= rule.max) {
      const retryAfterSeconds = Math.max(1, Math.ceil((hit.resetAt - now) / 1000));
      res.setHeader('Retry-After', String(retryAfterSeconds));
      res.setHeader('X-RateLimit-Limit', String(rule.max));
      res.setHeader('X-RateLimit-Remaining', '0');
      res.status(429).json({ error: 'Rate limit exceeded' });
      return;
    }

    hit.count += 1;
    res.setHeader('X-RateLimit-Limit', String(rule.max));
    res.setHeader('X-RateLimit-Remaining', String(Math.max(rule.max - hit.count, 0)));
    next();
  };
}
