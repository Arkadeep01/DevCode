import { randomUUID } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { migrate } from 'drizzle-orm/libsql/migrator';
import { migrationsFolder } from '../src/config/paths.js';

/**
 * Runs before every test file, before any module that reads the environment:
 * each test file gets its own throwaway SQLite database in the OS temp
 * directory (migrated with the committed migrations), so tests never touch
 * server/data/devcode.sqlite and never share state with each other.
 */
process.env.DATABASE_URL = `file:${join(
  tmpdir(),
  `devcode-test-${process.pid}-${randomUUID()}.sqlite`,
)}`;

const { db } = await import('../src/db/client.js');

await migrate(db, { migrationsFolder });
