import { motion, AnimatePresence } from 'framer-motion';
import { Download, Share, X, Smartphone } from 'lucide-react';
import { RetoLogo } from './RetoLogo';
import { useModalBackClose } from '../hooks/useModalBackClose';

type PwaInstallPromptProps = {
  open: boolean;
  canNativeInstall: boolean;
  needsIOSGuide: boolean;
  onInstall: () => void;
  onDismiss: () => void;
};

export function PwaInstallPrompt({ open, canNativeInstall, needsIOSGuide, onInstall, onDismiss }: PwaInstallPromptProps) {
  useModalBackClose(open, onDismiss);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4"
          style={{ paddingBottom: 'max(0px, env(safe-area-inset-bottom))' }}
        >
          <motion.button
            type="button"
            aria-label="Cerrar"
            className="absolute inset-0 modal-overlay"
            onClick={onDismiss}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          />
          <motion.div
            initial={{ y: 40, opacity: 0, scale: 0.96 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 24, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            className="relative w-full max-w-md glass-strong rounded-t-3xl sm:rounded-3xl p-6 sm:p-8 border border-white/15 shadow-2xl"
            style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
          >
            <button
              type="button"
              onClick={onDismiss}
              className="absolute top-4 right-4 p-2 rounded-full text-white/40 hover:text-white/70"
              aria-label="Cerrar"
            >
              <X size={18} />
            </button>

            <div className="flex flex-col items-center text-center">
              <RetoLogo size="hero" animate glow className="mb-4" />
              <h2 className="text-xl sm:text-2xl font-black gradient-text mb-1">Instala Reto</h2>
              <p className="text-sm text-white/55 mb-6 max-w-[28ch] leading-relaxed">
                Acceso instantáneo, pantalla completa y notificaciones del reto del 29 de agosto.
              </p>

              {needsIOSGuide && !canNativeInstall ? (
                <div className="w-full space-y-3 mb-2">
                  <div className="glass rounded-2xl p-4 text-left text-sm text-white/70 space-y-2">
                    <p className="font-semibold text-white flex items-center gap-2">
                      <Share size={16} className="text-reto-cyan shrink-0" />
                      En iPhone / iPad
                    </p>
                    <ol className="list-decimal list-inside space-y-1 text-xs sm:text-sm">
                      <li>Toca <strong>Compartir</strong> en Safari</li>
                      <li>Elige <strong>Agregar a pantalla de inicio</strong></li>
                      <li>Confirma con <strong>Agregar</strong></li>
                    </ol>
                  </div>
                  <button
                    type="button"
                    onClick={onDismiss}
                    className="w-full py-3.5 rounded-2xl font-bold glass-btn flex items-center justify-center gap-2"
                  >
                    <Smartphone size={18} />
                    Entendido
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={onInstall}
                  className="w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 mb-2 btn-primary btn-primary-gold"
                >
                  <Download size={20} />
                  Instalar ahora
                </button>
              )}

              <button type="button" onClick={onDismiss} className="text-xs text-white/35 mt-2 underline-offset-2 hover:text-white/55">
                Ahora no
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
