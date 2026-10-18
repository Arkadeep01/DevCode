import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { ThemeProvider } from '../../theme/ThemeProvider';
import { Navbar } from './Navbar';

afterEach(cleanup);

function RouteControl() {
  const navigate = useNavigate();
  return (
    <button type="button" onClick={() => navigate('/practice')}>
      go-practice
    </button>
  );
}

function renderNavbar(path = '/') {
  render(
    <ThemeProvider>
      <MemoryRouter initialEntries={[path]}>
        <Navbar />
        <RouteControl />
      </MemoryRouter>
    </ThemeProvider>
  );
}

function panel() {
  const element = document.getElementById('navbar-nav');
  if (!element) throw new Error('navbar panel not found');
  return element;
}

describe('Navbar mobile menu', () => {
  it('exposes a collapsed menu toggle by default', () => {
    renderNavbar();

    const toggle = screen.getByRole('button', { name: 'Open menu' });
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(toggle.getAttribute('aria-controls')).toBe('navbar-nav');
  });

  it('opens and closes the panel on toggle click', () => {
    renderNavbar();

    fireEvent.click(screen.getByRole('button', { name: 'Open menu' }));

    expect(panel().className).toContain('navbar__links--open');
    expect(
      screen.getByRole('button', { name: 'Close menu' }).getAttribute('aria-expanded')
    ).toBe('true');

    fireEvent.click(screen.getByRole('button', { name: 'Close menu' }));

    expect(panel().className).not.toContain('navbar__links--open');
    expect(screen.getByRole('button', { name: 'Open menu' })).toBeTruthy();
  });

  it('closes on Escape and returns focus to the toggle', () => {
    renderNavbar();

    const toggle = screen.getByRole('button', { name: 'Open menu' });
    fireEvent.click(toggle);
    fireEvent.keyDown(toggle, { key: 'Escape' });

    expect(screen.getByRole('button', { name: 'Open menu' })).toBeTruthy();
    expect(panel().className).not.toContain('navbar__links--open');
    expect(document.activeElement).toBe(toggle);
  });

  it('closes when a route link is clicked, even without a path change', () => {
    renderNavbar('/study');

    fireEvent.click(screen.getByRole('button', { name: 'Open menu' }));
    fireEvent.click(screen.getByRole('link', { name: 'Study' }));

    expect(panel().className).not.toContain('navbar__links--open');
  });

  it('closes when a home section link is clicked', () => {
    renderNavbar('/');

    fireEvent.click(screen.getByRole('button', { name: 'Open menu' }));
    fireEvent.click(screen.getByRole('button', { name: 'Study paths' }));

    expect(panel().className).not.toContain('navbar__links--open');
  });

  it('closes when the route changes', () => {
    renderNavbar('/');

    fireEvent.click(screen.getByRole('button', { name: 'Open menu' }));
    fireEvent.click(screen.getByRole('button', { name: 'go-practice' }));

    expect(panel().className).not.toContain('navbar__links--open');
    expect(screen.getByRole('button', { name: 'Open menu' })).toBeTruthy();
  });
});
