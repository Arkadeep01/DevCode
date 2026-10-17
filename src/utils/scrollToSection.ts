import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../routes';

const HEADER_VAR = '--header-height';
const HEADER_FALLBACK = 72;
const HEADER_GAP = 24;
const RETRY_DELAY_MS = 150;

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function readHeaderHeight(): number {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(HEADER_VAR);
  const parsed = Number.parseFloat(raw);
  return Number.isFinite(parsed) ? parsed : HEADER_FALLBACK;
}

/** Anchor on the section's eyebrow/heading, not its outer edge. */
function resolveAnchor(section: HTMLElement): HTMLElement {
  return section.querySelector<HTMLElement>('.eyebrow, h2, h1, h3') ?? section;
}

function targetY(id: string): number | null {
  const section = document.getElementById(id);
  if (!section) return null;
  const rect = resolveAnchor(section).getBoundingClientRect();
  return Math.max(0, rect.top + window.scrollY - readHeaderHeight() - HEADER_GAP);
}

/** Resolves once web fonts are settled and one frame has been painted. */
export function waitForFontsAndFrame(): Promise<void> {
  const fonts = document.fonts ? document.fonts.ready : Promise.resolve();
  return fonts
    .catch(() => undefined)
    .then(() => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())));
}

/**
 * Scroll an in-page section just below the sticky header.
 * Measures after fonts + a frame, then re-measures once in case images or
 * cards settled later and moved the layout.
 */
export async function scrollToSection(id: string, behavior?: ScrollBehavior): Promise<void> {
  const resolved: ScrollBehavior = behavior ?? (prefersReducedMotion() ? 'auto' : 'smooth');
  await waitForFontsAndFrame();
  const firstY = targetY(id);
  if (firstY === null) return;
  window.scrollTo({ top: firstY, left: 0, behavior: resolved });
  window.setTimeout(() => {
    const retryY = targetY(id);
    if (retryY !== null && Math.abs(retryY - firstY) > 1) {
      window.scrollTo({ top: retryY, left: 0, behavior: resolved });
    }
  }, RETRY_DELAY_MS);
}

/**
 * Section links for the navbar and hero. Scrolls locally when the section is
 * on the current page, otherwise routes home carrying `{ scrollTo }` state
 * that ScrollManager consumes after the home page mounts.
 */
export function useScrollToSection(): (id: string) => void {
  const navigate = useNavigate();

  return useCallback(
    (id: string) => {
      if (document.getElementById(id)) {
        void scrollToSection(id);
        return;
      }
      navigate(ROUTES.home, { state: { scrollTo: id } });
    },
    [navigate],
  );
}
