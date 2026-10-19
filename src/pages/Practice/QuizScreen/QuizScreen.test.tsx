import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { SessionQuestion } from '../../../types/question';
import { QuizScreen } from './QuizScreen';

afterEach(cleanup);

const QUESTION: SessionQuestion = {
  id: 'q1',
  category: 'dsa',
  categoryLabel: 'DSA',
  difficulty: 'Beginner',
  question: 'Which structure is FIFO?',
  codeSnippet: null,
  options: ['Stack', 'Queue', 'Heap', 'Tree'],
  correctIndex: 1,
  explanation: 'Queues are FIFO.',
  focusArea: 'Arrays',
};

function renderQuiz(overrides: { answers?: (number | null)[] } = {}) {
  const handlers = {
    onSelect: vi.fn(),
    onToggleFlag: vi.fn(),
    onNavigate: vi.fn(),
    onSubmit: vi.fn(),
  };
  const answers = overrides.answers ?? [null, null];

  render(
    <QuizScreen
      question={QUESTION}
      index={0}
      total={2}
      selected={answers[0]}
      flagged={false}
      answers={answers}
      flags={[false, false]}
      timeLeft={180}
      elapsed={0}
      {...handlers}
    />
  );

  return handlers;
}

describe('QuizScreen submit confirmation', () => {
  it('asks for confirmation when questions are unanswered', () => {
    const handlers = renderQuiz();

    const submit = screen.getByRole('button', { name: 'Submit quiz' });
    fireEvent.click(submit);

    expect(handlers.onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole('alert').textContent).toContain('2 questions still unanswered');

    fireEvent.click(screen.getByRole('button', { name: 'Submit anyway' }));

    expect(handlers.onSubmit).toHaveBeenCalledTimes(1);
  });

  it('disables the top submit button while the confirmation is open', () => {
    renderQuiz();

    fireEvent.click(screen.getByRole('button', { name: 'Submit quiz' }));

    const topSubmit = screen.getByRole('button', { name: 'Submit quiz' }) as HTMLButtonElement;
    expect(topSubmit.disabled).toBe(true);
    expect(screen.getByRole('alert')).toBeTruthy();
  });

  it('lets the user keep answering and restores the button', () => {
    const handlers = renderQuiz();

    fireEvent.click(screen.getByRole('button', { name: 'Submit quiz' }));
    fireEvent.click(screen.getByRole('button', { name: 'Keep answering' }));

    expect(screen.queryByRole('alert')).toBeNull();
    const topSubmit = screen.getByRole('button', { name: 'Submit quiz' }) as HTMLButtonElement;
    expect(topSubmit.disabled).toBe(false);
    expect(handlers.onSubmit).not.toHaveBeenCalled();
  });

  it('submits directly when every question is answered', () => {
    const handlers = renderQuiz({ answers: [1, 2] });

    fireEvent.click(screen.getByRole('button', { name: 'Submit quiz' }));

    expect(screen.queryByRole('alert')).toBeNull();
    expect(handlers.onSubmit).toHaveBeenCalledTimes(1);
  });

  it('ignores keyboard shortcuts while the confirmation is open', () => {
    const handlers = renderQuiz();

    fireEvent.click(screen.getByRole('button', { name: 'Submit quiz' }));
    fireEvent.keyDown(window, { key: '1' });
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    fireEvent.keyDown(window, { key: 'f' });

    expect(handlers.onSelect).not.toHaveBeenCalled();
    expect(handlers.onNavigate).not.toHaveBeenCalled();
    expect(handlers.onToggleFlag).not.toHaveBeenCalled();
  });

  it('keeps shortcuts working while answering normally', () => {
    const handlers = renderQuiz();

    fireEvent.keyDown(window, { key: '2' });

    expect(handlers.onSelect).toHaveBeenCalledWith(1);
  });
});
