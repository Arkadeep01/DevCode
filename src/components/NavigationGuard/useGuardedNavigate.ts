import { useCallback } from 'react';
import type { MouseEvent as ReactMouseEvent } from 'react';
import type { To } from 'react-router-dom';
import { useNavigationGuard } from './NavigationGuardContext';

export type GuardedNavigate = (event: ReactMouseEvent<HTMLAnchorElement>, to: To) => boolean;

export function useGuardedNavigate(): GuardedNavigate {
  const { requestNavigation } = useNavigationGuard();

  return useCallback(
    (event, to) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return false;
      }

      const intercepted = requestNavigation(to, event.currentTarget);
      if (intercepted) event.preventDefault();
      return intercepted;
    },
    [requestNavigation],
  );
}
