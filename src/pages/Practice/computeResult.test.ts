import { describe, expect, it } from 'vitest';
import type { SessionQuestion } from '../../types/question';
import type { PracticeConfig } from './practiceTypes';
import { computeResult } from './computeResult';

function makeQuestion(overrides: Partial<SessionQuestion> = {}): SessionQuestion {
  return {
    id: 'q1',
    category: 'dsa',
    categoryLabel: 'DSA',
    difficulty: 'Beginner',
    question: 'Prompt?',
    codeSnippet: null,
    options: ['a', 'b', 'c', 'd'],
    correctIndex: 1,
    explanation: 'Because.',
    focusArea: 'Arrays',
    ...overrides,
  };
}

const CONFIG: PracticeConfig = {
  tracks: ['dsa', 'sql'],
  difficulty: 'Mixed',
  count: 4,
  untimed: false,
};

describe('computeResult', () => {
  const startedAt = Date.now() - 12_000;

  it('scores correct answers and produces a clean review', () => {
    const { result } = computeResult([makeQuestion()], [1], [false], startedAt, CONFIG);

    expect(result.score).toBe(1);
    expect(result.total).toBe(1);
    expect(result.pct).toBe(100);
    expect(result.unanswered).toBe(0);
    expect(result.review.map((item) => item.correct)).toEqual([true]);
    expect(result.focusGroups).toEqual([]);
    expect(result.timeSec).toBeGreaterThanOrEqual(12);
  });

  it('treats a wrong answer as missed and collects its focus area', () => {
    const { result } = computeResult([makeQuestion()], [0], [false], startedAt, CONFIG);

    expect(result.score).toBe(0);
    expect(result.pct).toBe(0);
    expect(result.review[0].correct).toBe(false);
    expect(result.focusGroups).toEqual([
      { category: 'dsa', categoryLabel: 'DSA', areas: ['Arrays'] },
    ]);
  });

  it('treats a skipped answer as unanswered and includes it in focus areas', () => {
    const { result } = computeResult([makeQuestion()], [null], [false], startedAt, CONFIG);

    expect(result.unanswered).toBe(1);
    expect(result.review[0].selected).toBeNull();
    expect(result.review[0].correct).toBe(false);
    expect(result.focusGroups).toHaveLength(1);
  });

  it('splits a mixed session: only missed or skipped questions drive focus areas', () => {
    const questions = [
      makeQuestion({ id: 'q1', focusArea: 'Arrays' }),
      makeQuestion({ id: 'q2', focusArea: 'Trees' }),
      makeQuestion({ id: 'q3', focusArea: 'Graphs' }),
      makeQuestion({ id: 'q4', category: 'sql', categoryLabel: 'SQL', focusArea: 'Joins' }),
    ];
    const { result } = computeResult(
      questions,
      [1, 0, null, 0],
      [true, false, false, false],
      startedAt,
      CONFIG,
    );

    expect(result.score).toBe(1);
    expect(result.total).toBe(4);
    expect(result.pct).toBe(25);
    expect(result.unanswered).toBe(1);
    expect(result.review[0].flagged).toBe(true);
    expect(result.focusGroups).toEqual([
      { category: 'dsa', categoryLabel: 'DSA', areas: ['Trees', 'Graphs'] },
      { category: 'sql', categoryLabel: 'SQL', areas: ['Joins'] },
    ]);
    expect(result.categories).toEqual([
      { category: 'dsa', categoryLabel: 'DSA', correct: 1, total: 3 },
      { category: 'sql', categoryLabel: 'SQL', correct: 0, total: 1 },
    ]);
  });

  it('deduplicates focus areas within one category', () => {
    const questions = [
      makeQuestion({ id: 'q1', focusArea: 'Arrays' }),
      makeQuestion({ id: 'q2', focusArea: 'Arrays' }),
    ];
    const { result } = computeResult(questions, [0, 0], [false, false], startedAt, CONFIG);

    expect(result.focusGroups).toEqual([
      { category: 'dsa', categoryLabel: 'DSA', areas: ['Arrays'] },
    ]);
  });

  it('returns a history attempt that mirrors the session config', () => {
    const { attempt, result } = computeResult(
      [makeQuestion(), makeQuestion({ id: 'q2' })],
      [1, 0],
      [false, false],
      startedAt,
      CONFIG,
    );

    expect(attempt.score).toBe(result.score);
    expect(attempt.total).toBe(2);
    expect(attempt.count).toBe(2);
    expect(attempt.pct).toBe(50);
    expect(attempt.tracks).toEqual(['dsa', 'sql']);
    expect(attempt.difficulty).toBe('Mixed');
    expect(attempt.timeSec).toBeGreaterThanOrEqual(12);
    expect(new Date(attempt.date).toISOString()).toBe(attempt.date);
  });
});
