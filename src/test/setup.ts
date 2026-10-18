import { vi } from 'vitest';

if (typeof window !== 'undefined' && typeof window.matchMedia !== 'function') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string): MediaQueryList =>
      ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }) as unknown as MediaQueryList,
  });
}

// jsdom logs "Not implemented: window.scrollTo" without a stub; scroll
// behavior is asserted through this mock in tests that care about it.
if (typeof window !== 'undefined') {
  const scrollTo = vi.fn();
  Object.defineProperty(window, 'scrollTo', { writable: true, value: scrollTo });
}
