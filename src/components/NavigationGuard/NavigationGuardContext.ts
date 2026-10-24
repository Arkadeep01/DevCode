import { createContext, useContext } from 'react';
import type { To } from 'react-router-dom';

export interface NavigationGuardContextValue {
  active: boolean;
  setGuard: (active: boolean) => void;
  requestNavigation: (to: To, trigger: HTMLElement | null) => boolean;
}

export const NavigationGuardContext = createContext<NavigationGuardContextValue>({
  active: false,
  setGuard: () => undefined,
  requestNavigation: () => false,
});

export function useNavigationGuard(): NavigationGuardContextValue {
  return useContext(NavigationGuardContext);
}
