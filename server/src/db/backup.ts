#!/usr/bin/env node
/**
 * Creates a consistent backup of a *local* database file.
 *
 * The script closes the connection before copying, so the copy is a complete
 * database rather than a half-written WAL. It only applies to a file-backed
 * database: a remote libSQL server is backed up by its own provider (Turso
 * ships point-in-time restore and shadow databases), not by copying a file.
 *
 * Run with: node dist/db/backup.js [target-file]
 */
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import {
  createDatabaseClient,
  describeDatabaseTarget,
  isRemoteDatabaseUrl,
  resolveDatabaseFile,
} from '../config/database.js';
import { serverRoot } from '../config/paths.js';

/**
 * The database this script copies.
 *
 * Like the other database tools it reads the target from the environment
 * (with `server/.env` as a fallback), so a backup never depends on the
 * server's secrets.
 */
const databaseUrl = process.env.DATABASE_URL ?? './data/devcode.sqlite';
const authToken = process.env.DATABASE_AUTH_TOKEN;
const remote = isRemoteDatabaseUrl(databaseUrl);
const databaseFile = resolveDatabaseFile(databaseUrl);
const databaseTarget = describeDatabaseTarget(databaseUrl);

if (remote || databaseFile === null) {
  console.error(
    `[backup] ${databaseTarget} is a remote database and has no local file to copy. ` +
      'Use the provider\'s own backup tooling (Turso: point-in-time restore or a shadow database).',
  );
  process.exit(1);
}

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const target = resolve(
  serverRoot,
  process.argv[2] ?? `backups/devcode-${stamp}.sqlite`,
);

if (!existsSync(databaseFile)) {
  console.error(`[backup] no database file at ${databaseFile}`);
  process.exit(1);
}

mkdirSync(dirname(target), { recursive: true });

console.log(`[backup] ${databaseFile} -> ${target}`);

try {
  // Close first: a copy taken while the connection is open could miss the
  // last writes still sitting in the write-ahead log.
  const client = createDatabaseClient(databaseUrl, authToken);
  client.close();
  copyFileSync(databaseFile, target);
  console.log('[backup] backup complete');
} catch (error) {
  console.error('[backup] backup failed:', error);
  process.exitCode = 1;
}
