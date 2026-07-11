import { createContext, useContext, ReactNode } from 'react';
import { useNotificationCenter } from '../hooks/useNotificationCenter';
import { NotificationAlerts, NotificationBellButton } from './NotificationAlerts';

type Ctx = ReturnType<typeof useNotificationCenter>;

const NotificationContext = createContext<Ctx | null>(null);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const center = useNotificationCenter();

  return (
    <NotificationContext.Provider value={center}>
      <NotificationAlerts toast={center.toast} onDismiss={center.dismissToast} />
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications requires NotificationProvider');
  return ctx;
}

export { NotificationBellButton };
