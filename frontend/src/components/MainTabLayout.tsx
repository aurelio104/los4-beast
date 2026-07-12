import { ReactNode, useEffect } from 'react';
import { BottomNav } from './BottomNav';
import { isMasterUser } from '../lib/user';
import { prefetchMainRoutes } from '../lib/prefetch-routes';

export function MainTabLayout({ children }: { children: ReactNode }) {
  useEffect(() => {
    prefetchMainRoutes();
  }, []);

  return (
    <div className="hub-layout">
      <div className="hub-layout__scroll">{children}</div>
      <BottomNav showAdmin={isMasterUser()} />
    </div>
  );
}
