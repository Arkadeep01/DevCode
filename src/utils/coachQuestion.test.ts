import { describe, expect, it } from 'vitest';
import type { CoachPracticeQuestion } from '../services/api';
import {
  isCoachPracticeQuestion,
  toBankQuestion,
  toBankQuestions,
} from './coachQuestion';

function makeQuestion(overrides: Partial<CoachPracticeQuestion> = {}): CoachPracticeQuestion {
  return {
    id: 'coach-q-1',
    category: 'dsa',
    categoryLabel: 'Data Structures & Algorithms',
    difficulty: 'Intermediate',
    question: 'What is the time complexity?',
    codeSnippet: null,
    options: ['O(N)', 'O(N^2)'],
    correctIndex: 0,
    explanation: 'Because.',
    focusArea: 'Focus Area: Arrays',
    aiGenerated: true,
    ...overrides,
  };
}

describe('isCoachPracticeQuestion', () => {
  it('accepts a well-formed generated question', () => {
    expect(isCoachPracticeQuestion(makeQuestion())).toBe(true);
  });

  it('rejects an unsupported category', () => {
    expect(isCoachPracticeQuestion(makeQuestion({ category: 'quantum' as never }))).toBe(false);
  });

  it('rejects an unsupported difficulty', () => {
    expect(isCoachPracticeQuestion(makeQuestion({ difficulty: 'Expert' as never }))).toBe(false);
  });

  it('rejects a question with fewer than two options', () => {
    expect(isCoachPracticeQuestion(makeQuestion({ options: ['only one'] }))).toBe(false);
  });

  it('rejects duplicate options', () => {
    expect(isCoachPracticeQuestion(makeQuestion({ options: ['Same', 'same'] }))).toBe(false);
  });

  it('rejects a correct index that points outside the options', () => {
    expect(isCoachPracticeQuestion(makeQuestion({ correctIndex: 5 }))).toBe(false);
  });

  it('rejects a non-integer correct index', () => {
    expect(isCoachPracticeQuestion(makeQuestion({ correctIndex: 1.5 }))).toBe(false);
  });

  it('rejects a missing explanation', () => {
    expect(isCoachPracticeQuestion(makeQuestion({ explanation: '' }))).toBe(false);
  });

  it('rejects a non-object payload', () => {
    expect(isCoachPracticeQuestion(null)).toBe(false);
    expect(isCoachPracticeQuestion('nope')).toBe(false);
  });
});

describe('toBankQuestion', () => {
  it('converts a valid generated question into a bank question', () => {
    const question = toBankQuestion(makeQuestion());

    expect(question).not.toBeNull();
    expect(question?.category).toBe('dsa');
    expect(question?.options).toEqual(['O(N)', 'O(N^2)']);
    expect(question?.aiGenerated).toBe(true);
  });

  it('returns null for a question that breaks the contract', () => {
    expect(toBankQuestion(makeQuestion({ options: ['dup', 'dup'] }))).toBeNull();
  });

  it('keeps only the valid questions of a batch', () => {
    const questions = toBankQuestions([
      makeQuestion({ id: 'coach-q-1' }),
      makeQuestion({ id: 'coach-q-2', correctIndex: 9 }),
      makeQuestion({ id: 'coach-q-3' }),
    ]);

    expect(questions.map((question) => question.id)).toEqual(['coach-q-1', 'coach-q-3']);
  });
});
