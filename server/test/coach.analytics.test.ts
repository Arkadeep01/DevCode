import { describe, expect, it } from 'vitest';
import { calculateCoachAnalytics, toContextCoachAnalytics } from '../src/coach/analytics.js';
import type { Attempt, Question } from '../src/db/schema.js';

function makeAttempt(overrides: Partial<Attempt> = {}): Attempt {
  return {
    id: 1,
    userId: 1,
    quizId: 'attempt-1',
    questionId: 1,
    chosenAnswer: null,
    correctAnswer: 0,
    isCorrect: false,
    isSkipped: false,
    track: 'dsa',
    difficulty: 'Intermediate',
    focusArea: 'dsa',
    createdAt: new Date(1609459200 * 1000),
    ...overrides,
  } as Attempt;
}

function makeQuestion(overrides: Partial<Question> = {}): Question {
  return {
    id: 1,
    slug: 'dsa-b1',
    category: 'dsa',
    difficulty: 'Intermediate',
    prompt: 'What is question 1?',
    options: ['A', 'B'],
    correctIndex: 0,
    explanation: 'Because.',
    focusArea: 'Focus Area: Arrays',
    createdAt: new Date(1609459200 * 1000),
    ...overrides,
  } as Question;
}

describe('calculateCoachAnalytics', () => {
  it('returns empty analytics for empty attempts and questions', () => {
    const analytics = calculateCoachAnalytics([], []);

    expect(analytics.topicPerformance).toEqual({});
    expect(analytics.weeklyTrend).toEqual([]);
    expect(analytics.weakestTopics).toEqual([]);
    expect(analytics.repeatedMistakes).toEqual([]);
    expect(analytics.topicsRequiringRevision).toEqual([]);
  });

  it('calculates topic performance correctly', () => {
    const attempts = [
      makeAttempt({ id: 1, questionId: 1, isCorrect: true }),
      makeAttempt({ id: 2, questionId: 1, isCorrect: false, createdAt: new Date(1609545600 * 1000) }),
      makeAttempt({ id: 3, questionId: 2, isCorrect: true }),
      makeAttempt({ id: 4, questionId: 2, isCorrect: true }),
    ];
    const questions = [
      makeQuestion({ id: 1, slug: 'dsa-b1' }),
      makeQuestion({ id: 2, slug: 'dsa-b2' }),
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
      makeAttempt({ id: 1, questionId: 1, isCorrect: false }),
      makeAttempt({ id: 2, questionId: 1, isCorrect: false, createdAt: new Date(1609545600 * 1000) }),
      makeAttempt({ id: 3, questionId: 2, isCorrect: false, focusArea: 'sql' }),
      makeAttempt({ id: 4, questionId: 3, isCorrect: true }),
    ];
    const questions = [
      makeQuestion({ id: 1, slug: 'dsa-b1' }),
      makeQuestion({ id: 2, slug: 'sql-b2', category: 'sql' }),
      makeQuestion({ id: 3, slug: 'dsa-b3' }),
    ];

    const analytics = calculateCoachAnalytics(attempts, questions);

    expect(analytics.weakestTopics.length).toBe(2);
    expect(analytics.weakestTopics[0]?.missCount).toBe(2);
    expect(analytics.weakestTopics[1]?.missCount).toBe(1);
    expect(analytics.weakestTopics[0]?.topicId).toBe('dsa');
  });

  it('collects repeated mistakes with wrong answers', () => {
    const attempts = [
      makeAttempt({ id: 1, questionId: 1, chosenAnswer: 1 }),
      makeAttempt({ id: 2, questionId: 1, chosenAnswer: 1, createdAt: new Date(1609545600 * 1000) }),
      makeAttempt({ id: 3, questionId: 1, chosenAnswer: 2, createdAt: new Date(1609630800 * 1000) }),
    ];
    const questions = [makeQuestion({ id: 1, slug: 'dsa-b1' })];

    const analytics = calculateCoachAnalytics(attempts, questions);

    expect(analytics.repeatedMistakes.length).toBe(1);
    expect(analytics.repeatedMistakes[0]?.timesWrong).toBe(3);
    expect(analytics.repeatedMistakes[0]?.questionId).toBe('dsa-b1');
    expect(analytics.repeatedMistakes[0]?.commonWrongAnswer).toBe(1);
  });

  it('identifies topics requiring revision based on accuracy threshold', () => {
    const attempts = [
      makeAttempt({ id: 1, questionId: 1, isCorrect: true }),
      makeAttempt({ id: 2, questionId: 1, isCorrect: false, createdAt: new Date(1609545600 * 1000) }),
      makeAttempt({ id: 3, questionId: 2, isCorrect: false }),
    ];
    const questions = [
      makeQuestion({ id: 1, slug: 'dsa-b1' }),
      makeQuestion({ id: 2, slug: 'dsa-b2' }),
    ];

    const analytics = calculateCoachAnalytics(attempts, questions);

    expect(analytics.topicsRequiringRevision.length).toBe(1);
    expect(analytics.topicsRequiringRevision[0]?.topicId).toBe('dsa');
    expect(analytics.topicsRequiringRevision[0]?.mastery).toBeCloseTo(33.33, 2);
    expect(analytics.topicsRequiringRevision[0]?.needsRevision).toBe(true);
  });

  it('correctly handles skipped questions in analytics', () => {
    const attempts = [
      makeAttempt({ id: 1, questionId: 1, isSkipped: true }),
      makeAttempt({ id: 2, questionId: 1 }),
      makeAttempt({ id: 3, questionId: 1 }),
    ];
    const questions = [makeQuestion({ id: 1, slug: 'dsa-b1' })];

    const analytics = calculateCoachAnalytics(attempts, questions);

    expect(analytics.weakestTopics.length).toBe(1);
    expect(analytics.weakestTopics[0]?.missCount).toBe(2);
  });
});

describe('calculateCoachAnalytics — edge cases', () => {
  const questions = [
    makeQuestion({ id: 1, slug: 'dsa-b1' }),
    makeQuestion({ id: 2, slug: 'sql-b2', category: 'sql' }),
  ];

  it('handles a single attempt', () => {
    const attempts = [makeAttempt({ id: 1, questionId: 1, isCorrect: true })];

    const analytics = calculateCoachAnalytics(attempts, questions);

    expect(analytics.topicPerformance['dsa']).toEqual({ correct: 1, total: 1, accuracy: 100 });
    expect(analytics.weakestTopics).toEqual([]);
    expect(analytics.weeklyTrend).toHaveLength(1);
  });

  it('ignores attempts whose question no longer exists', () => {
    const attempts = [makeAttempt({ id: 1, questionId: 999 })];

    const analytics = calculateCoachAnalytics(attempts, questions);

    expect(analytics.topicPerformance).toEqual({});
    expect(analytics.weeklyTrend).toEqual([]);
  });

  it('ignores attempts without a question reference', () => {
    const attempts = [makeAttempt({ id: 1, questionId: null })];

    const analytics = calculateCoachAnalytics(attempts, questions);

    expect(analytics.topicPerformance).toEqual({});
  });

  it('never divides by zero when there is no data', () => {
    const analytics = calculateCoachAnalytics([], questions);

    expect(analytics.topicPerformance).toEqual({});
    expect(analytics.weakestTopics).toEqual([]);
    expect(analytics.topicsRequiringRevision).toEqual([]);
    expect(analytics.weeklyTrend).toEqual([]);
  });

  it('buckets attempts into UTC weeks that start on Monday', () => {
    // 2021-01-01 is a Friday -> the week starting Monday 2020-12-28.
    const attempts = [
      makeAttempt({ id: 1, questionId: 1, isCorrect: true, createdAt: new Date(1609459200 * 1000) }),
      // 2021-01-11 is a Monday -> the following week.
      makeAttempt({
        id: 2,
        questionId: 1,
        isCorrect: false,
        createdAt: new Date(1610323200 * 1000),
      }),
    ];

    const analytics = calculateCoachAnalytics(attempts, questions);

    expect(analytics.weeklyTrend).toHaveLength(2);
    expect(analytics.weeklyTrend[0]?.week).toBe('2020-W53');
    expect(analytics.weeklyTrend[1]?.week).toBe('2021-W02');
    expect(analytics.weeklyTrend[0]?.accuracy).toBe(100);
    expect(analytics.weeklyTrend[1]?.accuracy).toBe(0);
  });

  it('resolves the study topic for every weak topic', () => {
    const attempts = [
      makeAttempt({
        id: 1,
        questionId: 1,
        focusArea: 'Focus Area: Two Sum Hash Map Linear Scan',
      }),
    ];

    const analytics = calculateCoachAnalytics(attempts, questions);

    expect(analytics.weakestTopics[0]?.studyTopicId).toBe('must-b-trees-vs-hash');
  });

  it('records the last attempt timestamp for topics needing revision', () => {
    const attempts = [makeAttempt({ id: 1, questionId: 1, createdAt: new Date(1609459200 * 1000) })];

    const analytics = calculateCoachAnalytics(attempts, questions);

    expect(analytics.topicsRequiringRevision[0]?.lastAttempt).toBe(
      new Date(1609459200 * 1000).toISOString(),
    );
    expect(analytics.topicsRequiringRevision[0]?.needsRevision).toBe(true);
  });
});

describe('toContextCoachAnalytics — trends', () => {
  const questions = [makeQuestion({ id: 1, slug: 'dsa-b1' })];

  it('reports no trend when there is no history', () => {
    const context = toContextCoachAnalytics(calculateCoachAnalytics([], questions));

    expect(context.trend.currentAccuracy).toBeNull();
    expect(context.trend.previousAccuracy).toBeNull();
    expect(context.trend.improvement).toBeNull();
    expect(context.trend.declined).toBe(false);
    expect(context.weekly.accuracy).toBeNull();
  });

  it('reports no improvement when there is only one week of data', () => {
    const context = toContextCoachAnalytics(
      calculateCoachAnalytics([makeAttempt({ id: 1, isCorrect: true })], questions),
    );

    expect(context.trend.currentAccuracy).toBe(100);
    expect(context.trend.previousAccuracy).toBeNull();
    expect(context.trend.improvement).toBeNull();
    expect(context.trend.declined).toBe(false);
  });

  it('detects an improvement between two weeks', () => {
    const context = toContextCoachAnalytics(
      calculateCoachAnalytics(
        [
          makeAttempt({ id: 1, isCorrect: false, createdAt: new Date(1609459200 * 1000) }),
          makeAttempt({
            id: 2,
            isCorrect: true,
            createdAt: new Date(1610323200 * 1000),
          }),
        ],
        questions,
      ),
    );

    expect(context.trend.previousAccuracy).toBe(0);
    expect(context.trend.currentAccuracy).toBe(100);
    expect(context.trend.improvement).toBe(100);
    expect(context.trend.declined).toBe(false);
  });

  it('detects a decline between two weeks', () => {
    const context = toContextCoachAnalytics(
      calculateCoachAnalytics(
        [
          makeAttempt({ id: 1, isCorrect: true, createdAt: new Date(1609459200 * 1000) }),
          makeAttempt({
            id: 2,
            isCorrect: false,
            createdAt: new Date(1610323200 * 1000),
          }),
        ],
        questions,
      ),
    );

    expect(context.trend.previousAccuracy).toBe(100);
    expect(context.trend.currentAccuracy).toBe(0);
    expect(context.trend.improvement).toBe(-100);
    expect(context.trend.declined).toBe(true);
  });

  it('reports the accuracy per focus area', () => {
    const context = toContextCoachAnalytics(
      calculateCoachAnalytics(
        [
          makeAttempt({ id: 1, isCorrect: true }),
          makeAttempt({ id: 2, isCorrect: false }),
        ],
        questions,
      ),
    );

    expect(context.focusAreas).toHaveLength(1);
    expect(context.focusAreas[0]?.focusArea).toBe('dsa');
    expect(context.focusAreas[0]?.attempts).toBe(2);
    expect(context.focusAreas[0]?.misses).toBe(1);
    expect(context.focusAreas[0]?.accuracy).toBe(50);
  });

  it('ranks the weak topics and carries their study topic ids', () => {
    const context = toContextCoachAnalytics(
      calculateCoachAnalytics(
        [
          makeAttempt({
            id: 1,
            questionId: 1,
            focusArea: 'Focus Area: Two Sum Hash Map Linear Scan',
          }),
        ],
        questions,
      ),
    );

    expect(context.weakestTopics).toHaveLength(1);
    expect(context.weakestTopics[0]?.topicId).toBe('must-b-trees-vs-hash');
    expect(context.weakestTopics[0]?.misses).toBe(1);
    expect(context.weakestTopics[0]?.severity).toBe(1);
    expect(context.weakestTopics[0]?.priority).toBe(1);
  });
});
