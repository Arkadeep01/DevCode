import { describe, expect, it } from 'vitest';
import {
  buildCacheKey,
  COACH_CONTEXT_VERSION,
  COACH_PROMPT_VERSION,
  CoachCache,
  normalizeAttemptContent,
} from '../src/coach/cache.js';

describe('normalizeAttemptContent', () => {
  it('is stable regardless of the question order', () => {
    const a = normalizeAttemptContent(7, [
      { questionId: 'dsa-b2', selectedAnswer: 1 },
      { questionId: 'dsa-b1', selectedAnswer: null },
    ], 'attempt-1');
    const b = normalizeAttemptContent(7, [
      { questionId: 'dsa-b1', selectedAnswer: null },
      { questionId: 'dsa-b2', selectedAnswer: 1 },
    ], 'attempt-1');

    expect(a).toBe(b);
  });

  it('changes when a selected answer changes', () => {
    const a = normalizeAttemptContent(7, [{ questionId: 'dsa-b1', selectedAnswer: 0 }], 'attempt-1');
    const b = normalizeAttemptContent(7, [{ questionId: 'dsa-b1', selectedAnswer: 1 }], 'attempt-1');

    expect(a).not.toBe(b);
  });

  it('changes when the attempt id changes', () => {
    const a = normalizeAttemptContent(7, [{ questionId: 'dsa-b1', selectedAnswer: 0 }], 'attempt-1');
    const b = normalizeAttemptContent(7, [{ questionId: 'dsa-b1', selectedAnswer: 0 }], 'attempt-2');

    expect(a).not.toBe(b);
  });

  it('changes when the user changes', () => {
    const a = normalizeAttemptContent(7, [{ questionId: 'dsa-b1', selectedAnswer: 0 }], 'attempt-1');
    const b = normalizeAttemptContent(8, [{ questionId: 'dsa-b1', selectedAnswer: 0 }], 'attempt-1');

    expect(a).not.toBe(b);
  });
});

describe('buildCacheKey', () => {
  const contentHash = 'abc123';

  it('isolates entries per user', () => {
    const first = buildCacheKey({ userId: 1, contentHash, model: 'mock' });
    const second = buildCacheKey({ userId: 2, contentHash, model: 'mock' });

    expect(first).not.toBe(second);
    expect(first).toContain('u1');
    expect(second).toContain('u2');
  });

  it('includes the context and prompt versions', () => {
    const key = buildCacheKey({ userId: 1, contentHash, model: 'mock' });

    expect(key).toContain(`v${COACH_CONTEXT_VERSION}`);
    expect(key).toContain(`p${COACH_PROMPT_VERSION}`);
  });

  it('changes when the model changes', () => {
    const first = buildCacheKey({ userId: 1, contentHash, model: 'mock' });
    const second = buildCacheKey({ userId: 1, contentHash, model: 'gpt-4o-mini' });

    expect(first).not.toBe(second);
  });

  it('is deterministic', () => {
    const first = buildCacheKey({ userId: 1, contentHash, model: 'mock' });
    const second = buildCacheKey({ userId: 1, contentHash, model: 'mock' });

    expect(first).toBe(second);
  });
});

describe('CoachCache', () => {
  it('returns a stored value before it expires', () => {
    const cache = new CoachCache();
    cache.set('key', { value: 1 }, 1000);

    expect(cache.get('key')).toEqual({ value: 1 });
    expect(cache.has('key')).toBe(true);
  });

  it('returns null for an unknown key', () => {
    const cache = new CoachCache();

    expect(cache.get('missing')).toBeNull();
    expect(cache.has('missing')).toBe(false);
  });

  it('expires an entry once the ttl has passed', () => {
    const cache = new CoachCache();
    cache.set('key', 'value', -1);

    expect(cache.get('key')).toBeNull();
  });

  it('evicts the oldest entry when the size cap is reached', () => {
    const cache = new CoachCache(2);
    cache.set('a', 1, 1000);
    cache.set('b', 2, 1000);
    cache.set('c', 3, 1000);

    expect(cache.size()).toBe(2);
    expect(cache.get('a')).toBeNull();
    expect(cache.get('c')).toEqual(3);
  });

  it('clears every entry', () => {
    const cache = new CoachCache();
    cache.set('a', 1, 1000);
    cache.clear();

    expect(cache.size()).toBe(0);
  });
});
