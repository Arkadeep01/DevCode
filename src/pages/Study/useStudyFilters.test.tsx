import type { ReactNode } from 'react';
import { act, cleanup, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { ToastProvider } from '../../components/Toast/ToastProvider';
import { TOPIC_CATEGORIES } from '../../data/studyTopics';
import { first } from '../../test/items';
import { StudyPage } from './StudyPage';
import { useStudyFilters } from './useStudyFilters';

afterEach(() => {
  cleanup();
});

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location">{location.search}</output>;
}

function renderFilters(initialEntries: string[]) {
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <MemoryRouter initialEntries={initialEntries} initialIndex={initialEntries.length - 1}>
        {children}
      </MemoryRouter>
    );
  }

  return renderHook(
    () => ({
      filters: useStudyFilters(),
      location: useLocation(),
      navigate: useNavigate(),
    }),
    { wrapper: Wrapper },
  );
}

describe('useStudyFilters category deep link', () => {
  it('reads a valid category from the URL', () => {
    const { result } = renderFilters(['/study?category=language']);

    expect(result.current.filters.category).toBe('language');
    expect(result.current.location.search).toBe('?category=language');
  });

  it('falls back to all and removes an invalid category param', () => {
    const { result } = renderFilters(['/study?category=banana']);

    expect(result.current.filters.category).toBe('all');
    expect(result.current.location.search).toBe('');
  });

  it('writes the chosen category to the URL and keeps unrelated params', () => {
    const { result } = renderFilters(['/study?ref=home']);

    act(() => {
      result.current.filters.setCategory('dsa');
    });

    expect(result.current.filters.category).toBe('dsa');
    expect(result.current.location.search).toBe('?ref=home&category=dsa');
  });

  it('removes the param when resetting to all', () => {
    const { result } = renderFilters(['/study?ref=home&category=dsa']);

    act(() => {
      result.current.filters.setCategory('all');
    });

    expect(result.current.filters.category).toBe('all');
    expect(result.current.location.search).toBe('?ref=home');
  });

  it('replaces the entry instead of pushing, so Back skips filter changes', () => {
    const { result } = renderFilters(['/other', '/study']);

    act(() => {
      result.current.filters.setCategory('dsa');
    });
    expect(result.current.location.search).toBe('?category=dsa');

    act(() => {
      result.current.navigate(-1);
    });
    expect(result.current.location.pathname).toBe('/other');
  });

  it('filters topics by the category taken from the URL', () => {
    const { result } = renderFilters(['/study?category=db_sys']);

    expect(result.current.filters.total).toBe(15);
    expect(result.current.filters.filtered.length).toBeGreaterThan(0);
    expect(
      result.current.filters.filtered.every((topic) => topic.category === 'db_sys'),
    ).toBe(true);
  });
});

describe('StudyPage category toolbar', () => {
  const firstCategory = first(TOPIC_CATEGORIES);

  it('writes the picked category to the URL and clears it on reset', () => {
    render(
      <MemoryRouter initialEntries={['/study']}>
        <ToastProvider>
          <LocationProbe />
          <StudyPage />
        </ToastProvider>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: new RegExp(`^${firstCategory.label}`) }));
    expect(screen.getByTestId('location').textContent).toBe(`?category=${firstCategory.id}`);

    fireEvent.click(screen.getByRole('button', { name: /^All topics/ }));
    expect(screen.getByTestId('location').textContent).toBe('');
  });
});
