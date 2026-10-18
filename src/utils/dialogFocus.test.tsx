import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { getFocusableElements, inertBackground } from './dialogFocus';

afterEach(cleanup);

function buildContainer() {
  const { container } = render(
    <div>
      <section data-testid="focus-area">
        <button type="button">First</button>
        <button type="button" disabled>
          Disabled
        </button>
        <button type="button" aria-hidden="true">
          Decorated
        </button>
        <a href="https://example.com">Link</a>
        <span tabIndex={-1} data-testid="programmatic-only">
          Programmatic
        </span>
      </section>
    </div>
  );
  const area = container.querySelector<HTMLElement>('[data-testid="focus-area"]');
  if (!area) throw new Error('focus area not rendered');
  return area;
}

describe('getFocusableElements', () => {
  it('collects enabled, visible, tabbable elements in DOM order', () => {
    const area = buildContainer();
    const labels = getFocusableElements(area).map(
      (element) => element.textContent
    );

    expect(labels).toEqual(['First', 'Link']);
  });
});

describe('inertBackground', () => {
  it('marks every sibling along the ancestor chain except the element chain', () => {
    render(
      <div>
        <div data-testid="outer-background" />
        <div>
          <div data-testid="inner-background" />
          <div data-testid="dialog" />
        </div>
      </div>
    );

    const dialog = screen.getByTestId('dialog');
    const restore = inertBackground(dialog);

    expect(screen.getByTestId('outer-background').hasAttribute('inert')).toBe(true);
    expect(screen.getByTestId('inner-background').hasAttribute('inert')).toBe(true);
    expect(dialog.hasAttribute('inert')).toBe(false);

    restore();

    expect(screen.getByTestId('outer-background').hasAttribute('inert')).toBe(false);
    expect(screen.getByTestId('inner-background').hasAttribute('inert')).toBe(false);
  });

  it('leaves elements that were already inert untouched on restore', () => {
    render(
      <div>
        <div data-testid="already-inert" inert />
        <div data-testid="dialog" />
      </div>
    );

    const restore = inertBackground(screen.getByTestId('dialog'));
    restore();

    expect(screen.getByTestId('already-inert').hasAttribute('inert')).toBe(true);
  });
});
