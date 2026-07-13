import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { ActionInfo } from '../lib/actionInfo';
import { useModalBackClose } from '../hooks/useModalBackClose';
import { overlayFade, overlayTransition, slideSheet, slideSheetTransition } from '../lib/motion';
import { ModalPortal } from './ModalPortal';

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
  useModalBackClose(true, onClose);

  return (
    <ModalPortal>
      <motion.div
        initial={overlayFade.initial}
        animate={overlayFade.animate}
        exit={overlayFade.exit}
        transition={overlayTransition}
        className="app-modal-overlay flex items-end sm:items-center justify-center p-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] modal-overlay"
        role="dialog"
        aria-modal="true"
        onClick={onClose}
      >
      <motion.div
        initial={slideSheet.initial}
        animate={slideSheet.animate}
        exit={slideSheet.exit}
        transition={slideSheetTransition}
        className="glass-strong glass-aurora-top w-full max-w-md rounded-3xl p-5 sm:p-6 max-h-[min(85dvh,calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-2rem))] overflow-y-auto"
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
            className="p-2 rounded-xl glass-subtle text-white/55 hover:text-white"
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>
        </div>

        <p className="text-sm text-white/80 leading-relaxed mb-4">{info.description}</p>

        {info.points && info.points !== '—' && (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-reto-gold/25 border border-reto-gold/40 mb-4">
            <span className="text-xs text-white/55 uppercase tracking-wider">Puntos</span>
            <span className="text-sm font-bold text-glow-gold">{info.points}</span>
          </div>
        )}

        <div className="mb-6">
          <p className="text-xs uppercase tracking-widest text-white/55 mb-2">Reglas</p>
          <ul className="space-y-2">
            {info.rules.map((rule) => (
              <li key={rule} className="flex items-start gap-2 text-sm text-white/70">
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
              className="flex-1 py-3.5 rounded-2xl font-bold disabled:opacity-40 btn-primary"
            >
              {loading ? '...' : confirmLabel}
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
    </ModalPortal>
  );
}
