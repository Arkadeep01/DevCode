/**
 * Database error helpers shared by the routes.
 */

/**
 * Detects a UNIQUE constraint violation.
 *
 * `better-sqlite3` reports the specific code `SQLITE_CONSTRAINT_UNIQUE`,
 * while libSQL reports the generic `SQLITE_CONSTRAINT` and names the kind in
 * the message. Drizzle wraps the driver error in its own `DrizzleQueryError`,
 * so the original error is inspected as well.
 */
export function isUniqueViolation(error: unknown): boolean {
  return hasUniqueViolation(error, 0);
}

function hasUniqueViolation(error: unknown, depth: number): boolean {
  if (depth > 5 || typeof error !== 'object' || error === null) return false;

  const candidate = error as { code?: unknown; message?: unknown; cause?: unknown };
  const code = typeof candidate.code === 'string' ? candidate.code : '';

  if (code === 'SQLITE_CONSTRAINT_UNIQUE') return true;

  const message = typeof candidate.message === 'string' ? candidate.message : '';
  if (/UNIQUE constraint failed/i.test(message)) return true;

  return hasUniqueViolation(candidate.cause, depth + 1);
}
