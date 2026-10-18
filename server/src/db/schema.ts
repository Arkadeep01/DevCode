/**
 * Drizzle schema for the DevCode database.
 *
 * Tables land in the "schema & authentication" phase:
 *   - users          (accounts + credentials)
 *   - questions      (interview question bank)
 *   - submissions    (code/answer submissions per user)
 *   - progress       (per-user study + practice tracking)
 *
 * Keeping this file as the single schema entry point lets drizzle-kit and the
 * DB client stay wired up while the tables are added incrementally.
 */
export {};
