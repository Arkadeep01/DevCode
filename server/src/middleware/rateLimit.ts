import type { NextFunction, Request, Response } from 'express';

export interface RateLimitRule {
  windowMs: number;
  max: number;
}

interface Hit {
  count: number;
  resetAt: number;
}

/**
 * Minimal in-memory rate limiter (fixed window counter). Per-user keyed when
 * the auth middleware already resolved a user id.
 */
export function createRateLimiter(rule: RateLimitRule) {
  const hits = new Map<string, Hit>();

  return function rateLimiter(req: Request, res: Response, next: NextFunction): void {
    const key = req.userId !== undefined ? `user:${req.userId}` : `ip:${req.ip ?? 'unknown'}`;
    const now = Date.now();
    const hit = hits.get(key);

    if (hit === undefined || hit.resetAt <= now) {
      hits.set(key, { count: 1, resetAt: now + rule.windowMs });
      next();
      return;
    }

    if (hit.count >= rule.max) {
      res.status(429).json({ error: 'Rate limit exceeded' });
      return;
    }

    hit.count += 1;
    next();
  };
}