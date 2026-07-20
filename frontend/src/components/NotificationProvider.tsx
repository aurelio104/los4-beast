import { createContext, useContext, ReactNode } from 'react';
import { useNotificationCenter } from '../hooks/useNotificationCenter';
import { NotificationAlerts, NotificationBellButton } from './NotificationAlerts';
import { NotificationInboxSheet } from './NotificationInboxSheet';

type Ctx = ReturnType<typeof useNotificationCenter>;

const NotificationContext = createContext<Ctx | null>(null);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const center = useNotificationCenter();

  return (
    <NotificationContext.Provider value={center}>
      <NotificationAlerts
        toast={center.toast}
        appMessage={center.appMessage}
        onDismiss={center.dismissToast}
        onDismissApp={center.dismissAppToast}
        onOpenToast={center.openInbox}
      />
      <NotificationInboxSheet
        open={center.inboxOpen}
        alerts={center.recent}
        unread={center.unread}
        onClose={center.closeInbox}
        onOpenAlert={center.openAlert}
        onMarkAllRead={center.markAllRead}
        onClearAll={center.clearAll}
      />
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
