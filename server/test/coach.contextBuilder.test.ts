import { describe, expect, it } from 'vitest';
import { buildCoachContext } from '../src/coach/contextBuilder.js';
import type { CoachContextInput } from '../src/coach/types.js';

function makeQuestion(overrides: Partial<CoachContextInput['questions'][number]> = {}) {
  return {
    questionId: 'dsa-b1',
    selectedAnswer: null,
    correctAnswer: 0,
    explanation: 'Canonical explanation.',
    focusArea: 'Focus Area: Binary Search Tree In-Order Traversal',
    topicId: 'dsa-sliding-window',
    category: 'dsa',
    ...overrides,
  };
}

function makeInput(questions: CoachContextInput['questions'], analytics?: CoachContextInput['analytics']) {
  return { userId: 1, attemptId: 'attempt-1', questions, analytics };
}

describe('buildCoachContext', () => {
  it('returns an empty context for an empty attempt', () => {
    const context = buildCoachContext(makeInput([]));

    expect(context.misses).toEqual([]);
    expect(context.skipped).toEqual([]);
    expect(context.weakTopics).toEqual([]);
    expect(context.questions).toEqual([]);
  });

  it('handles an all-correct attempt without producing misses', () => {
    const context = buildCoachContext(
      makeInput([makeQuestion({ selectedAnswer: 0 })]),
    );

    expect(context.misses).toEqual([]);
    expect(context.skipped).toEqual([]);
    expect(context.weakTopics).toEqual([]);
  });

  it('collects every wrong answer when all answers are incorrect', () => {
    const context = buildCoachContext(
      makeInput([
        makeQuestion({ questionId: 'dsa-b1', selectedAnswer: 1, correctAnswer: 0 }),
        makeQuestion({ questionId: 'dsa-b2', selectedAnswer: 2, correctAnswer: 0 }),
        makeQuestion({ questionId: 'dsa-b3', selectedAnswer: 3, correctAnswer: 0 }),
      ]),
    );

    expect(context.misses).toHaveLength(3);
    expect(context.weakTopics).toHaveLength(1);
    expect(context.weakTopics[0]?.misses).toBe(3);
  });

  it('treats an all-skipped attempt as skipped rather than missed', () => {
    const context = buildCoachContext(
      makeInput([
        makeQuestion({ questionId: 'dsa-b1', selectedAnswer: null }),
        makeQuestion({ questionId: 'dsa-b2', selectedAnswer: null }),
      ]),
    );

    expect(context.misses).toEqual([]);
    expect(context.skipped).toHaveLength(2);
    expect(context.weakTopics).toEqual([]);
  });

  it('separates mixed correct, incorrect and skipped answers', () => {
    const context = buildCoachContext(
      makeInput([
        makeQuestion({ questionId: 'dsa-b1', selectedAnswer: 0, correctAnswer: 0 }),
        makeQuestion({ questionId: 'dsa-b2', selectedAnswer: 2, correctAnswer: 0 }),
        makeQuestion({ questionId: 'dsa-b3', selectedAnswer: null }),
        makeQuestion({ questionId: 'dsa-b4', selectedAnswer: 1, correctAnswer: 0 }),
      ]),
    );

    expect(context.misses.map((miss) => miss.questionId)).toEqual(['dsa-b2', 'dsa-b4']);
    expect(context.skipped.map((question) => question.questionId)).toEqual(['dsa-b3']);
  });

  it('uses the trusted explanation from the resolved question', () => {
    const context = buildCoachContext(
      makeInput([makeQuestion({ selectedAnswer: 1, correctAnswer: 0 })]),
    );

    expect(context.misses[0]?.explanation).toBe('Canonical explanation.');
  });

  it('groups weak topics by focus area and ranks by severity', () => {
    const context = buildCoachContext(
      makeInput([
        makeQuestion({
          questionId: 'dsa-b1',
          focusArea: 'Focus Area: Arrays',
          topicId: 'dsa-sliding-window',
          selectedAnswer: 1,
          correctAnswer: 0,
        }),
        makeQuestion({
          questionId: 'dsa-b2',
          focusArea: 'Focus Area: Arrays',
          topicId: 'dsa-sliding-window',
          selectedAnswer: 2,
          correctAnswer: 0,
        }),
        makeQuestion({
          questionId: 'dsa-b3',
          focusArea: 'Focus Area: Trees',
          topicId: 'dsa-reverse-linkedlist',
          selectedAnswer: 1,
          correctAnswer: 0,
        }),
      ]),
    );

    expect(context.weakTopics).toHaveLength(2);
    expect(context.weakTopics[0]?.focusArea).toBe('Focus Area: Arrays');
    expect(context.weakTopics[0]?.misses).toBe(2);
    expect(context.weakTopics[0]?.priority).toBe(1);
    expect(context.weakTopics[1]?.focusArea).toBe('Focus Area: Trees');
    expect(context.weakTopics[1]?.priority).toBe(2);
  });

  it('handles a missing focus area without crashing', () => {
    const context = buildCoachContext(
      makeInput([makeQuestion({ focusArea: null, topicId: null, selectedAnswer: 1, correctAnswer: 0 })]),
    );

    expect(context.weakTopics).toHaveLength(1);
    expect(context.weakTopics[0]?.focusArea).toBeNull();
    expect(context.weakTopics[0]?.topicId).toBeNull();
  });

  it('handles a missing study topic mapping', () => {
    const context = buildCoachContext(
      makeInput([makeQuestion({ topicId: null, selectedAnswer: 1, correctAnswer: 0 })]),
    );

    expect(context.weakTopics[0]?.topicId).toBeNull();
  });

  it('deduplicates repeated question ids deterministically', () => {
    const context = buildCoachContext(
      makeInput([
        makeQuestion({ questionId: 'dsa-b1', selectedAnswer: 1, correctAnswer: 0 }),
        makeQuestion({ questionId: 'dsa-b1', selectedAnswer: 0, correctAnswer: 0 }),
      ]),
    );

    expect(context.questions).toHaveLength(1);
    expect(context.misses).toHaveLength(1);
    expect(context.misses[0]?.questionId).toBe('dsa-b1');
  });

  it('falls back to an empty analytics snapshot when none is supplied', () => {
    const context = buildCoachContext(makeInput([]));

    expect(context.analytics.focusAreas).toEqual([]);
  });
});