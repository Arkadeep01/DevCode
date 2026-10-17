import { useCallback, useState } from 'react';
import { STORAGE_KEYS, readIdSet, writeIdSet } from '../../utils/storage';

interface ToggleResult {
  added: boolean;
}

export function useTopicProgress() {
  const [mastered, setMastered] = useState<Set<string>>(() =>
    readIdSet(STORAGE_KEYS.mastered),
  );
  const [bookmarks, setBookmarks] = useState<Set<string>>(() =>
    readIdSet(STORAGE_KEYS.bookmarks),
  );

  const toggleMastered = useCallback((id: string): ToggleResult => {
    let added = false;
    setMastered((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
        added = true;
      }
      writeIdSet(STORAGE_KEYS.mastered, next);
      return next;
    });
    return { added };
  }, []);

  const toggleBookmark = useCallback((id: string): ToggleResult => {
    let added = false;
    setBookmarks((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
        added = true;
      }
      writeIdSet(STORAGE_KEYS.bookmarks, next);
      return next;
    });
    return { added };
  }, []);

  return { mastered, bookmarks, toggleMastered, toggleBookmark };
}
