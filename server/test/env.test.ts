import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parseEnv } from '../src/config/env.js';

const BASE_ENV = { JWT_SECRET: 'test-only-secret-0123456789abcdef' };

/** Minimal dotenv-compatible parser for the regression test. */
function parseEnvFile(content: string): Record<string, string> {
  const values: Record<string, string> = {};
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line.length === 0 || line.startsWith('#')) continue;
    const separator = line.indexOf('=');
    if (separator === -1) continue;
    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    values[key] = value;
  }
  return values;
}

describe('parseEnv', () => {
  it('accepts an environment with only the required variables', () => {
    const result = parseEnv(BASE_ENV);

    expect(result.success).toBe(true);
    expect(result.data?.COACH_PROVIDER).toBe('mock');
  });

  it('treats a blank COACH_API_KEY as "not configured"', () => {
    const result = parseEnv({ ...BASE_ENV, COACH_API_KEY: '' });

    expect(result.success).toBe(true);
    expect(result.data?.COACH_API_KEY).toBeUndefined();
  });

  it('treats a whitespace-only COACH_API_KEY as "not configured"', () => {
    const result = parseEnv({ ...BASE_ENV, COACH_API_KEY: '   ' });

    expect(result.success).toBe(true);
    expect(result.data?.COACH_API_KEY).toBeUndefined();
  });

  it('keeps a real COACH_API_KEY', () => {
    const result = parseEnv({ ...BASE_ENV, COACH_API_KEY: 'sk-test-123' });

    expect(result.success).toBe(true);
    expect(result.data?.COACH_API_KEY).toBe('sk-test-123');
  });

  it('rejects a JWT secret that is too short', () => {
    const result = parseEnv({ JWT_SECRET: 'short' });

    expect(result.success).toBe(false);
    expect(result.issues.join(' ')).toContain('JWT_SECRET');
  });

  it('allows both localhost and 127.0.0.1 by default', () => {
    const result = parseEnv(BASE_ENV);

    expect(result.data?.CORS_ORIGIN).toContain('http://localhost:3000');
    expect(result.data?.CORS_ORIGIN).toContain('http://127.0.0.1:3000');
  });
});

describe('the committed env templates', () => {
  it('parses the server template without failing', () => {
    const template = readFileSync(
      fileURLToPath(new URL('../.env.example', import.meta.url)),
      'utf-8',
    );

    const result = parseEnv(parseEnvFile(template));

    // A template that cannot be parsed is a template that breaks the boot.
    expect(result.issues).toEqual([]);
    expect(result.success).toBe(true);
  });
});
