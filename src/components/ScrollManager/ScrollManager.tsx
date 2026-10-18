import { useEffect, useLayoutEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';
import { scrollToSection, waitForFontsAndFrame } from '../../utils/scrollToSection';

interface ScrollTargetState {
  scrollTo?: string;
}

function scrollToY(top: number) {
  try {
    window.scrollTo({ top, left: 0, behavior: 'instant' });
  } catch {
    window.scrollTo(0, top);
  }
}

function scrollToTop() {
  scrollToY(0);
}

function focusMainHeading() {
  document.querySelector<HTMLElement>('main h1')?.focus({ preventScroll: true });
}

/**
 * Central scroll handling for route changes. Mounted once inside the router,
 * above <Routes>. Owns scroll restoration, initial position and heading focus
 * so pages don't each invent their own scroll hacks.
 */
export function ScrollManager() {
  const location = useLocation();
  const navigationType = useNavigationType();
  const positions = useRef(new Map<string, number>());
  const lastKey = useRef(location.key);

  useEffect(() => {
    if (!('scrollRestoration' in window.history)) return;
    const previous = window.history.scrollRestoration;
    window.history.scrollRestoration = 'manual';
    return () => {
      window.history.scrollRestoration = previous;
    };
  }, []);

  useLayoutEffect(() => {
    let cancelled = false;
    let frame = 0;

    if (lastKey.current !== location.key) {
      positions.current.set(lastKey.current, window.scrollY);
      lastKey.current = location.key;
    }

    if (navigationType === 'POP') {
      const restored = positions.current.get(location.key) ?? 0;
      scrollToY(restored);
      frame = requestAnimationFrame(() => {
        if (cancelled) return;
        scrollToY(restored);
        focusMainHeading();
      });
      return () => {
        cancelled = true;
        cancelAnimationFrame(frame);
      };
    }

    const state = location.state as ScrollTargetState | null;
    const target = state?.scrollTo;

    if (target) {
      void waitForFontsAndFrame().then(() => {
        if (cancelled) return;
        void scrollToSection(target);
        focusMainHeading();
      });
      return () => {
        cancelled = true;
      };
    }

    scrollToTop();
    frame = requestAnimationFrame(() => {
      if (cancelled) return;
      scrollToTop();
      focusMainHeading();
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
    };
  }, [location.key, location.pathname, location.search, location.state, navigationType]);

  return null;
}
