import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { QuizAttempt } from '../types/question';
import {
  STORAGE_KEYS,
  clearQuizHistory,
  readIdSet,
  readJson,
  readQuizHistory,
  saveQuizAttempt,
  writeIdSet,
} from './storage';

function makeAttempt(index: number): QuizAttempt {
  return {
    date: new Date(2026, 0, index + 1).toISOString(),
    score: index,
    total: 5,
    pct: index * 20,
    tracks: ['dsa'],
    difficulty: 'Mixed',
    count: 5,
    timeSec: 60,
  };
}

describe('storage helpers', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('readJson returns the fallback for missing, corrupt or null values', () => {
    expect(readJson('missing-key', ['fallback'])).toEqual(['fallback']);

    window.localStorage.setItem('corrupt', '{not json');
    expect(readJson('corrupt', 'fallback')).toBe('fallback');

    window.localStorage.setItem('nullish', 'null');
    expect(readJson('nullish', 'fallback')).toBe('fallback');
  });

  it('readIdSet survives corrupt or non-array payloads', () => {
    expect(readIdSet('devcode_study_mastered')).toEqual(new Set());

    window.localStorage.setItem('devcode_study_mastered', '{nope');
    expect(readIdSet('devcode_study_mastered')).toEqual(new Set());

    window.localStorage.setItem('devcode_study_mastered', '{"a":1}');
    expect(readIdSet('devcode_study_mastered')).toEqual(new Set());
  });

  it('readIdSet filters out non-string entries', () => {
    window.localStorage.setItem('devcode_study_mastered', JSON.stringify(['a', 1, null, 'b']));
    expect(readIdSet('devcode_study_mastered')).toEqual(new Set(['a', 'b']));
  });

  it('writeIdSet round-trips through localStorage', () => {
    writeIdSet(STORAGE_KEYS.bookmarks, new Set(['x', 'y']));
    expect(readIdSet(STORAGE_KEYS.bookmarks)).toEqual(new Set(['x', 'y']));
  });

  it('does not throw when localStorage is unavailable', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage disabled');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('storage disabled');
    });

    expect(readIdSet('any-key')).toEqual(new Set());
    expect(readQuizHistory()).toEqual([]);
    expect(() => writeIdSet('any-key', new Set(['a']))).not.toThrow();
  });

  it('saveQuizAttempt keeps the newest first and caps history at 20', () => {
    for (let index = 1; index <= 21; index++) {
      saveQuizAttempt(makeAttempt(index));
    }

    const history = readQuizHistory();
    expect(history).toHaveLength(20);
    expect(history[0].score).toBe(21);
    expect(history[19].score).toBe(2);
  });

  it('clearQuizHistory removes the stored attempts', () => {
    saveQuizAttempt(makeAttempt(1));
    clearQuizHistory();
    expect(readQuizHistory()).toEqual([]);
  });

  it.fails('readQuizHistory filters out invalid entries (known issue E5: unvalidated cast)', () => {
    window.localStorage.setItem(
      STORAGE_KEYS.quizHistory,
      JSON.stringify([{ nonsense: true }, makeAttempt(1)]),
    );
    expect(readQuizHistory()).toHaveLength(1);
  });
});
