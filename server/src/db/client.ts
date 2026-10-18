import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { env } from '../config/env.js';
import * as schema from './schema.js';

/**
 * SQLite connection shared by the whole server. The file path comes from
 * DATABASE_URL (relative paths resolve from the server/ directory) and is
 * created on first boot so a fresh clone needs no manual setup.
 */
const file = resolve(process.cwd(), env.DATABASE_URL);
mkdirSync(dirname(file), { recursive: true });

export const sqlite = new Database(file);

// WAL keeps reads concurrent with writes; foreign keys are required for the
// relations added in the schema phase.
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');

export const db = drizzle(sqlite, { schema });
