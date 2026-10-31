import { describe, expect, it } from 'vitest';
import {
  CoachCategorySchema,
  CoachDifficultySchema,
  CoachExplanationSchema,
  CoachPracticeQuestionSchema,
  CoachRequestSchema,
  CoachResponseSchema,
  CoachStudyPlanItemSchema,
} from '../src/coach/contracts.js';
import type { CoachResponse } from '../src/coach/contracts.js';

const VALID_QUESTION_ID = 'dsa-b1';

describe('CoachRequestSchema', () => {
  it('accepts a well-formed attempt payload', () => {
    const parsed = CoachRequestSchema.safeParse({
      questions: [{ questionId: VALID_QUESTION_ID, selectedAnswer: 2 }],
    });

    expect(parsed.success).toBe(true);
  });

  it('accepts an optional attemptId', () => {
    const parsed = CoachRequestSchema.safeParse({
      attemptId: 'attempt-2026-10-31-abc',
      questions: [{ questionId: VALID_QUESTION_ID, selectedAnswer: null }],
    });

    expect(parsed.success).toBe(true);
  });

  it('accepts skipped questions (null selectedAnswer)', () => {
    const parsed = CoachRequestSchema.safeParse({
      questions: [{ questionId: VALID_QUESTION_ID, selectedAnswer: null }],
    });

    expect(parsed.success).toBe(true);
  });

  it('rejects an empty questions array', () => {
    const parsed = CoachRequestSchema.safeParse({ questions: [] });

    expect(parsed.success).toBe(false);
  });

  it('rejects more than 50 questions', () => {
    const questions = Array.from({ length: 51 }, (_, index) => ({
      questionId: `dsa-${index}`,
      selectedAnswer: null,
    }));

    const parsed = CoachRequestSchema.safeParse({ questions });

    expect(parsed.success).toBe(false);
  });

  it('accepts exactly 50 questions', () => {
    const questions = Array.from({ length: 50 }, (_, index) => ({
      questionId: `dsa-${index}`,
      selectedAnswer: null,
    }));

    const parsed = CoachRequestSchema.safeParse({ questions });

    expect(parsed.success).toBe(true);
  });

  it('rejects duplicate question ids', () => {
    const parsed = CoachRequestSchema.safeParse({
      questions: [
        { questionId: 'dsa-b1', selectedAnswer: 0 },
        { questionId: 'dsa-b1', selectedAnswer: 1 },
      ],
    });

    expect(parsed.success).toBe(false);
  });

  it('rejects a negative selectedAnswer', () => {
    const parsed = CoachRequestSchema.safeParse({
      questions: [{ questionId: VALID_QUESTION_ID, selectedAnswer: -1 }],
    });

    expect(parsed.success).toBe(false);
  });

  it('rejects a non-integer selectedAnswer', () => {
    const parsed = CoachRequestSchema.safeParse({
      questions: [{ questionId: VALID_QUESTION_ID, selectedAnswer: 1.5 }],
    });

    expect(parsed.success).toBe(false);
  });
});

describe('CoachResponseSchema', () => {
  it('accepts a grounded response with explanations, plan and practice questions', () => {
    const response: CoachResponse = {
      explanations: [
        {
          questionId: VALID_QUESTION_ID,
          whyWrong: 'The answer targeted array memory layout.',
          concept: 'Contiguous arrays',
          explanation: 'Arrays store elements in contiguous memory.',
        },
      ],
      studyPlan: [{ topicId: 'dsa-sliding-window', reason: 'Repeated misses', priority: 1 }],
      practiceQuestions: [
        {
          id: 'coach-q-1',
          category: 'dsa',
          categoryLabel: 'Data Structures & Algorithms',
          difficulty: 'Intermediate',
          question: 'Reverse a linked list in place.',
          codeSnippet: null,
          options: ['Iterative', 'Recursive', 'Both', 'Neither'],
          correctIndex: 2,
          explanation: 'Both approaches are valid.',
          focusArea: 'Focus Area: Linked List Reversal',
        },
      ],
    };

    const parsed = CoachResponseSchema.safeParse(response);

    expect(parsed.success).toBe(true);
  });

  it('accepts an empty coaching response for a clean sweep', () => {
    const parsed = CoachResponseSchema.safeParse({
      explanations: [],
      studyPlan: [],
      practiceQuestions: [],
    });

    expect(parsed.success).toBe(true);
  });

  it('rejects an explanation without whyWrong', () => {
    const parsed = CoachResponseSchema.safeParse({
      explanations: [
        {
          questionId: VALID_QUESTION_ID,
          whyWrong: '',
          concept: 'Arrays',
          explanation: 'Because contiguous memory.',
        },
      ],
      studyPlan: [],
      practiceQuestions: [],
    });

    expect(parsed.success).toBe(false);
  });

  it('rejects a study plan entry with an out-of-range priority', () => {
    const parsed = CoachResponseSchema.safeParse({
      explanations: [],
      studyPlan: [{ topicId: 'dsa-sliding-window', reason: 'r', priority: 9 }],
      practiceQuestions: [],
    });

    expect(parsed.success).toBe(false);
  });

  it('rejects a generated question whose correctIndex is out of range', () => {
    const parsed = CoachResponseSchema.safeParse({
      explanations: [],
      studyPlan: [],
      practiceQuestions: [
        {
          id: 'coach-q-1',
          category: 'dsa',
          categoryLabel: 'Data Structures & Algorithms',
          difficulty: 'Beginner',
          question: 'Pick one.',
          codeSnippet: null,
          options: ['Only one option'],
          correctIndex: 0,
          explanation: 'Because.',
          focusArea: 'Focus Area: X',
        },
      ],
    });

    expect(parsed.success).toBe(false);
  });

  it('rejects a generated question with duplicate options', () => {
    const parsed = CoachResponseSchema.safeParse({
      explanations: [],
      studyPlan: [],
      practiceQuestions: [
        {
          id: 'coach-q-1',
          category: 'dsa',
          categoryLabel: 'Data Structures & Algorithms',
          difficulty: 'Beginner',
          question: 'Pick one.',
          codeSnippet: null,
          options: ['Same', 'Same'],
          correctIndex: 0,
          explanation: 'Because.',
          focusArea: 'Focus Area: X',
        },
      ],
    });

    expect(parsed.success).toBe(false);
  });

  it('rejects a generated question with an unsupported category', () => {
    const parsed = CoachResponseSchema.safeParse({
      explanations: [],
      studyPlan: [],
      practiceQuestions: [
        {
          id: 'coach-q-1',
          category: 'quantum',
          categoryLabel: 'Quantum',
          difficulty: 'Beginner',
          question: 'Pick one.',
          codeSnippet: null,
          options: ['a', 'b'],
          correctIndex: 0,
          explanation: 'Because.',
          focusArea: 'Focus Area: X',
        },
      ],
    });

    expect(parsed.success).toBe(false);
  });

  it('rejects more than five practice questions', () => {
    const question = {
      id: 'coach-q-1',
      category: 'dsa' as const,
      categoryLabel: 'Data Structures & Algorithms',
      difficulty: 'Beginner' as const,
      question: 'Pick one.',
      codeSnippet: null,
      options: ['a', 'b'],
      correctIndex: 0,
      explanation: 'Because.',
      focusArea: 'Focus Area: X',
    };
    const parsed = CoachResponseSchema.safeParse({
      explanations: [],
      studyPlan: [],
      practiceQuestions: Array.from({ length: 6 }, (_, index) => ({ ...question, id: `coach-q-${index}` })),
    });

    expect(parsed.success).toBe(false);
  });
});

describe('coach enum schemas', () => {
  it('accepts the supported coach categories and difficulties', () => {
    expect(CoachCategorySchema.safeParse('dsa').success).toBe(true);
    expect(CoachCategorySchema.safeParse('javascript').success).toBe(true);
    expect(CoachDifficultySchema.safeParse('Intermediate').success).toBe(true);
  });

  it('rejects unsupported coach difficulties', () => {
    expect(CoachDifficultySchema.safeParse('Expert').success).toBe(false);
  });

  it('exposes the practice plan item schema', () => {
    const parsed = CoachStudyPlanItemSchema.safeParse({
      topicId: 'dsa-sliding-window',
      reason: 'Repeated misses on sliding window.',
      priority: 1,
    });

    expect(parsed.success).toBe(true);
  });
});