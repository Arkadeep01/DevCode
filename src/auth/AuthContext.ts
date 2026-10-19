import { createContext } from 'react';
import type { AuthCredentials, AuthUser, RegisterInput } from '../services/api';

export type AuthStatus = 'loading' | 'authenticated' | 'anonymous';

export interface AuthState {
  status: AuthStatus;
  user: AuthUser | null;
  login: (credentials: AuthCredentials) => Promise<AuthUser>;
  register: (input: RegisterInput) => Promise<AuthUser>;
  logout: () => void;
}

export const AuthContext = createContext<AuthState | null>(null);
