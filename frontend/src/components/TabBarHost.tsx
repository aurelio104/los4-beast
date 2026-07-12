import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import { BottomNav } from './BottomNav';
import { isMasterUser } from '../lib/user';

const TAB_PATHS = ['/', '/arena', '/cofre', '/tienda', '/perfil'] as const;

function isTabRoute(pathname: string) {
  return TAB_PATHS.some((p) => (p === '/' ? pathname === '/' : pathname === p || pathname.startsWith(`${p}/`)));
}

/** Barra inferior persistente en document.body — evita que Framer/page wrappers rompan position:fixed en iOS. */
export function TabBarHost() {
  const { pathname } = useLocation();
  if (!isTabRoute(pathname)) return null;
  return createPortal(<BottomNav showAdmin={isMasterUser()} />, document.body);
}
