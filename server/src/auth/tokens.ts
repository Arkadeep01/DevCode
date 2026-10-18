import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export function signToken(userId: number): string {
  return jwt.sign({ sub: String(userId) }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });
}

/** Returns the user id carried by the token, or null when invalid/expired. */
export function verifyToken(token: string): { userId: number } | null {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);
    if (typeof decoded === 'string' || typeof decoded.sub !== 'string') return null;

    const userId = Number(decoded.sub);
    return Number.isInteger(userId) && userId > 0 ? { userId } : null;
  } catch {
    return null;
  }
}
