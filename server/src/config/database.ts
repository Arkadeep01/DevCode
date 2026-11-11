import { createClient, type Client } from '@libsql/client';
import { config } from 'dotenv';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { serverRoot, resolveFromServerRoot } from './paths.js';

/**
 * Database configuration that does **not** depend on the validated server
 * environment.
 *
 * The server reads its database settings from the validated environment
 * (`config/env.ts`), but the database tools — `db:migrate`, `db:seed` and
 * `db:backup` — are run by an operator from a workstation. They must not
 * require an unrelated secret such as `JWT_SECRET` just to be able to apply a
 * migration, so they read `DATABASE_URL` / `DATABASE_AUTH_TOKEN` directly.
 *
 * They do load `server/.env` (without overriding anything that is already in
 * the environment), so an operator who configured the file does not
 * accidentally operate on the default local file instead of the target
 * database.
 */
config({ path: resolve(serverRoot, '.env'), quiet: true });

/** True when the database is reached over the network. */
export function isRemoteDatabaseUrl(databaseUrl: string): boolean {
  return /^(libsql|https):\/\//i.test(databaseUrl);
}

/**
 * The absolute path of a local database file, or `null` for a remote server.
 * A `file:` prefix is accepted and stripped.
 */
export function resolveDatabaseFile(databaseUrl: string): string | null {
  if (isRemoteDatabaseUrl(databaseUrl)) return null;

  const path = databaseUrl.startsWith('file:') ? databaseUrl.slice('file:'.length) : databaseUrl;
  return resolveFromServerRoot(path);
}

/**
 * A short, non-sensitive description of a database target, for the operator's
 * log. A remote URL is reduced to its host, so a token embedded in the URL
 * could never reach a log file.
 */
export function describeDatabaseTarget(databaseUrl: string): string {
  if (isRemoteDatabaseUrl(databaseUrl)) {
    try {
      return `remote libSQL (${new URL(databaseUrl).host})`;
    } catch {
      return 'remote libSQL (unknown host)';
    }
  }

  return `file ${resolveDatabaseFile(databaseUrl) ?? ''}`;
}

/**
 * Creates a libSQL client for the given target.
 *
 * The native driver does not create the directory that holds a local file, so
 * it is created here — otherwise the first migration on a fresh checkout
 * fails with "Unable to open connection to local database".
 */
export function createDatabaseClient(
  databaseUrl: string,
  authToken?: string | undefined,
): Client {
  const remote = isRemoteDatabaseUrl(databaseUrl);
  const file = remote ? null : resolveDatabaseFile(databaseUrl);

  if (file !== null) {
    mkdirSync(dirname(file), { recursive: true });
  }

  return createClient({
    url: remote ? databaseUrl : `file:${file ?? ''}`,
    // The token is only ever sent to a remote server. A local file must not
    // receive it — the native driver would treat it as a credential for a
    // database that has none, and it would end up in local file metadata.
    ...(remote && authToken ? { authToken } : {}),
  });
}
