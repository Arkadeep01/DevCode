import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  cleanup,
  configure,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom';
import { QUESTIONS } from '../../../data/questions';
import { App } from '../../../App';

// The whole application tree is rendered here, so the async helpers need more
// room than the default when the whole suite runs in parallel.
configure({ asyncUtilTimeout: 5000 });

const getCoachResponse = vi.fn();
const persistQuizAttempt = vi.fn();

vi.mock('../../../services/api', async () => {
  const actual = await vi.importActual<typeof import('../../../services/api')>(
    '../../../services/api'
  );
  return {
    ...actual,
    getCoachResponse: (...args: unknown[]) => getCoachResponse(...args),
    persistQuizAttempt: (...args: unknown[]) => persistQuizAttempt(...args),
  };
});

const COACH_PAYLOAD = {
  explanations: [
    {
      questionId: 'dsa-b1',
      whyWrong: 'The answer targeted the wrong complexity.',
      concept: 'Big-O Notation',
      explanation: 'The canonical explanation.',
    },
  ],
  studyPlan: [
    { topicId: 'dsa-sliding-window', reason: 'Missed the sliding window.', priority: 1 },
    { topicId: 'must-b-trees-vs-hash', reason: 'Missed hash map lookups.', priority: 2 },
  ],
  practiceQuestions: [
    {
      id: 'coach-q-1',
      category: 'dsa',
      categoryLabel: 'Data Structures & Algorithms',
      difficulty: 'Intermediate',
      question: 'What is the time complexity of the sliding window?',
      codeSnippet: null,
      options: ['O(N)', 'O(N^2)'],
      correctIndex: 0,
      explanation: 'Because.',
      focusArea: 'Focus Area: Sliding Window',
      aiGenerated: true,
    },
  ],
};

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname + location.search}</div>;
}

/** Stands in for the browser back button: a POP navigation on the router. */
function BackProbe() {
  const navigate = useNavigate();
  return (
    <button type="button" onClick={() => navigate(-1)}>
      browser back
    </button>
  );
}

function renderApp(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <LocationProbe />
      <BackProbe />
      <App />
    </MemoryRouter>
  );
}

/** Clicks a deliberately wrong option so the attempt always contains a miss. */
function answerWrongly(): void {
  const questionText = screen.getByRole('heading', { level: 1 }).textContent ?? '';
  const bankQuestion = QUESTIONS.find((question) => question.question === questionText);
  if (!bankQuestion) throw new Error(`Unknown question in the session: ${questionText}`);

  const correctText = bankQuestion.options[bankQuestion.correctIndex] ?? '';
  const optionButtons = screen
    .getAllByRole('button')
    .filter((button) => button.classList.contains('quiz__option'));
  const wrongButton = optionButtons.find(
    (button) => !(button.textContent ?? '').includes(correctText),
  );
  if (!wrongButton) throw new Error('No wrong option found');

  fireEvent.click(wrongButton);
}

async function playQuizAndOpenCoach(): Promise<void> {
  await screen.findByText(/Question 1 of 1/);
  answerWrongly();
  fireEvent.click(screen.getByRole('button', { name: 'Submit quiz' }));

  await screen.findByRole('button', { name: 'Coach me on my misses' });
  fireEvent.click(screen.getByRole('button', { name: 'Coach me on my misses' }));

  await screen.findByText('Why you missed these');
}

beforeEach(() => {
  getCoachResponse.mockReset();
  persistQuizAttempt.mockReset();
  getCoachResponse.mockResolvedValue(COACH_PAYLOAD);
  persistQuizAttempt.mockResolvedValue(undefined);
  window.sessionStorage.clear();
  window.localStorage.clear();
});

afterEach(cleanup);

describe('AI coach → Study hub → back to Results', () => {
  it('opens the recommended topic in the study hub', async () => {
    renderApp('/practice?track=dsa&difficulty=Beginner&count=1&autostart=1');
    await playQuizAndOpenCoach();

    fireEvent.click(screen.getAllByRole('link', { name: 'Open in Study hub' })[0] as HTMLElement);

    await waitFor(() =>
      expect(screen.getByTestId('location').textContent).toContain('/study?topic='),
    );
    expect(screen.getByTestId('location').textContent).toContain('from=results');

    const dialog = await screen.findByRole('dialog');
    expect(dialog.textContent).toContain('Two Pointers & Sliding Window Pattern');
  });

  it('returns to the same Results page with the coaching session intact', async () => {
    renderApp('/practice?track=dsa&difficulty=Beginner&count=1&autostart=1');
    await playQuizAndOpenCoach();

    fireEvent.click(screen.getAllByRole('link', { name: 'Open in Study hub' })[0] as HTMLElement);
    await screen.findByRole('dialog');

    fireEvent.click(screen.getByRole('button', { name: 'Close topic' }));

    await waitFor(() =>
      expect(screen.getByTestId('location').textContent).toBe('/practice'),
    );
    expect(screen.getByText('Why you missed these')).toBeTruthy();
    expect(screen.getByText('The answer targeted the wrong complexity.')).toBeTruthy();
    // The original Results screen is back, not a freshly built one: the same
    // attempt (one question, answered wrong) is shown.
    expect(document.querySelector('.results__sub')?.textContent).toContain(
      'You scored 0 of 1',
    );
  });

  it('keeps every topic recommendation after returning', async () => {
    renderApp('/practice?track=dsa&difficulty=Beginner&count=1&autostart=1');
    await playQuizAndOpenCoach();

    fireEvent.click(screen.getAllByRole('link', { name: 'Open in Study hub' })[0] as HTMLElement);
    await waitFor(() => expect(screen.getByRole('dialog')).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: 'Close topic' }));
    await waitFor(() => expect(screen.getByText('Why you missed these')).toBeTruthy());

    expect(screen.getByText('dsa-sliding-window')).toBeTruthy();
    expect(screen.getByText('must-b-trees-vs-hash')).toBeTruthy();
    expect(screen.getAllByRole('link', { name: 'Open in Study hub' })).toHaveLength(2);
  });

  it('opens a second recommended topic after returning to the results', async () => {
    renderApp('/practice?track=dsa&difficulty=Beginner&count=1&autostart=1');
    await playQuizAndOpenCoach();

    fireEvent.click(screen.getAllByRole('link', { name: 'Open in Study hub' })[0] as HTMLElement);
    await waitFor(() => expect(screen.getByRole('dialog')).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: 'Close topic' }));
    await waitFor(() => expect(screen.getByText('Why you missed these')).toBeTruthy());

    fireEvent.click(screen.getAllByRole('link', { name: 'Open in Study hub' })[1] as HTMLElement);

    await waitFor(() =>
      expect(screen.getByTestId('location').textContent).toContain(
        'topic=must-b-trees-vs-hash',
      ),
    );
    expect(screen.getByRole('dialog').textContent).toContain(
      'Database Indexing: B-Trees vs Hash Indexes',
    );
  });

  it('does not regenerate the coaching answer when returning', async () => {
    renderApp('/practice?track=dsa&difficulty=Beginner&count=1&autostart=1');
    await playQuizAndOpenCoach();
    expect(getCoachResponse).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getAllByRole('link', { name: 'Open in Study hub' })[0] as HTMLElement);
    await waitFor(() => expect(screen.getByRole('dialog')).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: 'Close topic' }));
    await waitFor(() => expect(screen.getByText('Why you missed these')).toBeTruthy());

    expect(getCoachResponse).toHaveBeenCalledTimes(1);
  });

  it('does not submit the attempt twice', async () => {
    renderApp('/practice?track=dsa&difficulty=Beginner&count=1&autostart=1');
    await playQuizAndOpenCoach();
    expect(persistQuizAttempt).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getAllByRole('link', { name: 'Open in Study hub' })[0] as HTMLElement);
    await waitFor(() => expect(screen.getByRole('dialog')).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: 'Close topic' }));
    await waitFor(() => expect(screen.getByText('Why you missed these')).toBeTruthy());

    expect(persistQuizAttempt).toHaveBeenCalledTimes(1);
  });

  it('restores the results through a browser back navigation', async () => {
    renderApp('/practice?track=dsa&difficulty=Beginner&count=1&autostart=1');
    await playQuizAndOpenCoach();

    fireEvent.click(screen.getAllByRole('link', { name: 'Open in Study hub' })[0] as HTMLElement);
    await screen.findByRole('dialog');

    // Browser back returns to the Results history entry.
    fireEvent.click(screen.getByRole('button', { name: 'browser back' }));
    await waitFor(() =>
      expect(screen.getByTestId('location').textContent).toContain('/practice'),
    );

    expect(await screen.findByText('Why you missed these')).toBeTruthy();
    expect(screen.getByText('The answer targeted the wrong complexity.')).toBeTruthy();
    expect(getCoachResponse).toHaveBeenCalledTimes(1);
  });

  it('keeps the expanded coach sections after returning', async () => {
    renderApp('/practice?track=dsa&difficulty=Beginner&count=1&autostart=1');
    await playQuizAndOpenCoach();

    // jsdom does not fire the native toggle event, so the browser sequence
    // is simulated: the element opens and reports its new state.
    const details = screen.getByText('dsa-b1').closest('details') as HTMLDetailsElement;
    details.open = true;
    fireEvent(details, new Event('toggle'));

    await waitFor(() => expect(details.open).toBe(true));

    fireEvent.click(screen.getAllByRole('link', { name: 'Open in Study hub' })[0] as HTMLElement);
    await screen.findByRole('dialog');
    fireEvent.click(screen.getByRole('button', { name: 'Close topic' }));
    await waitFor(() => expect(screen.getByText('Why you missed these')).toBeTruthy());

    const restored = screen.getByText('dsa-b1').closest('details') as HTMLDetailsElement;
    expect(restored.open).toBe(true);
  });

  it('leaves the study hub untouched when it is opened without a results origin', async () => {
    renderApp('/study?topic=dsa-sliding-window');

    await waitFor(() => expect(screen.getByRole('dialog')).toBeTruthy());

    fireEvent.click(screen.getByRole('button', { name: 'Close topic' }));

    await waitFor(() =>
      expect(screen.getByTestId('location').textContent).toBe('/study'),
    );
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByText('Topics that pay off.')).toBeTruthy();
  });
});
