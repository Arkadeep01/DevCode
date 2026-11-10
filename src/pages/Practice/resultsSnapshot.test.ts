import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { SESSION_KEYS } from '../../utils/storage';
import type { CoachResponse } from '../../services/api';
import {
  clearCoachSnapshot,
  clearResultsSnapshot,
  consumeResultsReturn,
  markResultsReturn,
  readCoachSnapshot,
  readResultsSnapshot,
  writeCoachSnapshot,
  writeResultsSnapshot,
} from './resultsSnapshot';

const RESULT = {
  score: 0,
  total: 2,
  pct: 0,
  timeSec: 90,
  unanswered: 1,
  review: [],
  focusGroups: [],
  categories: [],
};

const RESPONSE: CoachResponse = {
  explanations: [
    {
      questionId: 'dsa-b1',
      whyWrong: 'Wrong.',
      concept: 'Arrays',
      explanation: 'Because.',
    },
  ],
  studyPlan: [{ topicId: 'dsa-sliding-window', reason: 'Missed.', priority: 1 }],
  practiceQuestions: [],
};

beforeEach(() => {
  window.sessionStorage.clear();
});

afterEach(() => {
  window.sessionStorage.clear();
});

describe('results snapshot', () => {
  it('round-trips a finished attempt', () => {
    writeResultsSnapshot({ attemptId: 'attempt-1', result: RESULT, timedOut: true });

    const snapshot = readResultsSnapshot();

    expect(snapshot?.attemptId).toBe('attempt-1');
    expect(snapshot?.timedOut).toBe(true);
    expect(snapshot?.result.total).toBe(2);
  });

  it('returns null when nothing is stored', () => {
    expect(readResultsSnapshot()).toBeNull();
  });

  it('discards a malformed snapshot', () => {
    window.sessionStorage.setItem(
      SESSION_KEYS.practiceResults,
      JSON.stringify({ attemptId: 'attempt-1', result: 'not-a-result' }),
    );

    expect(readResultsSnapshot()).toBeNull();
  });

  it('discards a snapshot without an attempt id', () => {
    window.sessionStorage.setItem(
      SESSION_KEYS.practiceResults,
      JSON.stringify({ result: RESULT, timedOut: false }),
    );

    expect(readResultsSnapshot()).toBeNull();
  });

  it('clears the results, the coaching session and the return marker', () => {
    writeResultsSnapshot({ attemptId: 'attempt-1', result: RESULT, timedOut: false });
    writeCoachSnapshot({
      attemptId: 'attempt-1',
      status: 'ready',
      response: RESPONSE,
      error: null,
      expanded: ['dsa-b1'],
    });
    markResultsReturn('attempt-1');

    clearResultsSnapshot();

    expect(readResultsSnapshot()).toBeNull();
    expect(readCoachSnapshot('attempt-1')).toBeNull();
    expect(consumeResultsReturn('attempt-1')).toBe(false);
  });
});

describe('coach snapshot', () => {
  it('round-trips the coaching session of an attempt', () => {
    writeCoachSnapshot({
      attemptId: 'attempt-1',
      status: 'ready',
      response: RESPONSE,
      error: null,
      expanded: ['dsa-b1'],
    });

    const snapshot = readCoachSnapshot('attempt-1');

    expect(snapshot?.status).toBe('ready');
    expect(snapshot?.response?.explanations).toHaveLength(1);
    expect(snapshot?.expanded).toEqual(['dsa-b1']);
  });

  it('is not restored for a different attempt', () => {
    writeCoachSnapshot({
      attemptId: 'attempt-1',
      status: 'ready',
      response: RESPONSE,
      error: null,
      expanded: [],
    });

    expect(readCoachSnapshot('attempt-2')).toBeNull();
  });

  it('discards a malformed coaching session', () => {
    window.sessionStorage.setItem(
      SESSION_KEYS.practiceCoach,
      JSON.stringify({ attemptId: 'attempt-1', status: 'bogus' }),
    );

    expect(readCoachSnapshot('attempt-1')).toBeNull();
  });

  it('can be cleared on its own', () => {
    writeCoachSnapshot({
      attemptId: 'attempt-1',
      status: 'ready',
      response: RESPONSE,
      error: null,
      expanded: [],
    });

    clearCoachSnapshot();

    expect(readCoachSnapshot('attempt-1')).toBeNull();
  });
});

describe('return marker', () => {
  it('is consumed once for the matching attempt', () => {
    markResultsReturn('attempt-1');

    expect(consumeResultsReturn('attempt-1')).toBe(true);
    expect(consumeResultsReturn('attempt-1')).toBe(false);
  });

  it('is not consumed for a different attempt', () => {
    markResultsReturn('attempt-1');

    expect(consumeResultsReturn('attempt-2')).toBe(false);
    // The marker survives, so the right attempt can still claim it.
    expect(consumeResultsReturn('attempt-1')).toBe(true);
  });

  it('is absent when the user never left the results screen', () => {
    expect(consumeResultsReturn('attempt-1')).toBe(false);
  });
});
