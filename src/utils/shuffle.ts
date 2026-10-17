/** Fisher–Yates shuffle. Returns a new array; never mutates the input. */
export function shuffle<T>(items: readonly T[]): T[] {
  const result = items.slice();
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = result[i];
    result[i] = result[j];
    result[j] = tmp;
  }
  return result;
}

/** Random sample of up to `count` items, without repeats. */
export function sampleWithoutRepeats<T>(items: readonly T[], count: number): T[] {
  if (items.length === 0 || count <= 0) return [];
  return shuffle(items).slice(0, Math.min(count, items.length));
}
