import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import { QUESTIONS } from '../../data/questions';
import { SESSION_KEYS } from '../../utils/storage';
import type { Question } from '../../types/question';
import type { PracticeConfig } from './practiceTypes';
import { buildSession, toSessionQuestion, usePracticeSession } from './usePracticeSession';

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

describe('countdown timer', () => {
  const config: PracticeConfig = {
    tracks: ['dsa'],
    difficulty: 'Mixed',
    count: 2,
    untimed: false,
  };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000_000);
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('derives time left from the wall clock instead of counting ticks', () => {
    const { result } = renderHook(() => usePracticeSession());

    act(() => {
      result.current.start(config);
    });
    expect(result.current.timeLeft).toBe(180);

    // 30 seconds of real time pass while the tab is throttled: one tick fires.
    vi.setSystemTime(1_030_000);
    act(() => {
      vi.advanceTimersByTime(1_000);
    });

    expect(result.current.timeLeft).toBe(149);
  });

  it('auto-submits once the wall-clock deadline passes', () => {
    const { result } = renderHook(() => usePracticeSession());

    act(() => {
      result.current.start(config);
    });
    vi.setSystemTime(1_180_001);
    act(() => {
      vi.advanceTimersByTime(1_000);
    });

    expect(result.current.phase).toBe('results');
    expect(result.current.timedOut).toBe(true);
  });

  it('does not flag a manual submit as timed out', () => {
    const { result } = renderHook(() => usePracticeSession());

    act(() => {
      result.current.start(config);
    });
    act(() => {
      result.current.submitNow();
    });

    expect(result.current.phase).toBe('results');
    expect(result.current.timedOut).toBe(false);
  });

  it('keeps untimed sessions free of a countdown', () => {
    const { result } = renderHook(() => usePracticeSession());

    act(() => {
      result.current.start({ ...config, untimed: true });
    });
    vi.setSystemTime(1_060_000);
    act(() => {
      vi.advanceTimersByTime(1_000);
    });

    expect(result.current.timeLeft).toBeNull();
    expect(result.current.phase).toBe('quiz');
  });
});

describe('session recovery', () => {
  const config: PracticeConfig = {
    tracks: ['dsa'],
    difficulty: 'Mixed',
    count: 2,
    untimed: false,
  };

  beforeEach(() => {
    window.sessionStorage.clear();
  });

  afterEach(cleanup);

  it('persists the in-progress quiz to sessionStorage', () => {
    const { result } = renderHook(() => usePracticeSession());

    act(() => {
      result.current.start(config);
    });

    const draft = JSON.parse(
      window.sessionStorage.getItem(SESSION_KEYS.practiceDraft) ?? 'null'
    );
    expect(draft.questions).toHaveLength(2);
    expect(draft.answers).toEqual([null, null]);

    act(() => {
      result.current.answer(1);
    });

    const updated = JSON.parse(
      window.sessionStorage.getItem(SESSION_KEYS.practiceDraft) ?? 'null'
    );
    expect(updated.answers).toEqual([1, null]);
  });

  it('exposes an interrupted quiz as recoverable and resumes it', () => {
    const first = renderHook(() => usePracticeSession());
    act(() => {
      first.result.current.start(config);
    });
    act(() => {
      first.result.current.answer(0);
    });
    first.unmount();

    const second = renderHook(() => usePracticeSession());
    expect(second.result.current.phase).toBe('setup');
    expect(second.result.current.recoverable?.answers).toEqual([0, null]);

    act(() => {
      second.result.current.resume();
    });

    expect(second.result.current.phase).toBe('quiz');
    expect(second.result.current.answers).toEqual([0, null]);
    expect(second.result.current.questions).toHaveLength(2);
    expect(second.result.current.timeLeft).not.toBeNull();
    expect(second.result.current.timeLeft ?? 0).toBeLessThanOrEqual(180);
  });

  it('discards drafts that fail validation', () => {
    window.sessionStorage.setItem(SESSION_KEYS.practiceDraft, '{broken');
    const broken = renderHook(() => usePracticeSession());
    expect(broken.result.current.recoverable).toBeNull();
    broken.unmount();

    window.sessionStorage.setItem(
      SESSION_KEYS.practiceDraft,
      JSON.stringify({
        config,
        questions: [{}],
        answers: [],
        flags: [],
        current: 0,
        startedAt: 1,
        deadline: null,
      })
    );
    const mismatched = renderHook(() => usePracticeSession());
    expect(mismatched.result.current.recoverable).toBeNull();
  });

  it('clears the draft when the quiz is submitted or discarded', () => {
    const first = renderHook(() => usePracticeSession());
    act(() => {
      first.result.current.start(config);
    });
    first.unmount();

    const second = renderHook(() => usePracticeSession());
    act(() => {
      second.result.current.discardRecovery();
    });
    expect(second.result.current.recoverable).toBeNull();
    expect(window.sessionStorage.getItem(SESSION_KEYS.practiceDraft)).toBeNull();

    const third = renderHook(() => usePracticeSession());
    act(() => {
      third.result.current.start(config);
    });
    act(() => {
      third.result.current.submitNow();
    });
    expect(third.result.current.phase).toBe('results');
    expect(window.sessionStorage.getItem(SESSION_KEYS.practiceDraft)).toBeNull();
  });

  it('guards against reload while a quiz is in progress', () => {
    const { result } = renderHook(() => usePracticeSession());

    const idle = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(idle);
    expect(idle.defaultPrevented).toBe(false);

    act(() => {
      result.current.start(config);
    });
    const leaving = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(leaving);
    expect(leaving.defaultPrevented).toBe(true);

    act(() => {
      result.current.submitNow();
    });
    const finished = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(finished);
    expect(finished.defaultPrevented).toBe(false);
  });
});
