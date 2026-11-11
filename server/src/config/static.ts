import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { env } from './env.js';
import { resolveFromServerRoot } from './paths.js';

/**
 * Optional static hosting of the built SPA.
 *
 * When `STATIC_DIR` points at a built web client (`dist/`), the API also
 * serves it — including the deep-link fallback — so the whole product can run
 * on a single origin behind one proxy. When it is not set, the API only
 * answers under `/api` and the SPA is hosted separately.
 */
export const staticRoot: string | null = env.STATIC_DIR
  ? resolveFromServerRoot(env.STATIC_DIR)
  : null;

export const staticIndex: string | null = staticRoot ? join(staticRoot, 'index.html') : null;

/** True only when a static root was configured *and* it holds an index.html. */
export const staticEnabled: boolean = Boolean(staticRoot && staticIndex && existsSync(staticIndex));
