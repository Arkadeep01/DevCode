import { eq } from 'drizzle-orm';
import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../auth/middleware.js';
import { hashPassword, verifyPassword } from '../auth/password.js';
import { signToken } from '../auth/tokens.js';
import { db } from '../db/client.js';
import { users, type User } from '../db/schema.js';

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

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: string }).code === 'SQLITE_CONSTRAINT_UNIQUE'
  );
}

export const authRouter = Router();

authRouter.post('/register', async (req, res, next) => {
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
    const user = db.insert(users).values({ email, passwordHash, displayName }).returning().get();

    res.status(201).json({ token: signToken(user.id), user: toPublicUser(user) });
  } catch (error) {
    if (isUniqueViolation(error)) {
      res.status(409).json({ error: 'Email already registered' });
      return;
    }
    next(error);
  }
});

authRouter.post('/login', async (req, res, next) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid input' });
      return;
    }

    const { email, password } = parsed.data;
    const user = db.select().from(users).where(eq(users.email, email)).get();

    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    res.json({ token: signToken(user.id), user: toPublicUser(user) });
  } catch (error) {
    next(error);
  }
});

authRouter.get('/me', requireAuth, (req, res) => {
  const user = db
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
