import type { InValue } from '@libsql/client';
import { client } from '../../src/db/client.js';

/**
 * Small SQL helpers for the test suite.
 *
 * The API talks to the database through the libSQL client, which is
 * asynchronous. These helpers keep the test bodies readable: they run a
 * statement and hand back the rows.
 */

/** Runs a statement for its side effect. */
export async function execute(sql: string, ...args: InValue[]): Promise<void> {
  await client.execute(sql, args);
}

/** Runs a query and returns the first row, or `undefined` when there is none. */
export async function queryOne<T = Record<string, unknown>>(
  sql: string,
  ...args: InValue[]
): Promise<T | undefined> {
  const result = await client.execute(sql, args);
  return result.rows[0] as T | undefined;
}

/** Runs a query and returns every row. */
export async function queryAll<T = Record<string, unknown>>(
  sql: string,
  ...args: InValue[]
): Promise<T[]> {
  const result = await client.execute(sql, args);
  return result.rows as T[];
}
