import { motion } from 'framer-motion';
import { Zap } from 'lucide-react';

export function PointsBadge({ points, compact = false }: { points: number; compact?: boolean }) {
  if (compact) {
    return (
      <motion.div
        key={points}
        initial={{ scale: 1.08 }}
        animate={{ scale: 1 }}
        className="glass-strong inline-flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-full shrink-0"
      >
        <Zap size={14} className="text-reto-gold fill-reto-gold shrink-0" />
        <span className="text-sm sm:text-base font-black text-glow-gold tabular-nums">{points.toLocaleString()}</span>
        <span className="text-[10px] text-white/45 font-medium hidden sm:inline">BP</span>
      </motion.div>
    );
  }

  return (
    <motion.div
      key={points}
      initial={{ scale: 1.2 }}
      animate={{ scale: 1 }}
      className="glass-strong inline-flex items-center gap-2 px-5 py-2.5 rounded-full"
    >
      <motion.div
        animate={{ rotate: [0, 15, -15, 0] }}
        transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
      >
        <Zap size={20} className="text-reto-gold fill-reto-gold" />
      </motion.div>
      <span className="text-lg font-black text-glow-gold tabular-nums">{points.toLocaleString()}</span>
      <span className="text-xs text-white/50 font-medium">BP</span>
    </motion.div>
  );
}
