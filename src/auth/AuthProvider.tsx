import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  fetchMe,
  getToken,
  login as apiLogin,
  register as apiRegister,
  setToken,
  type AuthCredentials,
  type AuthUser,
  type RegisterInput,
} from '../services/api';
import { AuthContext, type AuthState, type AuthStatus } from './AuthContext';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>(() =>
    getToken() === null ? 'anonymous' : 'loading',
  );
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    if (status !== 'loading') return;
    let active = true;
    fetchMe()
      .then((me) => {
        if (!active) return;
        setUser(me);
        setStatus('authenticated');
      })
      .catch(() => {
        if (!active) return;
        setToken(null);
        setUser(null);
        setStatus('anonymous');
      });
    return () => {
      active = false;
    };
  }, [status]);

  const login = useCallback(async (credentials: AuthCredentials) => {
    const session = await apiLogin(credentials);
    setToken(session.token);
    setUser(session.user);
    setStatus('authenticated');
    return session.user;
  }, []);

  const register = useCallback(async (input: RegisterInput) => {
    const session = await apiRegister(input);
    setToken(session.token);
    setUser(session.user);
    setStatus('authenticated');
    return session.user;
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    setStatus('anonymous');
  }, []);

  const value = useMemo<AuthState>(
    () => ({ status, user, login, register, logout }),
    [status, user, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
