import 'dotenv/config';
import { z } from 'zod';

/**
 * Central environment schema. Every server module imports the parsed result
 * below instead of touching `process.env` directly, so a missing or malformed
 * variable fails fast at boot with a readable message.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().max(65535).default(4000),
  CORS_ORIGIN: z.string().min(1).default('http://localhost:3000'),
  DATABASE_URL: z.string().min(1).default('./data/devcode.sqlite'),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters long'),
  JWT_EXPIRES_IN: z.string().min(1).default('7d'),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('\n');
    console.error(
      `Invalid environment variables. Copy server/.env.example to server/.env and fix:\n${details}`,
    );
    process.exit(1);
  }

  return parsed.data;
}

export const env = loadEnv();

/** Browser origins allowed by CORS, parsed from the comma-separated value. */
export const allowedOrigins = env.CORS_ORIGIN.split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
