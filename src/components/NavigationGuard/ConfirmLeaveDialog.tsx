import { useEffect, useId, useRef } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import { Button } from '../Button/Button';
import { getFocusableElements, inertBackground } from '../../utils/dialogFocus';
import './NavigationGuard.css';

interface ConfirmLeaveDialogProps {
  onStay: () => void;
  onLeave: () => void;
  returnFocusTo: HTMLElement | null;
}

export function ConfirmLeaveDialog({
  onStay,
  onLeave,
  returnFocusTo,
}: ConfirmLeaveDialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const overlayRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const onStayRef = useRef(onStay);
  const returnFocusRef = useRef(returnFocusTo);
  const stayRef = useRef<() => void>(() => undefined);

  useEffect(() => {
    onStayRef.current = onStay;
    returnFocusRef.current = returnFocusTo;
  });

  const stay = () => {
    const trigger = returnFocusRef.current;
    onStayRef.current();
    if (trigger?.isConnected) trigger.focus();
  };

  useEffect(() => {
    stayRef.current = stay;
  });

  useEffect(() => {
    const panel = panelRef.current;
    const focusables = panel ? getFocusableElements(panel) : [];
    focusables[0]?.focus();

    const overlay = overlayRef.current;
    const restoreBackground = overlay ? inertBackground(overlay) : () => undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      stayRef.current();
    };
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      restoreBackground();
    };
  }, []);

  const handleTabTrap = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Tab') return;

    const panel = panelRef.current;
    if (!panel) return;

    const focusables = getFocusableElements(panel);
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (!first || !last) return;

    const active = document.activeElement;
    if (event.shiftKey) {
      if (active === first || !panel.contains(active)) {
        event.preventDefault();
        last.focus();
      }
    } else if (active === last || !panel.contains(active)) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <div className="nav-guard" ref={overlayRef}>
      <div
        ref={panelRef}
        className="nav-guard__dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        onKeyDown={handleTabTrap}
      >
        <h2 className="nav-guard__title" id={titleId}>
          Leave this quiz?
        </h2>
        <p className="nav-guard__text" id={descriptionId}>
          Your progress is saved and you can resume it later from Practice.
        </p>
        <div className="nav-guard__actions">
          <Button size="sm" variant="subtle" onClick={stay}>
            Stay
          </Button>
          <Button size="sm" onClick={onLeave}>
            Leave quiz
          </Button>
        </div>
      </div>
    </div>
  );
}
