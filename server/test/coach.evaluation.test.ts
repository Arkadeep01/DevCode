import { describe, expect, it } from 'vitest';
import { runEvaluation, assertEvaluationPassed, EVALUATION_CASES } from '../src/coach/evaluation.js';

describe('Coach evaluation harness', () => {
  it('has 8 to 10 representative evaluation cases', () => {
    expect(EVALUATION_CASES.length).toBeGreaterThanOrEqual(8);
    expect(EVALUATION_CASES.length).toBeLessThanOrEqual(10);
  });

  it('covers all required edge-case scenarios', () => {
    const names = EVALUATION_CASES.map((c) => c.name.toLowerCase());
    expect(names.some((n) => n.includes('correct'))).toBe(true);
    expect(names.some((n) => n.includes('incorrect'))).toBe(true);
    expect(names.some((n) => n.includes('skipped'))).toBe(true);
    expect(names.some((n) => n.includes('mixed'))).toBe(true);
    expect(names.some((n) => n.includes('focus area'))).toBe(true);
    expect(names.some((n) => n.includes('topic'))).toBe(true);
    expect(names.some((n) => n.includes('duplicate'))).toBe(true);
    expect(names.some((n) => n.includes('injection'))).toBe(true);
    expect(names.some((n) => n.includes('empty'))).toBe(true);
  });

  it('achieves at least 9/10 valid and sensible responses', async () => {
    const { total, passed, passRate, results } = await runEvaluation();

    // Log results for visibility.
    for (const result of results) {
      // eslint-disable-next-line no-console
      console.log(
        `[coach-eval] ${result.passed ? 'PASS' : 'FAIL'} — ${result.name}`,
      );
      if (!result.passed) {
        // eslint-disable-next-line no-console
        console.log(`      errors: ${result.errors.join('; ')}`);
      }
    }

    expect(passed).toBeGreaterThanOrEqual(Math.ceil((total * 9) / 10));
    expect(passRate).toBeGreaterThanOrEqual(90);
  });

  it('assertEvaluationPassed throws when quality bar is not met', async () => {
    const { passed, total } = await runEvaluation();
    if (passed === total) {
      await expect(assertEvaluationPassed()).resolves.toBeUndefined();
    } else {
      await expect(assertEvaluationPassed()).rejects.toThrow();
    }
  });
});
