import { describe, expect, it } from 'vitest';
import { QUESTIONS } from '../questions';

const MAX_SKEW = 1.8;

describe('question bank quality', () => {
  it('gives every question four options and a valid correct index', () => {
    for (const question of QUESTIONS) {
      expect(question.options, question.id).toHaveLength(4);
      expect(question.correctIndex, question.id).toBeGreaterThanOrEqual(0);
      expect(question.correctIndex, question.id).toBeLessThan(question.options.length);
    }
  });

  it('never repeats an option inside the same question', () => {
    for (const question of QUESTIONS) {
      const seen = new Set<string>();
      for (const option of question.options) {
        const key = option.trim().toLowerCase();
        expect(seen.has(key), `${question.id}: "${option}"`).toBe(false);
        seen.add(key);
      }
    }
  });

  it('keeps the correct answer from standing out by length', () => {
    for (const question of QUESTIONS) {
      const lengths = question.options.map((option) => option.length);
      const correctLength = lengths[question.correctIndex] ?? 0;
      const distractorLengths = lengths.filter((_, index) => index !== question.correctIndex);
      const average =
        distractorLengths.reduce((total, length) => total + length, 0) /
        distractorLengths.length;
      expect(correctLength / average, question.id).toBeLessThanOrEqual(MAX_SKEW);
    }
  });
});
