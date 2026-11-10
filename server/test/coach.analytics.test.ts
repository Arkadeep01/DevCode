import { describe, expect, it } from 'vitest';
import { calculateCoachAnalytics } from '../src/coach/analytics.js';
import type { Attempt, Question } from '../src/db/schema.js';

describe('calculateCoachAnalytics', () => {
  it('returns empty analytics for empty attempts and questions', () => {
    const attempts: Attempt[] = [];
    const questions: Question[] = [];
    const analytics = calculateCoachAnalytics(attempts, questions);

    expect(analytics.topicPerformance).toEqual({});
    expect(analytics.weeklyTrend).toEqual([]);
    expect(analytics.weakestTopics).toEqual([]);
    expect(analytics.repeatedMistakes).toEqual([]);
    expect(analytics.topicsRequiringRevision).toEqual([]);
  });

  it('calculates topic performance correctly', () => {
    const attempts = [
      { id: 1, questionId: 1, isCorrect: true, isSkipped: false, focusArea: 'dsa', createdAt: 1609459200 } as any,
      { id: 2, questionId: 1, isCorrect: false, isSkipped: false, focusArea: 'dsa', createdAt: 1609545600 } as any,
      { id: 3, questionId: 2, isCorrect: true, isSkipped: false, focusArea: 'dsa', createdAt: 1609459200 } as any,
      { id: 4, questionId: 2, isCorrect: true, isSkipped: false, focusArea: 'dsa', createdAt: 1609459200 } as any,
    ];
    const questions = [
      { id: 1, slug: 'dsa-b1', category: 'dsa' } as any,
      { id: 2, slug: 'dsa-b2', category: 'dsa' } as any,
    ];

    const analytics = calculateCoachAnalytics(attempts, questions);

    expect(analytics.topicPerformance.dsa).toEqual({
      correct: 3,
      total: 4,
      accuracy: 75,
    });
  });

  it('identifies correct weak topics', () => {
    const attempts = [
      { id: 1, questionId: 1, isCorrect: false, isSkipped: false, focusArea: 'dsa', createdAt: 1609459200 } as any,
      { id: 2, questionId: 1, isCorrect: false, isSkipped: false, focusArea: 'dsa', createdAt: 1609545600 } as any,
      { id: 3, questionId: 2, isCorrect: false, isSkipped: false, focusArea: 'sql', createdAt: 1609459200 } as any,
      { id: 4, questionId: 3, isCorrect: true, isSkipped: false, focusArea: 'dsa', createdAt: 1609459200 } as any,
    ];
    const questions = [
      { id: 1, slug: 'dsa-b1', category: 'dsa' } as any,
      { id: 2, slug: 'sql-b2', category: 'sql' } as any,
      { id: 3, slug: 'dsa-b3', category: 'dsa' } as any,
    ];

    const analytics = calculateCoachAnalytics(attempts, questions);

    expect(analytics.weakestTopics.length).toBe(2);
    expect(analytics.weakestTopics[0].missCount).toBe(2);
    expect(analytics.weakestTopics[1].missCount).toBe(1);
    expect(analytics.weakestTopics[0].topicId).toBe('dsa');
  });

  it('collects repeated mistakes with wrong answers', () => {
    const attempts = [
      { id: 1, questionId: 1, isCorrect: false, isSkipped: false, focusArea: 'dsa', createdAt: 1609459200, chosenAnswer: 1 } as any,
      { id: 2, questionId: 1, isCorrect: false, isSkipped: false, focusArea: 'dsa', createdAt: 1609545600, chosenAnswer: 1 } as any,
      { id: 3, questionId: 1, isCorrect: false, isSkipped: false, focusArea: 'dsa', createdAt: 1609630800, chosenAnswer: 2 } as any,
    ];
    const questions = [
      { id: 1, slug: 'dsa-b1', category: 'dsa', prompt: 'What is question 1?' } as any,
    ];

    const analytics = calculateCoachAnalytics(attempts, questions);

    expect(analytics.repeatedMistakes.length).toBe(1);
    expect(analytics.repeatedMistakes[0].timesWrong).toBe(3);
    expect(analytics.repeatedMistakes[0].questionId).toBe('dsa-b1');
    expect(analytics.repeatedMistakes[0].commonWrongAnswer).toBe(1);
  });

  it('identifies topics requiring revision based on accuracy threshold', () => {
    const attempts = [
      { id: 1, questionId: 1, isCorrect: true, isSkipped: false, focusArea: 'dsa', createdAt: 1609459200 } as any,
      { id: 2, questionId: 1, isCorrect: false, isSkipped: false, focusArea: 'dsa', createdAt: 1609545600 } as any,
      { id: 3, questionId: 2, isCorrect: false, isSkipped: false, focusArea: 'dsa', createdAt: 1609459200 } as any,
    ];
    const questions = [
      { id: 1, slug: 'dsa-b1', category: 'dsa' } as any,
      { id: 2, slug: 'dsa-b2', category: 'dsa' } as any,
    ];

    const analytics = calculateCoachAnalytics(attempts, questions);

    expect(analytics.topicsRequiringRevision.length).toBe(1);
    expect(analytics.topicsRequiringRevision[0].topicId).toBe('dsa');
    expect(analytics.topicsRequiringRevision[0].mastery).toBeCloseTo(33.33, 2);
    expect(analytics.topicsRequiringRevision[0].needsRevision).toBe(true);
  });

  it('correctly handles skipped questions in analytics', () => {
    const attempts = [
      { id: 1, questionId: 1, isCorrect: false, isSkipped: true, focusArea: 'dsa', createdAt: 1609459200 } as any,
      { id: 2, questionId: 1, isCorrect: false, isSkipped: false, focusArea: 'dsa', createdAt: 1609459200 } as any,
      { id: 3, questionId: 1, isCorrect: false, isSkipped: false, focusArea: 'dsa', createdAt: 1609459200 } as any,
    ];
    const questions = [
      { id: 1, slug: 'dsa-b1', category: 'dsa' } as any,
    ];

    const analytics = calculateCoachAnalytics(attempts, questions);

    expect(analytics.weakestTopics.length).toBe(1);
    expect(analytics.weakestTopics[0].missCount).toBe(2);
  });
});
