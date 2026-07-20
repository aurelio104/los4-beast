import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X } from 'lucide-react';
import type { AlertPayload } from '../lib/notification-center';

type Props = {
  toast: AlertPayload | null;
  appMessage: string | null;
  onDismiss: () => void;
  onDismissApp: () => void;
  onOpenToast?: () => void;
};

export function NotificationAlerts({ toast, appMessage, onDismiss, onDismissApp, onOpenToast }: Props) {
  return (
    <>
      <AnimatePresence>
        {toast && (
          <motion.button
            type="button"
            initial={{ opacity: 0, y: -24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16 }}
            className="notif-toast"
            role="alert"
            onClick={() => {
              onOpenToast?.();
              onDismiss();
            }}
          >
            <div className="notif-toast__lamp" aria-hidden>
              <Bell size={18} />
              <span className="notif-toast__pulse" />
            </div>
            <div className="notif-toast__copy">
              <p className="notif-toast__title">{toast.title}</p>
              <p className="notif-toast__body">{toast.body}</p>
            </div>
            <span
              role="button"
              tabIndex={0}
              className="notif-toast__x"
              aria-label="Cerrar"
              onClick={(e) => {
                e.stopPropagation();
                onDismiss();
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.stopPropagation();
                  onDismiss();
                }
              }}
            >
              <X size={15} />
            </span>
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {appMessage && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="notif-app-toast"
            role="status"
          >
            <span className="notif-app-toast__text">{appMessage}</span>
            <button type="button" className="notif-app-toast__x" onClick={onDismissApp} aria-label="Cerrar">
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

type BellProps = {
  unread: number;
  onClick: () => void;
  className?: string;
};

export function NotificationBellButton({ unread, onClick, className = '' }: BellProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`notif-bell ${unread > 0 ? 'is-hot' : ''} ${className}`.trim()}
      aria-label={unread ? `${unread} notificaciones sin leer` : 'Notificaciones'}
    >
      <span className="notif-bell__ring" aria-hidden />
      <Bell size={19} strokeWidth={2.25} className="notif-bell__icon" />
      {unread > 0 && (
        <span className="notif-bell__badge">{unread > 9 ? '9+' : unread}</span>
      )}
    </button>
  );
}
