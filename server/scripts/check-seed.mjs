#!/usr/bin/env node
/**
 * Read-only verification of the seeded question bank.
 *
 * Confirms that the canonical `questions` table holds the whole bank and
 * that every row carries the fields the coach depends on.
 */
import { createClient } from '@libsql/client';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const serverRoot = resolve('.');

function readEnvFile() {
  const values = {};
  for (const raw of readFileSync(resolve(serverRoot, '.env'), 'utf8').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const i = line.indexOf('=');
    if (i === -1) continue;
    values[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return values;
}

const fileEnv = readEnvFile();
const databaseUrl = process.env.DATABASE_URL || fileEnv.DATABASE_URL;
const authToken = process.env.DATABASE_AUTH_TOKEN || fileEnv.DATABASE_AUTH_TOKEN;

if (!databaseUrl) {
  console.error('no DATABASE_URL configured');
  process.exit(1);
}

const remote = /^(libsql|https):\/\//i.test(databaseUrl);
const file = databaseUrl.startsWith('file:') ? databaseUrl.slice(5) : remote ? null : databaseUrl;

const client = createClient({
  url: remote ? databaseUrl : `file:${file}`,
  ...(authToken ? { authToken } : {}),
});

try {
  const total = await client.execute('SELECT COUNT(*) AS n FROM questions');
  const count = Number(total.rows[0].n);

  const complete = await client.execute(
    'SELECT COUNT(*) AS n FROM questions WHERE slug IS NOT NULL AND prompt IS NOT NULL AND options IS NOT NULL AND correct_index IS NOT NULL AND focus_area IS NOT NULL',
  );
  const completeCount = Number(complete.rows[0].n);

  const categories = await client.execute(
    'SELECT category, COUNT(*) AS n FROM questions GROUP BY category ORDER BY category',
  );

  const users = await client.execute('SELECT COUNT(*) AS n FROM users');
  const attempts = await client.execute('SELECT COUNT(*) AS n FROM attempts');

  console.log('questions in the database      :', count);
  console.log('rows with every required field :', completeCount);
  console.log('distinct categories            :', categories.rows.length);
  for (const row of categories.rows) {
    console.log('   ', String(row.category).padEnd(14), String(row.n));
  }
  console.log('users                           :', Number(users.rows[0].n));
  console.log('attempts                        :', Number(attempts.rows[0].n));

  if (count === 97 && completeCount === 97) {
    console.log('\nseed verification ok — the 97-question bank is complete.');
  } else {
    console.error('\nseed verification FAILED — expected 97 complete questions.');
    process.exitCode = 1;
  }
} catch (error) {
  console.error('seed verification failed:', error && error.message ? error.message : error);
  process.exitCode = 1;
} finally {
  client.close();
}
