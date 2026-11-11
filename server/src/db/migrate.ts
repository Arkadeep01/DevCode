#!/usr/bin/env node
/**
 * Applies the committed SQL migrations to the configured database.
 *
 * The same script serves both targets: a local file (`DATABASE_URL=file:…`)
 * and a remote libSQL server (`DATABASE_URL=libsql://…`). It uses only
 * runtime dependencies, so a deployment image that ships `npm ci --omit=dev`
 * can still migrate as a release step.
 *
 * This is an operator tool: it reads `DATABASE_URL` and
 * `DATABASE_AUTH_TOKEN` straight from the environment, so applying a
 * migration never requires an unrelated server secret such as `JWT_SECRET`.
 *
 * Run with: npm run db:migrate            (development, via tsx)
 *           node dist/db/migrate.js       (after `npm run build`)
 */
import { migrate } from 'drizzle-orm/libsql/migrator';
import { drizzle } from 'drizzle-orm/libsql';
import { createDatabaseClient, describeDatabaseTarget } from '../config/database.js';
import { migrationsFolder } from '../config/paths.js';

const databaseUrl = process.env.DATABASE_URL ?? './data/devcode.sqlite';
const authToken = process.env.DATABASE_AUTH_TOKEN;
const databaseTarget = describeDatabaseTarget(databaseUrl);

const client = createDatabaseClient(databaseUrl, authToken);
const db = drizzle(client);

console.log(`[migrate] applying migrations to ${databaseTarget}`);

try {
  await migrate(db, { migrationsFolder });
  console.log('[migrate] migrations applied');
} catch (error) {
  console.error('[migrate] migration failed:', error);
  process.exitCode = 1;
} finally {
  client.close();
}
