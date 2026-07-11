import { motion } from 'framer-motion';
import { Download, X } from 'lucide-react';
import { RetoLogo } from './RetoLogo';

export function InstallBanner({ onInstall, onDismiss }: { onInstall: () => void; onDismiss: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-strong rounded-2xl p-3 sm:p-4 mb-4 flex items-center gap-3 border border-reto-gold/30"
    >
      <motion.div animate={{ scale: [1, 1.08, 1] }} transition={{ repeat: Infinity, duration: 2.5 }}>
        <RetoLogo size="sm" glow />
      </motion.div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold truncate">Instala Reto</p>
        <p className="text-xs text-white/50 truncate">Pantalla completa + alertas</p>
      </div>
      <button type="button" onClick={onInstall} className="px-3 py-2 rounded-xl text-xs font-bold bg-reto-pink/30 text-white shrink-0 flex items-center gap-1">
        <Download size={14} />
        <span className="hidden sm:inline">Instalar</span>
      </button>
      <button type="button" onClick={onDismiss} className="p-1 text-white/40 shrink-0" aria-label="Cerrar">
        <X size={16} />
      </button>
    </motion.div>
  );
}
