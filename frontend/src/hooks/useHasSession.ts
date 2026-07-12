import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

export function useHasSession() {
  const location = useLocation();
  const [hasToken, setHasToken] = useState(() => !!localStorage.getItem('token'));

  useEffect(() => {
    setHasToken(!!localStorage.getItem('token'));
  }, [location.pathname]);

  const isPublic =
    location.pathname === '/login' || location.pathname.startsWith('/join');

  return hasToken && !isPublic;
}
