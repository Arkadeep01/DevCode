import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  parseTokens,
  tokensContrast,
  tokensContrastOnComposite,
} from '../test/contrast';

const css = readFileSync(resolve(process.cwd(), 'src/styles/tokens.css'), 'utf8');
const themes = parseTokens(css);

const AA_TEXT = 4.5;
const AA_LARGE = 3;

for (const [name, tokens] of [
  ['light', themes.light],
  ['dark', themes.dark],
] as const) {
  describe(`${name} theme contrast (G1)`, () => {
    it('hero accent reads on the page background (large text)', () => {
      expect(tokensContrast(tokens, 'teal-text', 'bg')).toBeGreaterThanOrEqual(AA_LARGE);
    });

    it('info tags read on their soft background', () => {
      expect(
        tokensContrastOnComposite(tokens, 'teal-text', 'teal-soft', 'surface'),
      ).toBeGreaterThanOrEqual(AA_TEXT);
    });

    it('success tags read on their soft background', () => {
      expect(
        tokensContrastOnComposite(tokens, 'success', 'success-soft', 'surface'),
      ).toBeGreaterThanOrEqual(AA_TEXT);
    });

    it('warn tags read on their soft background', () => {
      expect(
        tokensContrastOnComposite(tokens, 'warn', 'warn-soft', 'surface'),
      ).toBeGreaterThanOrEqual(AA_TEXT);
    });

    it('muted text reads on the page background', () => {
      expect(tokensContrast(tokens, 'muted', 'bg')).toBeGreaterThanOrEqual(AA_TEXT);
    });

    it('muted navbar links read on the translucent navbar', () => {
      expect(
        tokensContrastOnComposite(tokens, 'muted', 'nav-bg', 'bg'),
      ).toBeGreaterThanOrEqual(AA_TEXT);
    });

    it('muted navbar links stay readable over the dark section band', () => {
      expect(
        tokensContrastOnComposite(tokens, 'muted', 'nav-bg', 'section-dark'),
      ).toBeGreaterThanOrEqual(AA_TEXT);
    });

    it('muted text reads on surface-alt', () => {
      expect(tokensContrast(tokens, 'muted', 'surface-alt')).toBeGreaterThanOrEqual(AA_TEXT);
    });
  });
}
