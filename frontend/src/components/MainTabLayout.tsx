import { ReactNode, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { prefetchMainRoutes } from '../lib/prefetch-routes';

export function MainTabLayout({ children }: { children: ReactNode }) {
  useEffect(() => {
    prefetchMainRoutes();
  }, []);

  const shell = (
    <div className="hub-layout">
      <div className="hub-layout__scroll">{children}</div>
    </div>
  );

  return createPortal(shell, document.body);
}
