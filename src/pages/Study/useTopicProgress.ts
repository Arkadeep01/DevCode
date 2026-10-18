import { useCallback, useState } from 'react';
import { STORAGE_KEYS, readIdSet, writeIdSet } from '../../utils/storage';

interface ToggleResult {
  added: boolean;
}

/** Pure toggle: returns the next set plus whether the id was added. */
function toggled(current: Set<string>, id: string): { next: Set<string>; added: boolean } {
  const next = new Set(current);
  const added = !next.has(id);
  if (added) {
    next.add(id);
  } else {
    next.delete(id);
  }
  return { next, added };
}

export function useTopicProgress() {
  const [mastered, setMastered] = useState<Set<string>>(() =>
    readIdSet(STORAGE_KEYS.mastered),
  );
  const [bookmarks, setBookmarks] = useState<Set<string>>(() =>
    readIdSet(STORAGE_KEYS.bookmarks),
  );

  const toggleMastered = useCallback(
    (id: string): ToggleResult => {
      const { next, added } = toggled(mastered, id);
      setMastered(next);
      writeIdSet(STORAGE_KEYS.mastered, next);
      return { added };
    },
    [mastered],
  );

  const toggleBookmark = useCallback(
    (id: string): ToggleResult => {
      const { next, added } = toggled(bookmarks, id);
      setBookmarks(next);
      writeIdSet(STORAGE_KEYS.bookmarks, next);
      return { added };
    },
    [bookmarks],
  );

  return { mastered, bookmarks, toggleMastered, toggleBookmark };
}
