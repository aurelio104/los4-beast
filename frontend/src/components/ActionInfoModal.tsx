import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { ActionInfo } from '../lib/actionInfo';

interface ActionInfoModalProps {
  info: ActionInfo;
  onClose: () => void;
  onConfirm?: () => void;
  confirmLabel?: string;
  loading?: boolean;
  disabled?: boolean;
}

export function ActionInfoModal({
  info,
  onClose,
  onConfirm,
  confirmLabel = 'Continuar',
  loading,
  disabled
}: ActionInfoModalProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        exit={{ y: 100 }}
        className="glass-strong w-full max-w-md rounded-3xl p-6 max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{info.emoji}</span>
            <h3 className="text-lg font-bold">{info.title}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-white/5 text-white/50 hover:text-white"
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>
        </div>

        <p className="text-sm text-white/75 leading-relaxed mb-4">{info.description}</p>

        {info.points && info.points !== '—' && (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-reto-gold/15 border border-reto-gold/30 mb-4">
            <span className="text-xs text-white/50 uppercase tracking-wider">Puntos</span>
            <span className="text-sm font-bold text-reto-gold">{info.points}</span>
          </div>
        )}

        <div className="mb-6">
          <p className="text-xs uppercase tracking-widest text-white/40 mb-2">Reglas</p>
          <ul className="space-y-2">
            {info.rules.map((rule) => (
              <li key={rule} className="flex items-start gap-2 text-sm text-white/65">
                <span className="text-reto-cyan mt-0.5">•</span>
                <span>{rule}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 glass-btn py-3.5 rounded-2xl font-semibold text-white/70"
          >
            Cerrar
          </button>
          {onConfirm && (
            <button
              type="button"
              onClick={onConfirm}
              disabled={loading || disabled}
              className="flex-1 py-3.5 rounded-2xl font-bold disabled:opacity-40"
              style={{ background: 'linear-gradient(135deg, #8338ec, #ff006e)' }}
            >
              {loading ? '...' : confirmLabel}
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
