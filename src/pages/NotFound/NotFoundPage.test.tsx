import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { App } from '../../App';

afterEach(cleanup);

function renderAt(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>
  );
}

describe('unknown routes', () => {
  it('renders a 404 page instead of silently redirecting home', () => {
    renderAt('/definitely-not-a-page');

    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading.textContent).toMatch(/early exit/i);
    expect(screen.getByText('/definitely-not-a-page')).toBeTruthy();
  });

  it('offers links back into the app', () => {
    renderAt('/nope');

    expect(
      screen.getByRole('link', { name: 'Back to home' }).getAttribute('href')
    ).toBe('/');
    expect(
      screen.getByRole('link', { name: 'Browse study topics' }).getAttribute('href')
    ).toBe('/study');
  });
});
