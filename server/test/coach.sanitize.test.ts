import { describe, expect, it } from 'vitest';
import { sanitizeCoachResponse } from '../src/coach/sanitize.js';
import type { CoachResponse } from '../src/coach/contracts.js';

function makeResponse(overrides: Partial<CoachResponse> = {}): CoachResponse {
  return {
    explanations: [
      {
        questionId: 'dsa-b1',
        whyWrong: 'Wrong complexity.',
        concept: 'Big-O',
        explanation: 'Canonical.',
      },
    ],
    studyPlan: [{ topicId: 'dsa-sliding-window', reason: 'Missed twice.', priority: 1 }],
    practiceQuestions: [
      {
        id: 'coach-q-1',
        category: 'dsa',
        categoryLabel: 'Data Structures & Algorithms',
        difficulty: 'Intermediate',
        question: 'Generated?',
        codeSnippet: null,
        options: ['A', 'B'],
        correctIndex: 0,
        explanation: 'Because.',
        focusArea: 'Focus Area: Arrays',
        aiGenerated: true,
      },
    ],
    ...overrides,
  };
}

describe('sanitizeCoachResponse', () => {
  it('drops explanations for questions that were not part of the attempt', () => {
    const result = sanitizeCoachResponse(
      makeResponse({
        explanations: [
          {
            questionId: 'dsa-b1',
            whyWrong: 'ok',
            concept: 'ok',
            explanation: 'ok',
          },
          {
            questionId: 'dsa-hallucinated',
            whyWrong: 'invented',
            concept: 'invented',
            explanation: 'invented',
          },
        ],
      }),
      ['dsa-b1'],
    );

    expect(result.explanations.map((item) => item.questionId)).toEqual(['dsa-b1']);
  });

  it('drops study plan entries that point at an unknown topic', () => {
    const result = sanitizeCoachResponse(
      makeResponse({
        studyPlan: [
          { topicId: 'dsa-sliding-window', reason: 'valid', priority: 1 },
          { topicId: 'FAKE_TOPIC_ID', reason: 'invented', priority: 2 },
        ],
      }),
      ['dsa-b1'],
    );

    expect(result.studyPlan.map((item) => item.topicId)).toEqual(['dsa-sliding-window']);
  });

  it('de-duplicates repeated study topics and renumbers the priorities', () => {
    const result = sanitizeCoachResponse(
      makeResponse({
        studyPlan: [
          { topicId: 'dsa-sliding-window', reason: 'first', priority: 3 },
          { topicId: 'must-http-vs-https', reason: 'second', priority: 1 },
          { topicId: 'dsa-sliding-window', reason: 'duplicate', priority: 2 },
        ],
      }),
      ['dsa-b1'],
    );

    expect(result.studyPlan.map((item) => item.topicId)).toEqual([
      'must-http-vs-https',
      'dsa-sliding-window',
    ]);
    expect(result.studyPlan.map((item) => item.priority)).toEqual([1, 2]);
  });

  it('stamps aiGenerated on every practice question', () => {
    const result = sanitizeCoachResponse(
      makeResponse({
        practiceQuestions: [
          {
            id: 'coach-q-1',
            category: 'dsa',
            categoryLabel: 'Data Structures & Algorithms',
            difficulty: 'Intermediate',
            question: 'Generated?',
            codeSnippet: null,
            options: ['A', 'B'],
            correctIndex: 0,
            explanation: 'Because.',
            focusArea: 'Focus Area: Arrays',
            aiGenerated: true,
          },
        ],
      }),
      ['dsa-b1'],
    );

    expect(result.practiceQuestions.every((question) => question.aiGenerated)).toBe(true);
  });

  it('returns an empty response when nothing survives the checks', () => {
    const result = sanitizeCoachResponse(
      makeResponse({
        explanations: [],
        studyPlan: [{ topicId: 'FAKE_TOPIC_ID', reason: 'invented', priority: 1 }],
        practiceQuestions: [],
      }),
      ['dsa-b1'],
    );

    expect(result.studyPlan).toEqual([]);
  });
});
