import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff } from 'lucide-react';

export function OfflineBanner({ online }: { online: boolean }) {
  return (
    <AnimatePresence>
      {!online && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed top-0 inset-x-0 z-[100] bg-reto-red/90 backdrop-blur-md px-4 py-2 flex items-center justify-center gap-2 text-sm font-semibold pt-safe"
        >
          <WifiOff size={16} />
          Sin conexión — reconectando...
        </motion.div>
      )}
    </AnimatePresence>
  );
}
