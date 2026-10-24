import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { Navbar } from '../../components/Navbar/Navbar';
import { NavigationGuardProvider } from '../../components/NavigationGuard/NavigationGuardProvider';
import { ROUTES } from '../../routes';
import { SESSION_KEYS } from '../../utils/storage';
import { ThemeProvider } from '../../theme/ThemeProvider';
import { PracticePage } from './PracticePage';

const AUTOSTART =
  '/practice?track=dsa&difficulty=Beginner&count=5&autostart=1';

afterEach(cleanup);
beforeEach(() => {
  window.sessionStorage.clear();
});

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname + location.search}</div>;
}

interface HarnessProps {
  initialPath: string;
  showPractice?: boolean;
}

function Harness({ initialPath, showPractice = true }: HarnessProps) {
  return (
    <ThemeProvider>
      <MemoryRouter initialEntries={[initialPath]}>
        <NavigationGuardProvider>
          <Navbar />
          <Routes>
            <Route
              path={ROUTES.practice}
              element={showPractice ? <PracticePage /> : <div>Practice removed</div>}
            />
            <Route path={ROUTES.study} element={<div>Study destination</div>} />
            <Route path={ROUTES.home} element={<div>Home destination</div>} />
          </Routes>
          <LocationProbe />
        </NavigationGuardProvider>
      </MemoryRouter>
    </ThemeProvider>
  );
}

function location() {
  return screen.getByTestId('location').textContent;
}

function timerSeconds(): number {
  const text = screen.getByRole('timer').textContent ?? '';
  const match = text.match(/(\d+):(\d{2})/);
  return match ? Number(match[1]) * 60 + Number(match[2]) : -1;
}

function options() {
  return document.querySelectorAll<HTMLButtonElement>('.quiz__option');
}

describe('practice navigation guard lifecycle', () => {
  it('does not guard navigation from the setup screen', async () => {
    render(<Harness initialPath={ROUTES.practice} />);

    expect(screen.getByText('Set up your run.')).toBeTruthy();
    fireEvent.click(screen.getByRole('link', { name: 'Study' }));

    expect(screen.queryByRole('alertdialog')).toBeNull();
    await waitFor(() => expect(location()).toBe(ROUTES.study));
  });

  it('does not guard navigation from the results screen', async () => {
    render(<Harness initialPath={AUTOSTART} />);

    expect(await screen.findByText(/Question 1 of 5/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Submit quiz' }));
    fireEvent.click(screen.getByRole('button', { name: 'Submit anyway' }));
    expect(await screen.findByText(/You scored/)).toBeTruthy();

    fireEvent.click(screen.getByRole('link', { name: 'Study' }));

    expect(screen.queryByRole('alertdialog')).toBeNull();
    await waitFor(() => expect(location()).toBe(ROUTES.study));
  });

  it('clears the guard when the quiz unmounts', async () => {
    const view = render(<Harness initialPath={AUTOSTART} />);

    expect(await screen.findByText(/Question 1 of 5/)).toBeTruthy();
    fireEvent.click(screen.getByRole('link', { name: 'Study' }));
    expect(screen.getByRole('alertdialog')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Stay' }));
    expect(screen.queryByRole('alertdialog')).toBeNull();

    view.rerender(<Harness initialPath={AUTOSTART} showPractice={false} />);
    expect(await screen.findByText('Practice removed')).toBeTruthy();

    fireEvent.click(screen.getByRole('link', { name: 'Study' }));
    expect(screen.queryByRole('alertdialog')).toBeNull();
    await waitFor(() => expect(location()).toBe(ROUTES.study));
  });

  it('keeps answers, flags and timer on Stay, then leaves on request', async () => {
    render(<Harness initialPath={AUTOSTART} />);

    expect(await screen.findByText(/Question 1 of 5/)).toBeTruthy();
    fireEvent.click(options()[0]!);
    fireEvent.click(screen.getByRole('button', { name: /Next/ }));

    expect(screen.getByText(/Question 2 of 5/)).toBeTruthy();
    fireEvent.click(options()[1]!);
    fireEvent.click(screen.getByRole('button', { name: 'Flag for review' }));

    const before = timerSeconds();
    const studyLink = screen.getByRole('link', { name: 'Study' });
    studyLink.focus();
    fireEvent.click(studyLink);

    expect(screen.getByRole('alertdialog')).toBeTruthy();
    expect(location()?.startsWith(ROUTES.practice)).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: 'Stay' }));

    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(location()?.startsWith(ROUTES.practice)).toBe(true);
    expect(screen.getByText(/Question 2 of 5/)).toBeTruthy();
    expect(options()[1]?.getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('button', { name: 'Flagged' }).getAttribute('aria-pressed')).toBe(
      'true'
    );
    const after = timerSeconds();
    expect(after).toBeGreaterThan(0);
    expect(after).toBeLessThanOrEqual(before);

    fireEvent.click(studyLink);
    fireEvent.click(screen.getByRole('button', { name: 'Leave quiz' }));
    await waitFor(() => expect(location()).toBe(ROUTES.study));

    expect(
      JSON.parse(window.sessionStorage.getItem(SESSION_KEYS.practiceDraft) ?? '{}').answers
    ).toEqual([expect.any(Number), expect.any(Number), null, null, null]);

    fireEvent.click(screen.getByRole('link', { name: 'Practice' }));
    expect(await screen.findByText(/Unfinished quiz found/)).toBeTruthy();
    expect(screen.getByText(/2 answered/)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Resume quiz' }));
    expect(screen.getByText(/Question 2 of 5/)).toBeTruthy();
    expect(options()[1]?.getAttribute('aria-pressed')).toBe('true');
  });
});
