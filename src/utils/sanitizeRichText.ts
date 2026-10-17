const ALLOWED_TAGS = new Set(['CODE', 'STRONG', 'EM']);

/**
 * Sanitize rich-text strings that may contain only <code>, <strong> and <em>.
 * Any other element is replaced by its text content and all attributes are
 * stripped, so the result is safe to inject with dangerouslySetInnerHTML.
 */
export function sanitizeRichText(dirty: string): string {
  if (!dirty) return '';
  const root = document.createElement('div');
  root.innerHTML = String(dirty);

  const walk = (node: Element): void => {
    const children = Array.from(node.children);
    for (const child of children) {
      if (!ALLOWED_TAGS.has(child.tagName)) {
        child.replaceWith(document.createTextNode(child.textContent ?? ''));
        continue;
      }
      for (const attr of Array.from(child.attributes)) {
        child.removeAttribute(attr.name);
      }
      walk(child);
    }
  };

  walk(root);
  return root.innerHTML;
}
