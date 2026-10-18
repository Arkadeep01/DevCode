import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom';
import { ScrollManager } from './ScrollManager';

afterEach(() => {
  cleanup();
  vi.mocked(window.scrollTo).mockClear();
});

let scrollY = 0;

beforeEach(() => {
  scrollY = 0;
  Object.defineProperty(window, 'scrollY', {
    configurable: true,
    get: () => scrollY,
  });
});

function Controls() {
  const navigate = useNavigate();
  return (
    <div>
      <button type="button" onClick={() => navigate('/study')}>
        go-study
      </button>
      <button type="button" onClick={() => navigate(-1)}>
        go-back
      </button>
    </div>
  );
}

function renderHarness() {
  render(
    <MemoryRouter initialEntries={['/']}>
      <ScrollManager />
      <Controls />
      <Routes>
        <Route path="/" element={<h1>Home</h1>} />
        <Route path="/study" element={<h1>Study</h1>} />
      </Routes>
    </MemoryRouter>
  );
}

const INSTANT_TOP = { top: 0, left: 0, behavior: 'instant' };

describe('ScrollManager', () => {
  it('scrolls to the top on push navigations', () => {
    renderHarness();
    scrollY = 420;

    fireEvent.click(screen.getByRole('button', { name: 'go-study' }));

    expect(window.scrollTo).toHaveBeenLastCalledWith(INSTANT_TOP);
  });

  it('restores the previous scroll position on back navigation', () => {
    renderHarness();
    scrollY = 420;
    fireEvent.click(screen.getByRole('button', { name: 'go-study' }));

    scrollY = 80;
    vi.mocked(window.scrollTo).mockClear();
    fireEvent.click(screen.getByRole('button', { name: 'go-back' }));

    expect(window.scrollTo).toHaveBeenLastCalledWith({
      top: 420,
      left: 0,
      behavior: 'instant',
    });
  });

  it('lands at the top when going back to a fresh entry', () => {
    renderHarness();

    fireEvent.click(screen.getByRole('button', { name: 'go-study' }));
    fireEvent.click(screen.getByRole('button', { name: 'go-back' }));

    expect(window.scrollTo).toHaveBeenLastCalledWith(INSTANT_TOP);
  });
});
