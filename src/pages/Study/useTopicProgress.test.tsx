import { StrictMode } from 'react';
import { act, cleanup, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '../../components/Toast/ToastProvider';
import { STORAGE_KEYS } from '../../utils/storage';
import { StudyPage } from './StudyPage';
import { useTopicProgress } from './useTopicProgress';

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('useTopicProgress', () => {
  it('hydrates mastered and bookmarks from localStorage', () => {
    window.localStorage.setItem(STORAGE_KEYS.mastered, JSON.stringify(['seeded']));
    window.localStorage.setItem(STORAGE_KEYS.bookmarks, '{corrupt');

    const { result } = renderHook(() => useTopicProgress(), { wrapper: StrictMode });

    expect([...result.current.mastered]).toEqual(['seeded']);
    expect(result.current.bookmarks.size).toBe(0);
  });

  it('toggles mastered and bookmarks on and off with the right flags', () => {
    const { result } = renderHook(() => useTopicProgress(), { wrapper: StrictMode });

    let first!: { added: boolean };
    act(() => {
      first = result.current.toggleMastered('topic-a');
    });
    expect(first.added).toBe(true);
    expect(result.current.mastered.has('topic-a')).toBe(true);

    let second!: { added: boolean };
    act(() => {
      second = result.current.toggleMastered('topic-a');
    });
    expect(second.added).toBe(false);
    expect(result.current.mastered.has('topic-a')).toBe(false);

    let third!: { added: boolean };
    act(() => {
      third = result.current.toggleBookmark('topic-b');
    });
    expect(third.added).toBe(true);
    expect(result.current.bookmarks.has('topic-b')).toBe(true);
    expect(result.current.mastered.has('topic-b')).toBe(false);
  });

  it('writes localStorage exactly once per toggle, even under StrictMode', () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    const { result } = renderHook(() => useTopicProgress(), { wrapper: StrictMode });

    act(() => {
      result.current.toggleMastered('topic-a');
    });

    expect(setItem).toHaveBeenCalledTimes(1);
    expect(setItem).toHaveBeenLastCalledWith(STORAGE_KEYS.mastered, JSON.stringify(['topic-a']));

    act(() => {
      result.current.toggleBookmark('topic-b');
    });

    expect(setItem).toHaveBeenCalledTimes(2);
    expect(setItem).toHaveBeenLastCalledWith(STORAGE_KEYS.bookmarks, JSON.stringify(['topic-b']));
  });
});

describe('StudyPage toast feedback', () => {
  it('shows the right toast when a card is toggled twice', () => {
    render(
      <MemoryRouter>
        <ToastProvider>
          <StudyPage />
        </ToastProvider>
      </MemoryRouter>,
    );

    const [bookmarkButton] = screen.getAllByRole('button', { name: /^Bookmark / });

    fireEvent.click(bookmarkButton);
    expect(screen.getByText('Saved to bookmarks')).toBeDefined();

    fireEvent.click(bookmarkButton);
    expect(screen.getByText('Removed from bookmarks')).toBeDefined();
  });
});
