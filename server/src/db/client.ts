import { type Client } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { env } from '../config/env.js';
import {
  createDatabaseClient,
  isRemoteDatabaseUrl,
  resolveDatabaseFile,
} from '../config/database.js';
import * as schema from './schema.js';

/**
 * The database connection.
 *
 * The driver is libSQL, which speaks the SQLite dialect over HTTP to a remote
 * server (Turso) and to a local file when the URL points at the filesystem.
 * That matters for the deployment target: a Vercel Function has no writable,
 * persistent filesystem, so a file-backed SQLite database cannot survive
 * between invocations (and would be wiped on every cold start). A remote
 * libSQL/SQLite server keeps the exact same SQL, the same Drizzle schema and
 * the same committed migrations, so only the connection changes.
 *
 * `DATABASE_URL` accepts:
 *  - `libsql://<host>` — a remote libSQL server (Turso), used in production;
 *  - `https://<host>`  — a remote libSQL server over HTTP;
 *  - `file:<path>`     — a local file, used in development and in the tests;
 *  - `<path>`          — a local file, resolved against the `server/` root.
 *
 * `DATABASE_AUTH_TOKEN` is only sent to a remote server; a local file ignores
 * it. It is never logged and never leaves the server process.
 */

/** True when the configured database lives on a remote libSQL server. */
export const isRemoteDatabase = isRemoteDatabaseUrl(env.DATABASE_URL);

/** The absolute path of the local database file, or `null` for a remote one. */
export const databaseFile: string | null = resolveDatabaseFile(env.DATABASE_URL);

/**
 * A short, non-sensitive description of the target for the boot log. A remote
 * URL is reduced to its host so a token embedded in the URL can never reach a
 * log file.
 */
export const databaseTarget: string = isRemoteDatabase
  ? `remote libSQL (${safeRemoteHost(env.DATABASE_URL)})`
  : `file ${databaseFile ?? ''}`;

function safeRemoteHost(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return 'unknown';
  }
}

/**
 * The libSQL client. One instance per process; it is safe to share.
 *
 * The directory that holds a local file is created by
 * `createDatabaseClient`, so a fresh checkout can be migrated without any
 * manual setup.
 */
export const client: Client = createDatabaseClient(env.DATABASE_URL, env.DATABASE_AUTH_TOKEN);

/** The Drizzle query interface used by every route. */
export const db = drizzle(client, { schema });

/**
 * Round-trips a trivial query against the database.
 *
 * Used by the readiness endpoint only: the liveness endpoint must never touch
 * a dependency, so a slow or unreachable database can never make the platform
 * believe the process is dead.
 */
export async function pingDatabase(): Promise<boolean> {
  try {
    const result = await client.execute('SELECT 1 AS ok');
    const row = result.rows[0] as { ok?: number } | undefined;
    return row?.ok === 1;
  } catch {
    return false;
  }
}

/**
 * Closes the database handle. Called during a graceful shutdown so a local
 * file database is released cleanly; it is a no-op for a remote server.
 */
export async function closeDatabase(): Promise<void> {
  try {
    client.close();
  } catch {
    /* already closed */
  }
}
