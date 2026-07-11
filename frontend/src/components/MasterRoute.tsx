import { useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';

function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem('user') || '{}') as { role?: string };
  } catch {
    return {};
  }
}

export function MasterRoute({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const user = getStoredUser();

  useEffect(() => {
    if (user.role !== 'MASTER') navigate('/', { replace: true });
  }, [navigate, user.role]);

  if (user.role !== 'MASTER') return <Navigate to="/" replace />;
  return <>{children}</>;
}

export function isMasterUser() {
  return getStoredUser().role === 'MASTER';
}
