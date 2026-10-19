import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../auth/useAuth';
import { ROUTES } from '../../routes';

interface ProtectedRouteProps {
  children: ReactNode;
  redirectTo?: string | undefined;
}

export function ProtectedRoute({ children, redirectTo = ROUTES.home }: ProtectedRouteProps) {
  const { status } = useAuth();

  if (status === 'loading') {
    return (
      <div className="app-loading" role="status">
        Loading…
      </div>
    );
  }

  if (status === 'anonymous') {
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
}
