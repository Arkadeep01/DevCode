import { randomUUID } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';

/**
 * Runs before every test file, before any module that reads the environment:
 * each test file gets its own throwaway SQLite database in the OS temp
 * directory (migrated with the committed migrations), so tests never touch
 * server/data/devcode.sqlite and never share state with each other.
 */
process.env.DATABASE_URL = join(tmpdir(), `devcode-test-${process.pid}-${randomUUID()}.sqlite`);

const { db } = await import('../src/db/client.js');

migrate(db, { migrationsFolder: fileURLToPath(new URL('../drizzle', import.meta.url)) });
