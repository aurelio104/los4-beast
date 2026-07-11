import { motion } from 'framer-motion';
import { Download, X } from 'lucide-react';

export function InstallBanner({ onInstall, onDismiss }: { onInstall: () => void; onDismiss: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-strong rounded-2xl p-4 mb-4 flex items-center gap-3 border border-reto-gold/30"
    >
      <motion.div animate={{ scale: [1, 1.15, 1] }} transition={{ repeat: Infinity, duration: 2 }}>
        <Download className="text-reto-gold" size={22} />
      </motion.div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold">Instala Reto</p>
        <p className="text-xs text-white/50">Acceso rápido + notificaciones</p>
      </div>
      <button type="button" onClick={onInstall} className="px-3 py-2 rounded-xl text-xs font-bold bg-reto-pink/30 text-white shrink-0">
        Instalar
      </button>
      <button type="button" onClick={onDismiss} className="p-1 text-white/40 shrink-0" aria-label="Cerrar">
        <X size={16} />
      </button>
    </motion.div>
  );
}
