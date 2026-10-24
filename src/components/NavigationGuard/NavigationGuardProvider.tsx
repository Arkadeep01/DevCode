import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { useNavigate, type To } from 'react-router-dom';
import { ConfirmLeaveDialog } from './ConfirmLeaveDialog';
import {
  NavigationGuardContext,
  type NavigationGuardContextValue,
} from './NavigationGuardContext';

interface PendingNavigation {
  to: To;
  trigger: HTMLElement | null;
}

export function NavigationGuardProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState(false);
  const [pending, setPending] = useState<PendingNavigation | null>(null);
  const navigate = useNavigate();

  const setGuard = useCallback((next: boolean) => {
    setActive(next);
    if (!next) setPending(null);
  }, []);

  const requestNavigation = useCallback(
    (to: To, trigger: HTMLElement | null) => {
      if (!active) return false;
      setPending({ to, trigger });
      return true;
    },
    [active],
  );

  const stay = useCallback(() => {
    setPending(null);
  }, []);

  const leave = useCallback(() => {
    if (!pending) return;
    const { to } = pending;
    setPending(null);
    navigate(to);
  }, [navigate, pending]);

  const value = useMemo<NavigationGuardContextValue>(
    () => ({ active, setGuard, requestNavigation }),
    [active, setGuard, requestNavigation],
  );

  return (
    <NavigationGuardContext.Provider value={value}>
      {children}
      {pending ? (
        <ConfirmLeaveDialog
          onStay={stay}
          onLeave={leave}
          returnFocusTo={pending.trigger}
        />
      ) : null}
    </NavigationGuardContext.Provider>
  );
}
