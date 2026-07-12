import { Navigate, useLocation } from 'react-router-dom';
import { isSetupDone } from '../lib/setup';
import { User } from '../types';

function getStoredUser(): User | null {
  try {
    const raw = localStorage.getItem('user');
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

/** Redirige a /setup hasta completar configuración inicial. */
export function SetupGate({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const user = getStoredUser();
  const done = isSetupDone(user?.id, user);

  if (!done && location.pathname !== '/setup') {
    return <Navigate to="/setup" replace />;
  }
  if (done && location.pathname === '/setup') {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}
