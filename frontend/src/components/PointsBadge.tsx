import { motion } from 'framer-motion';
import { Zap } from 'lucide-react';

export function PointsBadge({ points }: { points: number }) {
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
