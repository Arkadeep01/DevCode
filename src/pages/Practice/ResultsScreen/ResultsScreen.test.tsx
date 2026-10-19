import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import type { PracticeResult } from '../practiceTypes';
import { ResultsScreen } from './ResultsScreen';

afterEach(cleanup);

function makeResult(overrides: Partial<PracticeResult> = {}): PracticeResult {
  return {
    score: 0,
    total: 2,
    pct: 0,
    timeSec: 95,
    unanswered: 2,
    review: [],
    focusGroups: [],
    categories: [],
    ...overrides,
  };
}

function renderResults(result: PracticeResult, timedOut: boolean) {
  render(
    <ResultsScreen
      result={result}
      timedOut={timedOut}
      onRetakeSame={vi.fn()}
      onNewQuiz={vi.fn()}
      onRetryMissed={vi.fn()}
    />
  );
}

describe('ResultsScreen timeout notice', () => {
  it('explains that unanswered questions were skipped on a timeout', () => {
    renderResults(makeResult(), true);

    expect(screen.getByText(/time ran out/i).textContent).toContain(
      '2 unanswered questions submitted as skipped'
    );
  });

  it('uses singular wording for one unanswered question', () => {
    renderResults(makeResult({ unanswered: 1, total: 1 }), true);

    expect(screen.getByText(/time ran out/i).textContent).toContain(
      '1 unanswered question submitted as skipped'
    );
  });

  it('shows no notice for a manual submit', () => {
    renderResults(makeResult(), false);

    expect(screen.queryByText(/time ran out/i)).toBeNull();
  });

  it('shows a plain timeout notice when nothing was left unanswered', () => {
    renderResults(makeResult({ unanswered: 0, score: 2, pct: 100 }), true);

    expect(screen.getByText(/time ran out/i).textContent).toContain(
      'submitted automatically'
    );
  });
});
