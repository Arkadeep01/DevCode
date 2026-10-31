import { describe, expect, it } from 'vitest';
import { MockCoachProvider } from '../src/coach/mockProvider.js';
import { CoachResponseSchema } from '../src/coach/contracts.js';
import { buildCoachContext } from '../src/coach/contextBuilder.js';
import type { CoachContext } from '../src/coach/types.js';

function contextWithMisses(): CoachContext {
  return buildCoachContext({
    userId: 1,
    attemptId: 'attempt-1',
    questions: [
      {
        questionId: 'dsa-b1',
        selectedAnswer: 1,
        correctAnswer: 0,
        explanation: 'Canonical explanation.',
        focusArea: 'Focus Area: Arrays',
        topicId: 'dsa-sliding-window',
        category: 'dsa',
      },
    ],
  });
}

describe('MockCoachProvider', () => {
  const provider = new MockCoachProvider();

  it('exposes a stable provider name', () => {
    expect(provider.name).toBe('mock');
  });

  it('returns a schema-valid coach response for a context with misses', async () => {
    const response = await provider.generate(contextWithMisses());

    const parsed = CoachResponseSchema.safeParse(response);

    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.explanations).toHaveLength(1);
    expect(parsed.data.explanations[0]?.questionId).toBe('dsa-b1');
  });

  it('returns an empty coaching response for an all-correct context', async () => {
    const context = buildCoachContext({
      userId: 1,
      attemptId: 'attempt-1',
      questions: [
        {
          questionId: 'dsa-b1',
          selectedAnswer: 0,
          correctAnswer: 0,
          explanation: null,
          focusArea: 'Focus Area: Arrays',
          topicId: 'dsa-sliding-window',
          category: 'dsa',
        },
      ],
    });

    const response = await provider.generate(context);

    const parsed = CoachResponseSchema.safeParse(response);

    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.explanations).toEqual([]);
    expect(parsed.data.studyPlan).toEqual([]);
    expect(parsed.data.practiceQuestions).toEqual([]);
  });

  it('returns an empty coaching response for an all-skipped context', async () => {
    const context = buildCoachContext({
      userId: 1,
      attemptId: 'attempt-1',
      questions: [
        {
          questionId: 'dsa-b1',
          selectedAnswer: null,
          correctAnswer: 0,
          explanation: null,
          focusArea: 'Focus Area: Arrays',
          topicId: 'dsa-sliding-window',
          category: 'dsa',
        },
      ],
    });

    const response = await provider.generate(context);

    const parsed = CoachResponseSchema.safeParse(response);

    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.explanations).toEqual([]);
    expect(parsed.data.studyPlan).toEqual([]);
  });

  it('builds study plan entries from the weakest topics', async () => {
    const context = buildCoachContext({
      userId: 1,
      attemptId: 'attempt-1',
      questions: [
        {
          questionId: 'dsa-b1',
          selectedAnswer: 1,
          correctAnswer: 0,
          explanation: 'Canonical explanation.',
          focusArea: 'Focus Area: Arrays',
          topicId: 'dsa-sliding-window',
          category: 'dsa',
        },
        {
          questionId: 'dsa-b2',
          selectedAnswer: 1,
          correctAnswer: 0,
          explanation: 'Canonical explanation.',
          focusArea: 'Focus Area: Arrays',
          topicId: 'dsa-sliding-window',
          category: 'dsa',
        },
      ],
    });

    const response = await provider.generate(context);
    const parsed = CoachResponseSchema.safeParse(response);

    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.studyPlan).toHaveLength(1);
    expect(parsed.data.studyPlan[0]?.topicId).toBe('dsa-sliding-window');
    expect(parsed.data.studyPlan[0]?.priority).toBe(1);
  });
});