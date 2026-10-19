import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
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

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname + location.search}</div>;
}

function renderPage(path = '/practice') {
  render(
    <MemoryRouter initialEntries={[path]}>
      <ToastProvider>
        <PracticePage />
        <LocationProbe />
      </ToastProvider>
    </MemoryRouter>
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

describe('practice autostart', () => {
  it('starts the quiz from query params and strips the autostart flag', () => {
    renderPage('/practice?track=dsa&difficulty=Beginner&count=5&autostart=1');

    expect(screen.getByText(/Question 1 of 5/)).toBeTruthy();
    expect(screen.getByTestId('location').textContent).toBe(
      '/practice?track=dsa&difficulty=Beginner&count=5'
    );
  });

  it('prefills the setup form but does not start over a saved draft', () => {
    seedDraft();
    renderPage('/practice?track=dsa&difficulty=Beginner&count=5&autostart=1');

    expect(screen.getByText(/unfinished quiz/i)).toBeTruthy();
    expect(screen.queryByText(/Question 1 of 5/)).toBeNull();
    expect(screen.getByTestId('location').textContent).toBe(
      '/practice?track=dsa&difficulty=Beginner&count=5'
    );
    const difficulty = screen.getByRole('button', { name: 'Beginner' });
    expect(difficulty.getAttribute('aria-pressed')).toBe('true');
  });

  it('ignores unknown params and stays on the setup screen', () => {
    renderPage('/practice?track=ufology&difficulty=Expert&count=wat&autostart=1');

    expect(screen.getByText('Set up your run.')).toBeTruthy();
    expect(screen.queryByText(/Question 1 of/)).toBeNull();
  });
});
