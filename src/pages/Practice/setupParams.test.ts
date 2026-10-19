import { describe, expect, it } from 'vitest';
import { availableCount, parseSetupParams } from './setupParams';

function parse(query: string) {
  return parseSetupParams(new URLSearchParams(query));
}

describe('parseSetupParams', () => {
  it('parses the daily warm-up link', () => {
    const result = parse('track=dsa&difficulty=Beginner&count=5&autostart=1');

    expect(result.config).toEqual({
      tracks: ['dsa'],
      difficulty: 'Beginner',
      count: 5,
      untimed: false,
    });
    expect(result.autostart).toBe(true);
  });

  it('accepts comma-separated tracks and removes duplicates and unknowns', () => {
    const result = parse('track=dsa,sql,dsa,astrology');

    expect(result.config.tracks).toEqual(['dsa', 'sql']);
    expect(result.autostart).toBe(false);
  });

  it('falls back to defaults for unknown values', () => {
    const result = parse('track=ufology&difficulty=Expert&count=wat&autostart=yes');

    expect(result.config).toEqual({
      tracks: [],
      difficulty: 'Mixed',
      count: 5,
      untimed: false,
    });
    expect(result.autostart).toBe(false);
  });

  it('rejects zero and negative counts', () => {
    expect(parse('count=0').config.count).toBe(5);
    expect(parse('count=-3').config.count).toBe(5);
  });

  it('caps the count at the available pool', () => {
    const available = availableCount(['dsa'], 'Beginner');
    const result = parse('track=dsa&difficulty=Beginner&count=999');

    expect(result.config.count).toBe(available);
  });

  it('keeps the requested count when it fits the pool', () => {
    const available = availableCount(['dsa'], 'Beginner');
    const result = parse('track=dsa&difficulty=Beginner&count=3');

    expect(available).toBeGreaterThanOrEqual(3);
    expect(result.config.count).toBe(3);
  });

  it('has enough Beginner DSA questions for the five-question warm-up', () => {
    expect(availableCount(['dsa'], 'Beginner')).toBeGreaterThanOrEqual(5);
  });
});
