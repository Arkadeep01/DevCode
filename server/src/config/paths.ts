import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Filesystem anchors used by the server.
 *
 * Every path is derived from the location of this module rather than from
 * `process.cwd()`, so the same configuration works whether the process is
 * started from the repository root, from `server/`, or from a container image
 * where the working directory is `/app/server`.
 */

/** Root of the `server/` package (`…/devcode-assessment/server`). */
export const serverRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

/** Root of the repository (`…/devcode-assessment`). */
export const repoRoot = resolve(serverRoot, '..');

/** Directory holding the committed SQL migrations. */
export const migrationsFolder = resolve(serverRoot, 'drizzle');

/**
 * Resolves a configured path against the `server/` package root. Absolute
 * paths are returned unchanged.
 */
export function resolveFromServerRoot(value: string): string {
  return resolve(serverRoot, value);
}
