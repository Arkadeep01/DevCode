import { eq } from 'drizzle-orm';
import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../auth/middleware.js';
import { hashPassword, verifyPassword } from '../auth/password.js';
import { signToken } from '../auth/tokens.js';
import { db } from '../db/client.js';
import { isUniqueViolation } from '../db/errors.js';
import { users, type User } from '../db/schema.js';
import { env } from '../config/env.js';
import { createRateLimiter } from '../middleware/rateLimit.js';

/**
 * Credential throttling for the two endpoints that can be brute-forced.
 * It is keyed by client IP because no user id exists before authentication,
 * and because credential stuffing is an IP-shaped problem.
 *
 * `GET /api/auth/me` is deliberately *not* throttled: it runs on every page
 * load and shares the same IP as every other user behind a NAT.
 */
const credentialRateLimiter = createRateLimiter({
  windowMs: env.AUTH_RATE_LIMIT_WINDOW_MS,
  max: env.AUTH_RATE_LIMIT_MAX,
});

const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(8).max(128),
  displayName: z.string().trim().min(2).max(60),
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

function toPublicUser(user: User) {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    createdAt: user.createdAt,
  };
}

export const authRouter = Router();

authRouter.post('/register', credentialRateLimiter, async (req, res, next) => {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: 'Invalid input',
        details: parsed.error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      });
      return;
    }

    const { email, password, displayName } = parsed.data;
    const passwordHash = await hashPassword(password);
    const [user] = await db.insert(users).values({ email, passwordHash, displayName }).returning();

    res.status(201).json({ token: signToken(user.id), user: toPublicUser(user) });
  } catch (error) {
    if (isUniqueViolation(error)) {
      res.status(409).json({ error: 'Email already registered' });
      return;
    }
    next(error);
  }
});

authRouter.post('/login', credentialRateLimiter, async (req, res, next) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid input' });
      return;
    }

    const { email, password } = parsed.data;
    const user = await db.select().from(users).where(eq(users.email, email)).get();

    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    res.json({ token: signToken(user.id), user: toPublicUser(user) });
  } catch (error) {
    next(error);
  }
});

authRouter.get('/me', requireAuth, async (req, res) => {
  const user = await db
    .select()
    .from(users)
    .where(eq(users.id, req.userId ?? 0))
    .get();

  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  res.json({ user: toPublicUser(user) });
});
