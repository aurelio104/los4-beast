import { motion } from 'framer-motion';
import { Zap } from 'lucide-react';
import { scaleInTransition } from '../lib/motion';

export function PointsBadge({ points, compact = false }: { points: number; compact?: boolean }) {
  if (compact) {
    return (
      <motion.div
        key={points}
        initial={{ scale: 1.1 }}
        animate={{ scale: 1 }}
        transition={scaleInTransition}
        className="glass-strong glass-accent inline-flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-full shrink-0 bg-reto-gold/10 border-reto-gold/25"
      >
        <motion.div
          animate={{ rotate: [0, 8, -8, 0] }}
          transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 4 }}
        >
          <Zap size={14} className="text-reto-gold fill-reto-gold shrink-0" />
        </motion.div>
        <span className="text-sm sm:text-base font-black text-glow-gold tabular-nums">{points.toLocaleString()}</span>
        <span className="text-[10px] text-white/55 font-medium hidden sm:inline">Puntos</span>
      </motion.div>
    );
  }

  return (
    <motion.div
      key={points}
      initial={{ scale: 1.2 }}
      animate={{ scale: 1 }}
      transition={scaleInTransition}
      className="glass-strong glass-accent inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-reto-gold/10"
    >
      <motion.div
        animate={{ rotate: [0, 15, -15, 0] }}
        transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
      >
        <Zap size={20} className="text-reto-gold fill-reto-gold" />
      </motion.div>
      <span className="text-lg font-black text-glow-gold tabular-nums">{points.toLocaleString()}</span>
      <span className="text-xs text-white/55 font-medium">Puntos</span>
    </motion.div>
  );
}
