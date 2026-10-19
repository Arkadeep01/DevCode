import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, renderHook } from '@testing-library/react';
import { useTimerAnnouncements } from './useTimerAnnouncements';

afterEach(cleanup);

function mount(timeLeft: number | null) {
  return renderHook(({ t }) => useTimerAnnouncements(t), { initialProps: { t: timeLeft } });
}

describe('useTimerAnnouncements', () => {
  it('announces each threshold as the countdown crosses it', () => {
    const { result, rerender } = mount(305);
    expect(result.current).toBe('');

    rerender({ t: 300 });
    expect(result.current).toBe('5 minutes remaining');

    rerender({ t: 299 });
    expect(result.current).toBe('5 minutes remaining');

    rerender({ t: 60 });
    expect(result.current).toBe('1 minute remaining');

    rerender({ t: 30 });
    expect(result.current).toBe('30 seconds remaining');

    rerender({ t: 10 });
    expect(result.current).toBe('10 seconds remaining');
  });

  it('announces only the most urgent threshold when the timer jumps', () => {
    const { result, rerender } = mount(120);

    rerender({ t: 5 });

    expect(result.current).toBe('10 seconds remaining');
  });

  it('does not announce thresholds already passed at mount', () => {
    const { result, rerender } = mount(25);
    expect(result.current).toBe('');

    rerender({ t: 10 });
    expect(result.current).toBe('10 seconds remaining');
  });

  it('clears the announcement when the timer jumps back up (new session)', () => {
    const { result, rerender } = mount(20);

    rerender({ t: 10 });
    expect(result.current).toBe('10 seconds remaining');

    rerender({ t: 300 });
    expect(result.current).toBe('');
  });

  it('stays silent for untimed sessions', () => {
    const { result, rerender } = mount(null);
    expect(result.current).toBe('');

    rerender({ t: null });
    expect(result.current).toBe('');
  });
});
