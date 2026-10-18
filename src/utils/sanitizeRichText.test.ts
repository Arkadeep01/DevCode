import { describe, expect, it } from 'vitest';
import { sanitizeRichText } from './sanitizeRichText';

describe('sanitizeRichText', () => {
  it('keeps only the allowed tags (code, strong, em)', () => {
    const input = 'Use <code>map()</code> and stay <strong>calm</strong>, or <em>flag</em> it.';
    expect(sanitizeRichText(input)).toBe(input);
  });

  it('strips every attribute from allowed tags', () => {
    expect(sanitizeRichText('<code class="hl" onclick="steal()">x</code>')).toBe('<code>x</code>');
    expect(sanitizeRichText('<strong style="color:red" id="a">bold</strong>')).toBe(
      '<strong>bold</strong>',
    );
  });

  it('replaces disallowed elements with their text content', () => {
    expect(sanitizeRichText('<a href="https://evil.test">link</a>')).toBe('link');
    expect(sanitizeRichText('<div>plain</div>')).toBe('plain');
    expect(sanitizeRichText('<span>one</span><span>two</span>')).toBe('onetwo');
  });

  it('drops elements that carry no text (script, img)', () => {
    expect(sanitizeRichText('<script>alert(1)</script>')).toBe('alert(1)');
    expect(sanitizeRichText('<img src="x" onerror="alert(1)">')).toBe('');
  });

  it('handles nested disallowed elements by flattening to text', () => {
    expect(sanitizeRichText('<div><strong>nested</strong></div>')).toBe('nested');
  });

  it('returns an empty string for empty input', () => {
    expect(sanitizeRichText('')).toBe('');
  });

  it('leaves plain text untouched', () => {
    expect(sanitizeRichText('plain &amp; simple')).toBe('plain &amp; simple');
  });
});
