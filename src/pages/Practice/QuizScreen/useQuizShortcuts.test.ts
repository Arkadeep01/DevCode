import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, renderHook } from '@testing-library/react';
import { useQuizShortcuts } from './useQuizShortcuts';

afterEach(cleanup);

function press(init: KeyboardEventInit, target: EventTarget = window) {
  const event = new KeyboardEvent('keydown', { cancelable: true, bubbles: true, ...init });
  target.dispatchEvent(event);
  return event;
}

function setup(enabled = true) {
  const handlers = {
    onSelect: vi.fn(),
    onNext: vi.fn(),
    onPrev: vi.fn(),
    onToggleFlag: vi.fn(),
  };
  renderHook(() =>
    useQuizShortcuts({
      optionCount: 4,
      enabled,
      ...handlers,
    })
  );
  return handlers;
}

describe('useQuizShortcuts', () => {
  it('answers with digits and letters and prevents the default', () => {
    const handlers = setup();

    const digit = press({ key: '2' });
    expect(handlers.onSelect).toHaveBeenCalledWith(1);
    expect(digit.defaultPrevented).toBe(true);

    const letter = press({ key: 'D' });
    expect(handlers.onSelect).toHaveBeenCalledWith(3);
    expect(letter.defaultPrevented).toBe(true);
  });

  it('navigates with arrows and flags with F', () => {
    const handlers = setup();

    const right = press({ key: 'ArrowRight' });
    expect(handlers.onNext).toHaveBeenCalledTimes(1);
    expect(right.defaultPrevented).toBe(true);

    const left = press({ key: 'ArrowLeft' });
    expect(handlers.onPrev).toHaveBeenCalledTimes(1);
    expect(left.defaultPrevented).toBe(true);

    const flag = press({ key: 'f' });
    expect(handlers.onToggleFlag).toHaveBeenCalledTimes(1);
    expect(flag.defaultPrevented).toBe(true);
  });

  it('ignores shortcuts combined with modifier keys', () => {
    const handlers = setup();

    const ctrlA = press({ key: 'a', ctrlKey: true });
    const metaF = press({ key: 'f', metaKey: true });
    const altRight = press({ key: 'ArrowRight', altKey: true });

    expect(handlers.onSelect).not.toHaveBeenCalled();
    expect(handlers.onToggleFlag).not.toHaveBeenCalled();
    expect(handlers.onNext).not.toHaveBeenCalled();
    expect(ctrlA.defaultPrevented).toBe(false);
    expect(metaF.defaultPrevented).toBe(false);
    expect(altRight.defaultPrevented).toBe(false);
  });

  it('ignores keys typed into form controls', () => {
    const handlers = setup();

    const input = document.createElement('input');
    const select = document.createElement('select');
    document.body.append(input, select);

    press({ key: '1' }, input);
    press({ key: 'ArrowRight' }, input);
    press({ key: 'b' }, select);

    expect(handlers.onSelect).not.toHaveBeenCalled();
    expect(handlers.onNext).not.toHaveBeenCalled();

    input.remove();
    select.remove();
  });

  it('ignores digits beyond the option count', () => {
    const handlers = setup();

    const event = press({ key: '5' });

    expect(handlers.onSelect).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(false);
  });

  it('does nothing while disabled', () => {
    const handlers = setup(false);

    const digit = press({ key: '1' });
    press({ key: 'ArrowRight' });
    press({ key: 'f' });

    expect(handlers.onSelect).not.toHaveBeenCalled();
    expect(handlers.onNext).not.toHaveBeenCalled();
    expect(handlers.onToggleFlag).not.toHaveBeenCalled();
    expect(digit.defaultPrevented).toBe(false);
  });
});
