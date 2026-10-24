import { afterEach, describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useDocumentTitle } from './useDocumentTitle';

afterEach(() => {
  document.title = 'DevCode';
});

describe('useDocumentTitle', () => {
  it('sets and updates the document title', () => {
    const { rerender } = renderHook(({ title }) => useDocumentTitle(title), {
      initialProps: { title: 'Study Hub | DevCode' },
    });

    expect(document.title).toBe('Study Hub | DevCode');

    rerender({ title: 'Practice | DevCode' });
    expect(document.title).toBe('Practice | DevCode');
  });
});
