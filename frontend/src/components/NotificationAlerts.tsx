import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X } from 'lucide-react';
import type { AlertPayload } from '../lib/notification-center';

type Props = {
  toast: AlertPayload | null;
  onDismiss: () => void;
};

export function NotificationAlerts({ toast, onDismiss }: Props) {
  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: -24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -16 }}
          className="fixed top-[max(0.75rem,env(safe-area-inset-top))] left-1/2 -translate-x-1/2 z-[90] w-[min(22rem,calc(100vw-1.5rem))] glass-strong rounded-2xl p-4 shadow-2xl border border-reto-pink/30"
          role="alert"
        >
          <div className="flex gap-3 items-start">
            <div className="relative shrink-0">
              <Bell size={22} className="text-reto-gold mt-0.5" />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-reto-red ring-2 ring-black/40" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold leading-tight">{toast.title}</p>
              <p className="text-xs text-white/65 mt-1 line-clamp-2">{toast.body}</p>
            </div>
            <button type="button" className="text-white/40 p-1" onClick={onDismiss} aria-label="Cerrar">
              <X size={16} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
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
      className={`relative glass-btn p-2.5 rounded-xl shrink-0 ${className}`}
      aria-label={unread ? `${unread} notificaciones sin leer` : 'Notificaciones'}
    >
      <Bell size={20} className="text-white/90" />
      {unread > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-reto-red text-[10px] font-black flex items-center justify-center ring-2 ring-[#0a0a0f] animate-pulse">
          {unread > 9 ? '9+' : unread}
        </span>
      )}
    </button>
  );
}
