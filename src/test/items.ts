export function first<T>(items: readonly T[]): T {
  const [item] = items;
  if (item === undefined) {
    throw new Error('Expected at least one item');
  }
  return item;
}

export function last<T>(items: readonly T[]): T {
  const item = items[items.length - 1];
  if (item === undefined) {
    throw new Error('Expected at least one item');
  }
  return item;
}
