import { useEffect, useLayoutEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { scrollToSection, waitForFontsAndFrame } from '../../utils/scrollToSection';

interface ScrollTargetState {
  scrollTo?: string;
}

function scrollToTop() {
  try {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  } catch {
    window.scrollTo(0, 0);
  }
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
  }, [location.pathname, location.search, location.state]);

  return null;
}
