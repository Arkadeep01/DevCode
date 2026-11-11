#!/usr/bin/env node
/**
 * Verifies that the committed migrations produced the expected schema.
 *
 * Run it right after a migration, against the same target:
 *
 *   # local file
 *   DATABASE_URL=./data/ci-migration-check.sqlite node dist/db/migrate.js
 *   DATABASE_URL=./data/ci-migration-check.sqlite node scripts/check-schema.mjs
 *
 *   # remote libSQL / Turso server
 *   export DATABASE_URL="libsql://your-db.turso.io"
 *   export DATABASE_AUTH_TOKEN="<token>"
 *   node dist/db/migrate.js
 *   node scripts/check-schema.mjs
 *
 * It reads the database the migration just wrote, so it proves the *applied*
 * schema rather than the schema in the Drizzle source. The check is
 * read-only.
 */
import { createClient } from '@libsql/client';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** The `server/` package root — the directory that holds `.env`. */
const serverRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Reads `server/.env` as a fallback, exactly like the database tools do, so
 * a verification run always inspects the same target the migration used.
 * Anything already in the environment wins.
 */
function readEnvFile() {
  const values = {};
  try {
    for (const raw of readFileSync(resolve(serverRoot, '.env'), 'utf8').split(/\r?\n/)) {
      const line = raw.trim();
      if (!line || line.startsWith('#')) continue;
      const i = line.indexOf('=');
      if (i === -1) continue;
      values[line.slice(0, i).trim()] = line.slice(i + 1).trim();
    }
  } catch {
    /* no file */
  }
  return values;
}

const fileEnv = readEnvFile();
const databaseUrl = process.env.DATABASE_URL || fileEnv.DATABASE_URL || './data/ci-migration-check.sqlite';
const authToken = process.env.DATABASE_AUTH_TOKEN || fileEnv.DATABASE_AUTH_TOKEN;

const remote = /^(libsql|https):\/\//i.test(databaseUrl);
const file = databaseUrl.startsWith('file:')
  ? databaseUrl.slice('file:'.length)
  : remote
    ? null
    : databaseUrl;

const client = createClient({
  url: remote ? databaseUrl : `file:${file}`,
  ...(authToken ? { authToken } : {}),
});

const REQUIRED_TABLES = ['users', 'questions', 'attempts', 'progress', 'submissions'];
const REQUIRED_UNIQUE_INDEXES = [
  'attempts_user_quiz_question_unique',
  'progress_user_topic_unique',
  'questions_slug_unique',
  'users_email_unique',
];

try {
  const tables = (
    await client.execute("SELECT name FROM sqlite_master WHERE type = 'table'")
  ).rows.map((row) => row.name);

  const missingTables = REQUIRED_TABLES.filter((table) => !tables.includes(table));
  if (missingTables.length > 0) {
    console.error('schema check failed — missing tables:', missingTables.join(', '));
    process.exit(1);
  }

  const indexes = (
    await client.execute("SELECT name FROM sqlite_master WHERE type = 'index'")
  ).rows.map((row) => row.name);

  const missingIndexes = REQUIRED_UNIQUE_INDEXES.filter((index) => !indexes.includes(index));
  if (missingIndexes.length > 0) {
    console.error('schema check failed — missing unique indexes:', missingIndexes.join(', '));
    process.exit(1);
  }

  console.log(`schema check ok — tables: ${tables.sort().join(', ')}`);
} finally {
  client.close();
}
