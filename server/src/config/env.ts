import { config } from 'dotenv';
import { resolve } from 'node:path';
import { z } from 'zod';
import { isRemoteDatabaseUrl } from './database.js';
import { serverRoot } from './paths.js';

export { isRemoteDatabaseUrl };

/**
 * Loads `server/.env` explicitly instead of relying on the working
 * directory. Real environment variables always win over the file, so a
 * platform-injected configuration is never overwritten by a local file.
 */
config({ path: resolve(serverRoot, '.env'), quiet: true });

/**
 * Central environment schema. Every server module imports the parsed result
 * below instead of touching `process.env` directly, so a missing or malformed
 * variable fails fast at boot with a readable message.
 */
/**
 * An optional secret that may be left blank. `KEY=` in an env file is a
 * common way to say "not configured" and must not fail the boot.
 *
 * The upper bound is deliberately generous: a Turso read/write token is a
 * ~350-character JWT, and provider API keys are growing longer. A cap that is
 * too small would reject a perfectly valid production credential at boot.
 */
const optionalSecret = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
  z.string().min(1).max(4096).optional(),
);

/** An optional string. A blank value means "not configured". */
const optionalString = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
  z.string().min(1).max(1024).optional(),
);

/** Accepts the usual spellings of a boolean (`true/1/yes`, `false/0/no`). */
const optionalBoolean = z.preprocess((value) => {
  if (typeof value !== 'string') return value;
  const normalized = value.trim().toLowerCase();
  if (normalized === '') return undefined;
  if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
  if (['false', '0', 'no', 'off'].includes(normalized)) return false;
  return value;
}, z.boolean().optional());

/**
 * `TRUST_PROXY` decides how Express derives the client IP from
 * `X-Forwarded-For`. It is `false` by default because trusting the header
 * without a proxy in front would let a client spoof its own address and
 * bypass the IP-keyed rate limits.
 */
const trustProxySchema = z.preprocess((value) => {
  if (typeof value !== 'string') return value;
  const normalized = value.trim().toLowerCase();
  if (normalized === '') return undefined;
  if (normalized === 'true') return true;
  if (normalized === 'false') return false;
  const hops = Number(normalized);
  return Number.isInteger(hops) && hops >= 0 ? hops : value;
}, z.union([z.boolean(), z.number().int().min(0)]).optional());

/**
 * The placeholder shipped in `server/.env.example`. It is fine for local
 * development and must never reach a production boot.
 */
export const PLACEHOLDER_JWT_SECRET = 'replace-me-with-a-long-random-string';

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().max(65535).default(4000),
    CORS_ORIGIN: z
      .string()
      .min(1)
      .default('http://localhost:3000,http://127.0.0.1:3000'),
    /**
     * Database target. A remote libSQL server (`libsql://…` or `https://…`)
     * is required in production, because a serverless function has no
     * writable, persistent filesystem. A local path (or `file:…`) keeps the
     * development and test workflow on a plain SQLite file.
     */
    DATABASE_URL: z.string().min(1).default('./data/devcode.sqlite'),
    /** Access token for a remote libSQL server. Ignored for a local file. */
    DATABASE_AUTH_TOKEN: optionalSecret,
    /**
     * Escape hatch that allows a local (file-backed) database while
     * NODE_ENV=production. Only self-hosted or container deployments have a
     * persistent filesystem, so they may set it; a serverless function may
     * not.
     */
    ALLOW_LOCAL_DATABASE: optionalBoolean.default(false),
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

    /* --- deployment / operations --- */
    /** Number of proxy hops to trust for `X-Forwarded-*`, `true`, or `false`. */
    TRUST_PROXY: trustProxySchema.default(false),
    /** `silent` | `error` | `warn` | `info` | `debug`. */
    LOG_LEVEL: z.enum(['silent', 'error', 'warn', 'info', 'debug']).default('info'),
    /**
     * Optional path to a built SPA. When set, the API also serves the web
     * client (including the deep-link fallback) so the whole app can run on
     * a single origin. Relative paths resolve from the `server/` package root.
     */
    STATIC_DIR: optionalString,
    /** Enables the Content-Security-Policy header (opt-in, see the docs). */
    CSP_ENABLED: optionalBoolean.default(false),
    /** Extra origins allowed by `connect-src` (e.g. a separate API origin). */
    CSP_CONNECT_SRC: optionalString,
    /** Sign-in throttling: requests per window, per IP. */
    AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().max(1000).default(10),
    AUTH_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().max(86_400_000).default(900_000),
    /** Attempt-submission throttling: requests per window, per user. */
    ATTEMPT_RATE_LIMIT_MAX: z.coerce.number().int().positive().max(10_000).default(60),
    ATTEMPT_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().max(86_400_000).default(60_000),
    /** Escape hatch that lets the seed script run with NODE_ENV=production. */
    SEED_ALLOW_PRODUCTION: optionalBoolean.default(false),
  })
  .superRefine((value, ctx) => {
    // The example secret must never be used to sign production tokens.
    if (value.NODE_ENV === 'production' && value.JWT_SECRET === PLACEHOLDER_JWT_SECRET) {
      ctx.addIssue({
        code: 'custom',
        path: ['JWT_SECRET'],
        message:
          'JWT_SECRET still holds the placeholder from .env.example — generate a random secret before starting in production',
      });
    }

    // A serverless function has no writable, persistent filesystem: a local
    // database would silently lose every write when the instance is
    // discarded. Refuse to boot rather than accept data that cannot be kept.
    if (value.NODE_ENV === 'production' && !isRemoteDatabaseUrl(value.DATABASE_URL)) {
      if (!value.ALLOW_LOCAL_DATABASE) {
        ctx.addIssue({
          code: 'custom',
          path: ['DATABASE_URL'],
          message:
            'DATABASE_URL must point at a remote libSQL server (libsql://… or https://…) in production — a serverless function has no persistent filesystem. Set ALLOW_LOCAL_DATABASE=true only on a self-hosted host with a persistent volume.',
        });
      }
    }

    // A live provider without a key can only ever fail at request time.
    if (value.COACH_PROVIDER === 'openai' && !value.COACH_API_KEY) {
      const message = 'COACH_API_KEY is required when COACH_PROVIDER=openai';
      if (value.NODE_ENV === 'production') {
        ctx.addIssue({ code: 'custom', path: ['COACH_API_KEY'], message });
      }
    }
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

/** True when the process runs with NODE_ENV=production. */
export const isProduction = env.NODE_ENV === 'production';

/** Browser origins allowed by CORS, parsed from the comma-separated value. */
export const allowedOrigins = env.CORS_ORIGIN.split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

/**
 * Startup warnings that do not stop the process but must be visible in the
 * deployment log. They never contain a secret value.
 */
export function collectStartupWarnings(): string[] {
  const warnings: string[] = [];

  if (isProduction && env.JWT_SECRET === PLACEHOLDER_JWT_SECRET) {
    warnings.push('JWT_SECRET is still the .env.example placeholder.');
  }

  if (env.COACH_PROVIDER === 'openai' && !env.COACH_API_KEY) {
    warnings.push('COACH_PROVIDER=openai but COACH_API_KEY is not set — coach requests will fail.');
  }

  if (isProduction && env.COACH_PROVIDER === 'mock') {
    warnings.push(
      'COACH_PROVIDER=mock in production: coaching answers are deterministic templates, not model output, and cost nothing.',
    );
  }

  if (isProduction && allowedOrigins.some((origin) => origin.includes('localhost'))) {
    warnings.push(
      'CORS_ORIGIN still allows localhost origins — set it to the deployed web origin.',
    );
  }

  if (isProduction && !isRemoteDatabaseUrl(env.DATABASE_URL)) {
    warnings.push(
      'The database is a local file while NODE_ENV=production — data only survives as long as the filesystem does.',
    );
  }

  return warnings;
}
