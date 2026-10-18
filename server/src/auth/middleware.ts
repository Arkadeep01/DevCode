import type { NextFunction, Request, Response } from 'express';
import { verifyToken } from './tokens.js';

/** Rejects the request unless a valid `Authorization: Bearer <jwt>` is present. */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const [scheme, token] = req.headers.authorization?.split(' ') ?? [];

  if (scheme !== 'Bearer' || !token) {
    res.status(401).json({ error: 'Missing bearer token' });
    return;
  }

  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }

  req.userId = payload.userId;
  next();
}
