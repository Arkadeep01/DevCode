import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { CoachResponse } from '../../../services/api';
import { CoachResponsePanel } from './CoachResponsePanel';

afterEach(cleanup);

function makeResponse(overrides: Partial<CoachResponse> = {}): CoachResponse {
  return {
    explanations: [
      {
        questionId: 'dsa-b1',
        whyWrong: 'The answer confused time complexity with space complexity.',
        concept: 'Big-O Notation',
        explanation: 'Time complexity measures operations, not memory.',
      },
    ],
    studyPlan: [
      {
        topicId: 'dsa-sliding-window',
        reason: 'Repeated misses on the sliding window pattern.',
        priority: 1,
      },
    ],
    practiceQuestions: [
      {
        id: 'coach-q-1',
        category: 'dsa',
        categoryLabel: 'Data Structures & Algorithms',
        difficulty: 'Intermediate',
        question: 'What is the time complexity of the sliding window algorithm?',
        codeSnippet: null,
        options: ['O(N)', 'O(N²)', 'O(log N)', 'O(1)'],
        correctIndex: 0,
        explanation: 'Sliding window visits each element at most twice.',
        focusArea: 'Focus Area: Sliding Window',
        aiGenerated: true,
      },
    ],
    ...overrides,
  };
}

function renderPanel(
  response: CoachResponse,
  handlers: {
    onDismiss?: () => void;
    onPracticeQuestions?: () => void;
  } = {},
) {
  return render(
    <MemoryRouter>
      <CoachResponsePanel
        response={response}
        onDismiss={handlers.onDismiss ?? vi.fn()}
        onPracticeQuestions={handlers.onPracticeQuestions}
      />
    </MemoryRouter>
  );
}

describe('CoachResponsePanel', () => {
  it('renders the panel heading and the explanations', () => {
    renderPanel(makeResponse());

    expect(screen.getByText('AI Coach')).toBeTruthy();
    expect(screen.getByText('Why you missed these')).toBeTruthy();
    expect(screen.getByText('dsa-b1')).toBeTruthy();
    expect(screen.getByText('Big-O Notation')).toBeTruthy();
    expect(
      screen.getByText(/The answer confused time complexity with space complexity\./),
    ).toBeTruthy();
  });

  it('renders the study plan with a link into the study hub', () => {
    renderPanel(makeResponse());

    expect(screen.getByText('Your study plan')).toBeTruthy();
    expect(screen.getByText('Priority 1')).toBeTruthy();
    expect(screen.getByText('dsa-sliding-window')).toBeTruthy();
    expect(screen.getByText(/Repeated misses on the sliding window pattern\./)).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Open in Study hub' })).toBeTruthy();
  });

  it('links the study plan entry into the existing study hub', () => {
    renderPanel(makeResponse());

    const link = screen.getByRole('link', { name: 'Open in Study hub' });
    expect(link.getAttribute('href')).toBe('/study?topic=dsa-sliding-window&from=results');
  });

  it('renders the generated practice questions with an AI badge', () => {
    renderPanel(makeResponse());

    expect(screen.getByText('Practice questions')).toBeTruthy();
    expect(screen.getByText('AI generated')).toBeTruthy();
    expect(screen.getByText('Practice 1')).toBeTruthy();
    expect(screen.getByText('Data Structures & Algorithms')).toBeTruthy();
    expect(screen.getByText('Intermediate')).toBeTruthy();
    expect(
      screen.getByText('What is the time complexity of the sliding window algorithm?'),
    ).toBeTruthy();
  });

  it('offers the generated questions for practice when the parent supports it', () => {
    const onPracticeQuestions = vi.fn();
    renderPanel(makeResponse(), { onPracticeQuestions });

    const button = screen.getByRole('button', { name: /Practice these 1 question/ });
    button.click();

    expect(onPracticeQuestions).toHaveBeenCalledTimes(1);
  });

  it('shows an empty state when there is nothing to report', () => {
    renderPanel(makeResponse({ explanations: [], studyPlan: [], practiceQuestions: [] }));

    expect(screen.getByText(/Clean sweep/)).toBeTruthy();
    expect(screen.queryByText('Why you missed these')).toBeNull();
  });

  it('calls onDismiss when the dismiss button is pressed', () => {
    const onDismiss = vi.fn();
    renderPanel(makeResponse(), { onDismiss });

    screen.getByRole('button', { name: 'Dismiss' }).click();

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('drops generated questions that do not satisfy the question contract', () => {
    renderPanel(
      makeResponse({
        practiceQuestions: [
          {
            id: 'coach-q-invalid',
            category: 'dsa',
            categoryLabel: 'Data Structures & Algorithms',
            difficulty: 'Intermediate',
            question: 'Invalid question',
            codeSnippet: null,
            options: ['Same', 'Same'],
            correctIndex: 0,
            explanation: 'Invalid',
            focusArea: 'Focus Area: Test',
            aiGenerated: true,
          },
        ],
      })
    );

    expect(screen.queryByText('Invalid question')).toBeNull();
    expect(screen.queryByText('Practice questions')).toBeNull();
  });

  it('marks a cached response', () => {
    renderPanel(makeResponse({ cached: true }));

    expect(screen.getByText('cached')).toBeTruthy();
  });
});
