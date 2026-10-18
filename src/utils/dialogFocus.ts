const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

export function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (element) => !element.hidden && element.getAttribute('aria-hidden') !== 'true'
  );
}

const SKIPPED_TAGS = new Set(['SCRIPT', 'STYLE', 'LINK']);

/**
 * Marks every element outside the given element's ancestor chain as `inert`,
 * so the dialog's background cannot be reached by pointer or keyboard.
 * Returns a function that removes exactly the attributes it added.
 */
export function inertBackground(element: HTMLElement): () => void {
  const marked: Element[] = [];
  let node: HTMLElement | null = element;

  while (node?.parentElement && node.parentElement !== document.body) {
    const parent: HTMLElement = node.parentElement;

    for (const sibling of Array.from(parent.children)) {
      if (sibling === node || !(sibling instanceof HTMLElement)) continue;
      if (SKIPPED_TAGS.has(sibling.tagName)) continue;
      if (sibling.hasAttribute('inert')) continue;

      marked.push(sibling);
      sibling.setAttribute('inert', '');
    }

    node = parent;
  }

  return () => {
    for (const sibling of marked) sibling.removeAttribute('inert');
  };
}
