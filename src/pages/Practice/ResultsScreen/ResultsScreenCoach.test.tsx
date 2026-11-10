import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { PracticeResult } from '../practiceTypes';
import { ResultsScreen } from './ResultsScreen';

const getCoachResponse = vi.fn();

vi.mock('../../../services/api', async () => {
  const actual = await vi.importActual<typeof import('../../../services/api')>(
    '../../../services/api'
  );
  return {
    ...actual,
    getCoachResponse: (...args: unknown[]) => getCoachResponse(...args),
  };
});

afterEach(cleanup);

function makeResult(misses = 1): PracticeResult {
  const review = Array.from({ length: misses }, (_, index) => ({
    question: {
      id: `dsa-b${index + 1}`,
      category: 'dsa' as const,
      categoryLabel: 'Data Structures & Algorithms',
      difficulty: 'Intermediate' as const,
      question: `Question ${index + 1}?`,
      codeSnippet: null,
      options: ['A', 'B', 'C', 'D'],
      correctIndex: 0,
      explanation: 'Because.',
      focusArea: 'Focus Area: Arrays',
    },
    selected: 1,
    correct: false,
    flagged: false,
  }));

  return {
    score: 0,
    total: misses,
    pct: 0,
    timeSec: 42,
    unanswered: 0,
    review,
    focusGroups: [],
    categories: [],
  };
}

function renderResults(result: PracticeResult) {
  return render(
    <MemoryRouter>
      <ResultsScreen
        result={result}
        timedOut={false}
        onRetakeSame={vi.fn()}
        onNewQuiz={vi.fn()}
        onRetryMissed={vi.fn()}
      />
    </MemoryRouter>
  );
}

const coachPayload = {
  explanations: [
    {
      questionId: 'dsa-b1',
      whyWrong: 'You picked the wrong complexity.',
      concept: 'Big-O Notation',
      explanation: 'The canonical explanation.',
    },
  ],
  studyPlan: [
    { topicId: 'dsa-sliding-window', reason: 'Two misses.', priority: 1 },
  ],
  practiceQuestions: [
    {
      id: 'coach-q-1',
      category: 'dsa',
      categoryLabel: 'Data Structures & Algorithms',
      difficulty: 'Intermediate',
      question: 'Generated question?',
      codeSnippet: null,
      options: ['A', 'B'],
      correctIndex: 0,
      explanation: 'Because.',
      focusArea: 'Focus Area: Arrays',
      aiGenerated: true,
    },
  ],
};

beforeEach(() => {
  getCoachResponse.mockReset();
});

describe('ResultsScreen AI coach', () => {
  it('does not offer the coach when every answer was correct', () => {
    const result = makeResult(0);
    renderResults(result);

    expect(screen.queryByRole('button', { name: /Coach me on my misses/ })).toBeNull();
  });

  it('requests coaching for the missed questions and renders the result', async () => {
    getCoachResponse.mockResolvedValue(coachPayload);
    renderResults(makeResult(1));

    screen.getByRole('button', { name: 'Coach me on my misses' }).click();

    expect(await screen.findByText('Why you missed these')).toBeTruthy();
    expect(screen.getByText('You picked the wrong complexity.')).toBeTruthy();
    expect(screen.getByText('Your study plan')).toBeTruthy();
    expect(getCoachResponse).toHaveBeenCalledTimes(1);

    const payload = getCoachResponse.mock.calls[0]?.[0] as {
      questions: Array<{ questionId: string; selectedAnswer: number | null }>;
    };
    expect(payload.questions).toEqual([{ questionId: 'dsa-b1', selectedAnswer: 1 }]);
  });

  it('announces the loading state while the coach is working', async () => {
    let resolveRequest: (value: unknown) => void = () => undefined;
    getCoachResponse.mockReturnValue(
      new Promise((resolve) => {
        resolveRequest = resolve;
      })
    );

    renderResults(makeResult(1));
    screen.getByRole('button', { name: 'Coach me on my misses' }).click();

    expect(await screen.findByText('The coach is reviewing your answers…')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Coaching…' })).toBeTruthy();

    resolveRequest(coachPayload);
    await waitFor(() => expect(screen.getByText('Why you missed these')).toBeTruthy());
  });

  it('shows an error message and retries when the coach fails', async () => {
    getCoachResponse
      .mockRejectedValueOnce(new Error('Coach provider unavailable'))
      .mockResolvedValueOnce(coachPayload);

    renderResults(makeResult(1));
    screen.getByRole('button', { name: 'Coach me on my misses' }).click();

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('Coach provider unavailable');

    screen.getByRole('button', { name: 'Try the coach again' }).click();

    expect(await screen.findByText('Why you missed these')).toBeTruthy();
    expect(getCoachResponse).toHaveBeenCalledTimes(2);
  });

  it('dismisses the coach panel on request', async () => {
    getCoachResponse.mockResolvedValue(coachPayload);
    renderResults(makeResult(1));

    screen.getByRole('button', { name: 'Coach me on my misses' }).click();
    expect(await screen.findByText('Why you missed these')).toBeTruthy();

    screen.getByRole('button', { name: 'Dismiss' }).click();

    await waitFor(() => expect(screen.queryByText('Why you missed these')).toBeNull());
  });
});
