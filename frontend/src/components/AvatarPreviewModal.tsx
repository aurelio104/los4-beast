import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useModalBackClose } from '../hooks/useModalBackClose';

export function AvatarPreviewModal({
  url,
  name,
  onClose
}: {
  url: string;
  name?: string;
  onClose: () => void;
}) {
  useModalBackClose(true, onClose);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[80] flex flex-col items-center justify-center bg-black/85 backdrop-blur-md p-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={name ? `Foto de ${name}` : 'Foto de perfil'}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute top-[max(1rem,env(safe-area-inset-top))] right-[max(1rem,env(safe-area-inset-right))] glass-strong rounded-full p-2.5 z-10"
        aria-label="Cerrar"
      >
        <X size={20} />
      </button>

      <motion.div
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.92, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 320, damping: 28 }}
        className="flex flex-col items-center gap-4 max-w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={url}
          alt={name ? `Foto de ${name}` : 'Foto de perfil'}
          className="max-w-[min(92vw,24rem)] max-h-[min(70dvh,24rem)] w-auto h-auto rounded-3xl object-cover ring-2 ring-white/20 shadow-2xl"
        />
        {name && (
          <p className="text-center text-sm sm:text-base font-semibold text-white/90 px-2">{name}</p>
        )}
        <p className="text-xs text-white/40">Toca fuera para cerrar</p>
      </motion.div>
    </motion.div>
  );
}
