import type { LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';

type QuickChipProps = {
  icon: LucideIcon;
  label: string;
  sublabel?: string;
  onClick?: () => void;
  highlight?: boolean;
  accent?: 'gold' | 'pink' | 'cyan' | 'default';
};

const accentRing = {
  gold: 'ring-reto-gold/30 text-reto-gold',
  pink: 'ring-reto-pink/30 text-reto-pink',
  cyan: 'ring-reto-cyan/30 text-reto-cyan',
  default: 'ring-white/10 text-white/70'
};

export function QuickChip({ icon: Icon, label, sublabel, onClick, highlight, accent = 'default' }: QuickChipProps) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className={`snap-start shrink-0 min-w-[7.5rem] sm:min-w-[8.5rem] glass-btn rounded-2xl px-3.5 py-3 text-left ring-1 ${accentRing[accent]} ${highlight ? 'bg-white/8' : ''}`}
    >
      <Icon size={16} className="mb-1.5" strokeWidth={2} />
      <p className="text-xs font-bold leading-tight">{label}</p>
      {sublabel && <p className="text-[10px] text-white/45 mt-0.5 leading-tight">{sublabel}</p>}
    </motion.button>
  );
}
