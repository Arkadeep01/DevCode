import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { App } from './App';
import { ThemeProvider } from './theme/ThemeProvider';

afterEach(cleanup);

function renderApp(path: string) {
  return render(
    <ThemeProvider>
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>
    </ThemeProvider>
  );
}

describe('App lazy routes', () => {
  it('shows a loading fallback, then the practice page', async () => {
    renderApp('/practice');

    expect(screen.getByText('Loading…')).toBeTruthy();
    expect(await screen.findByText('Set up your run.')).toBeTruthy();
    expect(screen.queryByText('Loading…')).toBeNull();
  });

  it('shows a loading fallback, then the study page', async () => {
    renderApp('/study');

    expect(screen.getByText('Loading…')).toBeTruthy();
    expect(await screen.findByText('Topics that pay off.')).toBeTruthy();
    expect(screen.queryByText('Loading…')).toBeNull();
  });

  it('renders the home page eagerly', () => {
    renderApp('/');

    expect(screen.getByText('Interview-ready.')).toBeTruthy();
  });
});
