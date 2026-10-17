import { useEffect } from 'react';

interface ShortcutHandlers {
  optionCount: number;
  onSelect: (optionIndex: number) => void;
  onNext: () => void;
  onPrev: () => void;
  onToggleFlag: () => void;
}

/** Keyboard shortcuts for the quiz: 1-4 / A-D answer, arrows navigate, F flags. */
export function useQuizShortcuts({
  optionCount,
  onSelect,
  onNext,
  onPrev,
  onToggleFlag,
}: ShortcutHandlers) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
      const key = event.key;
      const lower = key.toLowerCase();

      if (lower >= '1' && lower <= '4') {
        const optionIndex = Number(lower) - 1;
        if (optionIndex < optionCount) onSelect(optionIndex);
        return;
      }
      if (lower >= 'a' && lower <= 'd') {
        const optionIndex = lower.charCodeAt(0) - 97;
        if (optionIndex < optionCount) onSelect(optionIndex);
        return;
      }
      if (key === 'ArrowRight') onNext();
      if (key === 'ArrowLeft') onPrev();
      if (lower === 'f') onToggleFlag();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [optionCount, onSelect, onNext, onPrev, onToggleFlag]);
}
