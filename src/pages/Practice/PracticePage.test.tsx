import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ToastProvider } from '../../components/Toast/ToastProvider';
import { SESSION_KEYS } from '../../utils/storage';
import { PracticePage } from './PracticePage';

afterEach(cleanup);
beforeEach(() => {
  window.sessionStorage.clear();
});

const DRAFT_QUESTION = {
  id: 'draft-q1',
  category: 'dsa',
  categoryLabel: 'DSA',
  difficulty: 'Beginner',
  question: 'Draft: which index is one-based?',
  codeSnippet: null,
  options: ['alpha', 'beta', 'gamma', 'delta'],
  correctIndex: 0,
  explanation: 'Because.',
  focusArea: 'Arrays',
};

function seedDraft() {
  window.sessionStorage.setItem(
    SESSION_KEYS.practiceDraft,
    JSON.stringify({
      config: { tracks: ['dsa'], difficulty: 'Mixed', count: 1, untimed: true },
      questions: [DRAFT_QUESTION],
      answers: [null],
      flags: [false],
      current: 0,
      startedAt: Date.now(),
      deadline: null,
    })
  );
}

function renderPage() {
  render(
    <ToastProvider>
      <PracticePage />
    </ToastProvider>
  );
}

describe('practice session recovery', () => {
  it('offers to resume an unfinished quiz', () => {
    seedDraft();
    renderPage();

    expect(screen.getByText(/unfinished quiz/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Resume quiz' })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Resume quiz' }));

    expect(screen.getByText('Draft: which index is one-based?')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Submit quiz' })).toBeTruthy();
  });

  it('discards the draft and shows the setup screen', () => {
    seedDraft();
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'Discard' }));

    expect(screen.queryByText(/unfinished quiz/i)).toBeNull();
    expect(window.sessionStorage.getItem(SESSION_KEYS.practiceDraft)).toBeNull();
  });

  it('shows no banner when there is no draft', () => {
    renderPage();

    expect(screen.queryByText(/unfinished quiz/i)).toBeNull();
  });
});
