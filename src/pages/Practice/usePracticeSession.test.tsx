import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import type { Question } from '../../types/question';
import { usePracticeSession } from './usePracticeSession';

const persistQuizAttempt = vi.fn();

vi.mock('../../services/api', async () => {
  const actual = await vi.importActual<typeof import('../../services/api')>('../../services/api');
  return {
    ...actual,
    persistQuizAttempt: (...args: unknown[]) => persistQuizAttempt(...args),
  };
});

afterEach(() => {
  cleanup();
  persistQuizAttempt.mockReset();
  persistQuizAttempt.mockResolvedValue(undefined);
});

function makeAiQuestion(overrides: Partial<Question> = {}): Question {
  return {
    id: 'coach-q-1',
    category: 'dsa',
    categoryLabel: 'Data Structures & Algorithms',
    difficulty: 'Intermediate',
    question: 'What is the time complexity of the sliding window?',
    codeSnippet: null,
    options: ['O(N)', 'O(N^2)', 'O(log N)', 'O(1)'],
    correctIndex: 0,
    explanation: 'Because.',
    focusArea: 'Focus Area: Sliding Window',
    aiGenerated: true,
    ...overrides,
  };
}

describe('usePracticeSession — AI generated questions', () => {
  it('runs AI generated questions through the existing quiz engine', () => {
    const { result } = renderHook(() => usePracticeSession());
    const question = makeAiQuestion();

    act(() => {
      result.current.startWithQuestions([question]);
    });

    expect(result.current.phase).toBe('quiz');
    expect(result.current.questions).toHaveLength(1);

    const sessionQuestion = result.current.questions[0];
    expect(sessionQuestion?.id).toBe('coach-q-1');
    expect(sessionQuestion?.aiGenerated).toBe(true);
    // The engine shuffles the options and remaps the correct index.
    expect(sessionQuestion?.options).toHaveLength(4);
    expect(sessionQuestion?.correctIndex).toBeGreaterThanOrEqual(0);
    expect(sessionQuestion?.options[sessionQuestion?.correctIndex ?? -1]).toBe('O(N)');
  });

  it('ignores an empty question list', () => {
    const { result } = renderHook(() => usePracticeSession());

    act(() => {
      result.current.startWithQuestions([]);
    });

    expect(result.current.phase).toBe('setup');
    expect(result.current.questions).toHaveLength(0);
  });

  it('keeps the questions in the order they were supplied', () => {
    const { result } = renderHook(() => usePracticeSession());
    const first = makeAiQuestion({ id: 'coach-q-1' });
    const second = makeAiQuestion({ id: 'coach-q-2' });

    act(() => {
      result.current.startWithQuestions([first, second]);
    });

    expect(result.current.questions.map((question) => question.id)).toEqual([
      'coach-q-1',
      'coach-q-2',
    ]);
  });
});

describe('usePracticeSession — attempt persistence', () => {
  it('persists the finished attempt on the server', async () => {
    const { result } = renderHook(() => usePracticeSession());

    act(() => {
      result.current.startWithQuestions([makeAiQuestion({ id: 'coach-q-1' })]);
    });

    act(() => {
      result.current.answer(1);
    });

    act(() => {
      result.current.submitNow();
    });

    await waitFor(() => expect(persistQuizAttempt).toHaveBeenCalledTimes(1));

    const payload = persistQuizAttempt.mock.calls[0]?.[0] as {
      attemptId: string;
      questions: Array<{ questionId: string; selectedIndex: number | null }>;
    };
    expect(payload.attemptId).toContain('attempt-');
    expect(payload.questions).toEqual([{ questionId: 'coach-q-1', selectedIndex: 1 }]);
  });

  it('still shows the results when the server call fails', async () => {
    persistQuizAttempt.mockRejectedValue(new Error('offline'));

    const { result } = renderHook(() => usePracticeSession());

    act(() => {
      result.current.startWithQuestions([makeAiQuestion({ id: 'coach-q-1' })]);
    });

    act(() => {
      result.current.submitNow();
    });

    await waitFor(() => expect(result.current.phase).toBe('results'));
    expect(result.current.result).not.toBeNull();
  });
});
