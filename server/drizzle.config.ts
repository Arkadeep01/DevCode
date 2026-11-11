import { defineConfig } from 'drizzle-kit';

/**
 * Drizzle Kit configuration.
 *
 * It is only used to *generate* new migration files from the schema:
 * `npm run db:generate`. Applying the migrations is done by
 * `npm run db:migrate`, which uses the runtime libSQL client and therefore
 * works against a local file and a remote libSQL server alike — Drizzle Kit
 * can only talk to a local SQLite file.
 */
export default defineConfig({
  dialect: 'sqlite',
  schema: './src/db/schema.ts',
  out: './drizzle',
  dbCredentials: { url: './data/devcode.sqlite' },
  strict: true,
  verbose: true,
});
