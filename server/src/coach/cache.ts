/**
 * In-memory response cache for the AI coach (Layer D step 6, Layer H).
 *
 * Prevents repeated paid generation for identical attempts. Keys are scoped
 * by user id so one user's private result can never leak to another user.
 * Entries are evicted by a simple TTL and a size cap to keep memory bounded.
 */

import { createHash } from 'node:crypto';

export interface CacheEntry {
  value: unknown;
  expiresAt: number;
}

/** Version of the context shape. Bump this when the context builder changes. */
export const COACH_CONTEXT_VERSION = 1;

/** Version of the system prompt. Bump this when the prompt changes. */
export const COACH_PROMPT_VERSION = 1;

function stableHash(input: string): string {
  return createHash('sha256').update(input).digest('hex').slice(0, 16);
}

/** Normalises attempt content into a deterministic string for cache keys. */
export function normalizeAttemptContent(
  userId: number,
  questions: Array<{ questionId: string; selectedAnswer: number | null }>,
  attemptId: string | null,
): string {
  const normalized = JSON.stringify({
    userId,
    attemptId,
    questions: questions
      .slice()
      .sort((a, b) => a.questionId.localeCompare(b.questionId))
      .map(({ questionId, selectedAnswer }) => ({ questionId, selectedAnswer })),
  });
  return stableHash(normalized);
}

/** Builds a cache key that isolates by user, content, context version, and prompt/model version. */
export function buildCacheKey({
  userId,
  contentHash,
  model,
}: {
  userId: number;
  contentHash: string;
  model: string;
}): string {
  return `coach:v${COACH_CONTEXT_VERSION}:p${COACH_PROMPT_VERSION}:u${userId}:${contentHash}:${stableHash(model)}`;
}

export class CoachCache {
  private entries = new Map<string, CacheEntry>();
  private maxEntries: number;

  constructor(maxEntries = 500) {
    this.maxEntries = maxEntries;
  }

  get(key: string): unknown | null {
    const entry = this.entries.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.entries.delete(key);
      return null;
    }
    return entry.value;
  }

  set(key: string, value: unknown, ttlMs: number): void {
    // Enforce a simple size cap by evicting the oldest entry when full.
    if (this.entries.size >= this.maxEntries && !this.entries.has(key)) {
      const firstKey = this.entries.keys().next().value;
      if (firstKey !== undefined) this.entries.delete(firstKey);
    }
    this.entries.set(key, { value, expiresAt: Date.now() + ttlMs });
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  clear(): void {
    this.entries.clear();
  }

  size(): number {
    return this.entries.size;
  }
}
