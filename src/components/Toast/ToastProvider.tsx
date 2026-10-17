import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ToastContext } from './ToastContext';
import './Toast.css';

export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState('');
  const [visible, setVisible] = useState(false);
  const timer = useRef<number | null>(null);

  const show = useCallback((next: string) => {
    setMessage(next);
    setVisible(true);
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setVisible(false), 2400);
  }, []);

  useEffect(() => {
    return () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    };
  }, []);

  const api = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className={['toast', visible ? 'toast--visible' : ''].join(' ')} role="status" aria-live="polite">
        {message}
      </div>
    </ToastContext.Provider>
  );
}
