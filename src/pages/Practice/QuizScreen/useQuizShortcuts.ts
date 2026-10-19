import { useEffect } from 'react';

interface ShortcutHandlers {
  optionCount: number;
  /** Set to false to fully pause shortcuts (e.g. while a confirmation is open). */
  enabled?: boolean;
  onSelect: (optionIndex: number) => void;
  onNext: () => void;
  onPrev: () => void;
  onToggleFlag: () => void;
}

/** Keyboard shortcuts for the quiz: 1-4 / A-D answer, arrows navigate, F flags. */
export function useQuizShortcuts({
  optionCount,
  enabled = true,
  onSelect,
  onNext,
  onPrev,
  onToggleFlag,
}: ShortcutHandlers) {
  useEffect(() => {
    if (!enabled) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return;

      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }

      const key = event.key;
      const lower = key.toLowerCase();

      if (key.length === 1 && lower >= '1' && lower <= '4') {
        const optionIndex = Number(lower) - 1;
        if (optionIndex < optionCount) {
          event.preventDefault();
          onSelect(optionIndex);
        }
        return;
      }
      if (key.length === 1 && lower >= 'a' && lower <= 'd') {
        const optionIndex = lower.charCodeAt(0) - 97;
        if (optionIndex < optionCount) {
          event.preventDefault();
          onSelect(optionIndex);
        }
        return;
      }
      if (key === 'ArrowRight') {
        event.preventDefault();
        onNext();
        return;
      }
      if (key === 'ArrowLeft') {
        event.preventDefault();
        onPrev();
        return;
      }
      if (lower === 'f') {
        event.preventDefault();
        onToggleFlag();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [optionCount, enabled, onSelect, onNext, onPrev, onToggleFlag]);
}
