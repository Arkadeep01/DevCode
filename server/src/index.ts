import app from './app.js';

/**
 * Vercel entry point.
 *
 * Vercel's zero-configuration Express support looks for an `app.*`, `index.*`
 * or `server.*` file that exports the Express application as its default
 * export, and routes every request of the project to it. The application must
 * not bind a port in that environment — the platform owns the socket — which
 * is why the listener lives in `local-server.ts`.
 *
 * The same module works for `vercel dev`, which imports it exactly like the
 * production runtime does.
 */
export default app;
