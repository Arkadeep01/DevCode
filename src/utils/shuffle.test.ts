import { describe, expect, it } from 'vitest';
import { sampleWithoutRepeats, shuffle } from './shuffle';

describe('shuffle', () => {
  it('returns a new array with the same members', () => {
    const input = ['a', 'b', 'c', 'd'];
    const result = shuffle(input);

    expect(result).not.toBe(input);
    expect([...result].sort()).toEqual([...input].sort());
  });

  it('never mutates the input', () => {
    const input = [1, 2, 3, 4, 5];
    const snapshot = [...input];
    shuffle(input);
    expect(input).toEqual(snapshot);
  });
});

describe('sampleWithoutRepeats', () => {
  it('returns exactly count unique items when the pool is large enough', () => {
    const pool = Array.from({ length: 10 }, (_, index) => index);
    const sample = sampleWithoutRepeats(pool, 5);

    expect(sample).toHaveLength(5);
    expect(new Set(sample).size).toBe(5);
  });

  it('caps at the pool size when count exceeds it', () => {
    expect(sampleWithoutRepeats(['only'], 50)).toEqual(['only']);
  });

  it('returns an empty array for empty pools and non-positive counts', () => {
    expect(sampleWithoutRepeats([], 5)).toEqual([]);
    expect(sampleWithoutRepeats(['a', 'b'], 0)).toEqual([]);
    expect(sampleWithoutRepeats(['a', 'b'], -3)).toEqual([]);
  });
});
