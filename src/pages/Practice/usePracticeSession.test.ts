import { describe, expect, it } from 'vitest';
import { QUESTIONS } from '../../data/questions';
import type { Question } from '../../types/question';
import type { PracticeConfig } from './practiceTypes';
import { buildSession, toSessionQuestion } from './usePracticeSession';

function makeQuestion(overrides: Partial<Question> = {}): Question {
  return {
    id: 'test-q1',
    category: 'dsa',
    categoryLabel: 'DSA',
    difficulty: 'Beginner',
    question: 'Prompt?',
    codeSnippet: null,
    options: ['alpha', 'beta', 'gamma', 'delta'],
    correctIndex: 0,
    explanation: 'Because.',
    focusArea: 'Arrays',
    ...overrides,
  };
}

describe('toSessionQuestion', () => {
  it('remaps correctIndex to the shuffled position of the correct option', () => {
    for (let run = 0; run < 20; run++) {
      const session = toSessionQuestion(makeQuestion());

      expect(session.correctIndex).toBeGreaterThanOrEqual(0);
      expect(session.options[session.correctIndex]).toBe('alpha');
    }
  });

  it('keeps the option set and does not mutate the source question', () => {
    const question = makeQuestion();
    const session = toSessionQuestion(question);

    expect([...session.options].sort()).toEqual([...question.options].sort());
    expect(question.options).toEqual(['alpha', 'beta', 'gamma', 'delta']);
    expect(question.correctIndex).toBe(0);
  });

  it('keeps grading by value with duplicate option text (indexOf points at the first match)', () => {
    const session = toSessionQuestion(makeQuestion({ options: ['dup', 'other', 'dup', 'third'] }));

    // The remap uses options.indexOf(correctOption): duplicates make the index
    // ambiguous, but since grading compares option values the result is the same.
    expect(session.options[session.correctIndex]).toBe('dup');
    expect([...session.options].sort()).toEqual(['dup', 'dup', 'other', 'third']);
  });
});

describe('buildSession', () => {
  const config = (overrides: Partial<PracticeConfig> = {}): PracticeConfig => ({
    tracks: ['dsa'],
    difficulty: 'Mixed',
    count: 5,
    untimed: false,
    ...overrides,
  });

  it('returns exactly count questions when the pool allows it', () => {
    const session = buildSession(config());

    expect(session).toHaveLength(5);
    expect(session.every((q) => q.category === 'dsa')).toBe(true);
  });

  it('filters by exact difficulty unless Mixed is requested', () => {
    const session = buildSession(config({ difficulty: 'Beginner', count: 3 }));

    expect(session).toHaveLength(3);
    expect(session.every((q) => q.difficulty === 'Beginner')).toBe(true);
  });

  it('Mixed keeps the requested tracks only', () => {
    const session = buildSession(config({ tracks: ['python'], count: 4 }));

    expect(session).toHaveLength(4);
    expect(session.every((q) => q.category === 'python')).toBe(true);
  });

  it('never repeats a question and caps at the pool size', () => {
    const pool = QUESTIONS.filter((q) => q.category === 'dsa' && q.difficulty === 'Beginner');
    const session = buildSession(config({ difficulty: 'Beginner', count: 999 }));

    expect(session).toHaveLength(pool.length);
    expect(new Set(session.map((q) => q.id)).size).toBe(session.length);
  });

  it('supports multiple tracks at once', () => {
    const session = buildSession(config({ tracks: ['dsa', 'python'], count: 8 }));

    expect(session).toHaveLength(8);
    expect(session.every((q) => q.category === 'dsa' || q.category === 'python')).toBe(true);
    expect(new Set(session.map((q) => q.id)).size).toBe(8);
  });

  it('returns questions whose remapped correctIndex matches the source bank', () => {
    const session = buildSession(config());

    for (const question of session) {
      const source = QUESTIONS.find((q) => q.id === question.id);
      if (!source) throw new Error(`question ${question.id} missing from the bank`);
      expect(question.options[question.correctIndex]).toBe(source.options[source.correctIndex]);
    }
  });
});
