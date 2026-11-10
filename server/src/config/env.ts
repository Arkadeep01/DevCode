import 'dotenv/config';
import { z } from 'zod';

/**
 * Central environment schema. Every server module imports the parsed result
 * below instead of touching `process.env` directly, so a missing or malformed
 * variable fails fast at boot with a readable message.
 */
/**
 * An optional secret that may be left blank. `KEY=` in an env file is a
 * common way to say "not configured" and must not fail the boot.
 */
const optionalSecret = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
  z.string().min(1).max(256).optional(),
);

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().max(65535).default(4000),
  CORS_ORIGIN: z
    .string()
    .min(1)
    .default('http://localhost:3000,http://127.0.0.1:3000'),
  DATABASE_URL: z.string().min(1).default('./data/devcode.sqlite'),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters long'),
  JWT_EXPIRES_IN: z.string().min(1).default('7d'),
  COACH_PROVIDER: z.enum(['mock', 'openai']).default('mock'),
  COACH_MODEL: z.string().min(1).max(120).default('gpt-4o-mini'),
  COACH_API_KEY: optionalSecret,
  COACH_BASE_URL: z.string().min(1).max(512).default('https://api.openai.com/v1'),
  COACH_MAX_OUTPUT_TOKENS: z.coerce.number().int().positive().max(2048).default(700),
  COACH_DAILY_TOKEN_BUDGET: z.coerce.number().int().positive().max(100000).default(50000),
  COACH_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  COACH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(10),
  COACH_CACHE_TTL_MS: z.coerce.number().int().positive().max(86_400_000).default(3_600_000),
  COACH_REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().max(120_000).default(30_000),
});

export type Env = z.infer<typeof envSchema>;

/** Parses a raw environment record. Exported so the schema can be tested. */
export function parseEnv(source: Record<string, unknown>): {
  success: boolean;
  data?: Env;
  issues: string[];
} {
  const parsed = envSchema.safeParse(source);
  if (parsed.success) {
    return { success: true, data: parsed.data, issues: [] };
  }
  return {
    success: false,
    issues: parsed.error.issues.map(
      (issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`,
    ),
  };
}

function loadEnv(): Env {
  const parsed = parseEnv(process.env);

  if (!parsed.success || !parsed.data) {
    console.error(
      `Invalid environment variables. Copy server/.env.example to server/.env and fix:\n${parsed.issues
        .map((issue) => `  - ${issue}`)
        .join('\n')}`,
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