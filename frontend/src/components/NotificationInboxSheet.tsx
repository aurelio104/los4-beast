import { AnimatePresence, motion } from 'framer-motion';
import {
  Bell,
  BellOff,
  CheckCheck,
  MessageCircle,
  Sparkles,
  Trash2,
  X
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { StoredAlert } from '../lib/notification-center';

type Props = {
  open: boolean;
  alerts: StoredAlert[];
  unread: number;
  onClose: () => void;
  onOpenAlert: (alert: StoredAlert) => void;
  onMarkAllRead: () => void;
  onClearAll: () => void;
};

function tagIcon(tag?: string): LucideIcon {
  if (tag === 'chat') return MessageCircle;
  if (tag === 'stories' || tag === 'story-reaction') return Sparkles;
  return Bell;
}

function formatWhen(at: number): string {
  const diff = Date.now() - at;
  if (diff < 60_000) return 'Ahora';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} min`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} h`;
  return new Date(at).toLocaleDateString('es', { day: 'numeric', month: 'short' });
}

export function NotificationInboxSheet({
  open,
  alerts,
  unread,
  onClose,
  onOpenAlert,
  onMarkAllRead,
  onClearAll
}: Props) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.button
            type="button"
            aria-label="Cerrar notificaciones"
            className="notif-inbox__backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            className="notif-inbox"
            role="dialog"
            aria-modal="true"
            aria-label="Notificaciones"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 34 }}
          >
            <div className="notif-inbox__handle" aria-hidden />

            <header className="notif-inbox__header">
              <div className="notif-inbox__title-row">
                <div className="notif-inbox__icon-wrap">
                  <Bell size={18} />
                  {unread > 0 && <span className="notif-inbox__live" />}
                </div>
                <div>
                  <p className="notif-inbox__title">Notificaciones</p>
                  <p className="notif-inbox__sub">
                    {unread > 0 ? `${unread} sin leer` : 'Todo al día'}
                  </p>
                </div>
              </div>
              <button type="button" className="notif-inbox__close" onClick={onClose} aria-label="Cerrar">
                <X size={18} />
              </button>
            </header>

            <div className="notif-inbox__actions">
              <button type="button" className="notif-inbox__action" onClick={onMarkAllRead} disabled={unread === 0}>
                <CheckCheck size={15} />
                Marcar leídas
              </button>
              <button
                type="button"
                className="notif-inbox__action notif-inbox__action--danger"
                onClick={onClearAll}
                disabled={alerts.length === 0}
              >
                <Trash2 size={15} />
                Vaciar
              </button>
            </div>

            <div className="notif-inbox__list">
              {alerts.length === 0 ? (
                <div className="notif-inbox__empty">
                  <BellOff size={28} className="text-white/35" />
                  <p>Sin alertas todavía</p>
                  <span>Cuando pase algo en el Reto, aparece aquí.</span>
                </div>
              ) : (
                alerts.map((a) => {
                  const Icon = tagIcon(a.tag);
                  return (
                    <button
                      key={a.id}
                      type="button"
                      className={`notif-inbox__item ${a.read ? '' : 'is-unread'}`}
                      onClick={() => onOpenAlert(a)}
                    >
                      <span className={`notif-inbox__item-icon ${a.read ? '' : 'is-hot'}`}>
                        <Icon size={16} />
                      </span>
                      <span className="notif-inbox__item-body">
                        <span className="notif-inbox__item-title">{a.title}</span>
                        <span className="notif-inbox__item-text">{a.body}</span>
                        <span className="notif-inbox__item-meta">{formatWhen(a.at)}</span>
                      </span>
                      {!a.read && <span className="notif-inbox__dot" aria-hidden />}
                    </button>
                  );
                })
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
