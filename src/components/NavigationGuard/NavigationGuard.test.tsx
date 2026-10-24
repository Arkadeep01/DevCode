import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { useEffect } from 'react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { ThemeProvider } from '../../theme/ThemeProvider';
import { Navbar } from '../Navbar/Navbar';
import { NavigationGuardProvider } from './NavigationGuardProvider';
import { useNavigationGuard } from './NavigationGuardContext';

afterEach(cleanup);

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname + location.search}</div>;
}

function GuardActive({ active }: { active: boolean }) {
  const { setGuard } = useNavigationGuard();

  useEffect(() => {
    setGuard(active);
    return () => setGuard(false);
  }, [active, setGuard]);

  return null;
}

function renderGuarded(path = '/practice', active = true) {
  render(
    <ThemeProvider>
      <MemoryRouter initialEntries={[path]}>
        <NavigationGuardProvider>
          <GuardActive active={active} />
          <Navbar />
          <Routes>
            <Route path="*" element={<div>Destination</div>} />
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

function openDialogFromLink(name: string) {
  const link = screen.getByRole('link', { name });
  link.focus();
  fireEvent.click(link);
  return { link, dialog: screen.getByRole('alertdialog') };
}

describe('navigation guard', () => {
  it.each(['Home', 'Study', 'Practice'])(
    'shows the dialog for the %s navbar link and stays on the quiz',
    (name) => {
      renderGuarded();

      const { link, dialog } = openDialogFromLink(name);

      expect(dialog.getAttribute('aria-modal')).toBe('true');
      expect(dialog.getAttribute('aria-labelledby')).toBeTruthy();
      expect(dialog.getAttribute('aria-describedby')).toBeTruthy();
      expect(within(dialog).getByText('Leave this quiz?')).toBeTruthy();
      expect(
        within(dialog).getByText(
          'Your progress is saved and you can resume it later from Practice.'
        )
      ).toBeTruthy();
      expect(location()).toBe('/practice');

      fireEvent.click(within(dialog).getByRole('button', { name: 'Stay' }));

      expect(screen.queryByRole('alertdialog')).toBeNull();
      expect(location()).toBe('/practice');
      expect(document.activeElement).toBe(link);
    }
  );

  it.each([
    ['Home', '/'],
    ['Study', '/study'],
  ])('navigates to %s when Leave quiz is clicked', async (name, target) => {
    renderGuarded();

    const { dialog } = openDialogFromLink(name);
    fireEvent.click(within(dialog).getByRole('button', { name: 'Leave quiz' }));

    expect(screen.queryByRole('alertdialog')).toBeNull();
    await waitFor(() => expect(location()).toBe(target));
  });

  it('keeps the guard active after Stay', () => {
    renderGuarded();

    fireEvent.click(screen.getByRole('link', { name: 'Study' }));
    fireEvent.click(screen.getByRole('button', { name: 'Stay' }));
    fireEvent.click(screen.getByRole('link', { name: 'Study' }));

    expect(screen.getByRole('alertdialog')).toBeTruthy();
    expect(location()).toBe('/practice');
  });

  it('navigates immediately when the guard is inactive', async () => {
    renderGuarded('/practice', false);

    fireEvent.click(screen.getByRole('link', { name: 'Study' }));

    expect(screen.queryByRole('alertdialog')).toBeNull();
    await waitFor(() => expect(location()).toBe('/study'));
  });

  it('guards the logo link', () => {
    renderGuarded();

    const { link, dialog } = openDialogFromLink('DevCode home');

    expect(dialog).toBeTruthy();
    expect(location()).toBe('/practice');

    fireEvent.click(within(dialog).getByRole('button', { name: 'Stay' }));
    expect(document.activeElement).toBe(link);
  });

  it('guards mobile menu links and keeps focus on Stay', async () => {
    renderGuarded();

    fireEvent.click(screen.getByRole('button', { name: 'Open menu' }));
    const panel = document.getElementById('navbar-nav');
    expect(panel?.className).toContain('navbar__links--open');

    const link = screen.getByRole('link', { name: 'Study' });
    link.focus();
    fireEvent.click(link);

    const dialog = screen.getByRole('alertdialog');
    expect(location()).toBe('/practice');
    expect(panel?.className).toContain('navbar__links--open');

    fireEvent.click(within(dialog).getByRole('button', { name: 'Stay' }));
    expect(document.activeElement).toBe(link);
    expect(panel?.className).toContain('navbar__links--open');

    fireEvent.click(link);
    fireEvent.click(screen.getByRole('button', { name: 'Leave quiz' }));
    await waitFor(() => expect(location()).toBe('/study'));
    expect(panel?.className).not.toContain('navbar__links--open');
  });

  it('focuses Stay, traps Tab, treats Escape as Stay, and ignores backdrop clicks', () => {
    renderGuarded();

    const { link, dialog } = openDialogFromLink('Study');
    const stay = within(dialog).getByRole('button', { name: 'Stay' });
    const leave = within(dialog).getByRole('button', { name: 'Leave quiz' });

    expect(document.activeElement).toBe(stay);

    leave.focus();
    fireEvent.keyDown(leave, { key: 'Tab' });
    expect(document.activeElement).toBe(stay);

    stay.focus();
    fireEvent.keyDown(stay, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(leave);

    fireEvent.click(dialog.parentElement!);
    expect(screen.getByRole('alertdialog')).toBeTruthy();

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(location()).toBe('/practice');
    expect(document.activeElement).toBe(link);
  });
});
