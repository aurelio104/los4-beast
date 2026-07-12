import type { LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { tapScale } from '../lib/motion';

type QuickChipProps = {
  icon: LucideIcon;
  label: string;
  sublabel?: string;
  onClick?: () => void;
  highlight?: boolean;
  accent?: 'gold' | 'pink' | 'cyan' | 'default';
};

const accentRing = {
  gold: 'ring-reto-gold/40 text-reto-gold',
  pink: 'ring-reto-pink/40 text-reto-pink',
  cyan: 'ring-reto-cyan/40 text-reto-cyan',
  default: 'ring-white/15 text-white/75'
};

const accentGlow = {
  gold: 'shadow-[0_0_20px_rgba(255,190,11,0.2)]',
  pink: 'shadow-[0_0_20px_rgba(255,0,110,0.2)]',
  cyan: 'shadow-[0_0_20px_rgba(6,214,160,0.2)]',
  default: ''
};

export function QuickChip({ icon: Icon, label, sublabel, onClick, highlight, accent = 'default' }: QuickChipProps) {
  return (
    <motion.button
      type="button"
      whileTap={tapScale.whileTap}
      whileHover={tapScale.whileHover}
      onClick={onClick}
      className={`hub-tile glass-btn rounded-2xl px-3 py-2.5 text-left ring-1 flex flex-col justify-between ${accentRing[accent]} ${accentGlow[accent]} ${highlight ? 'glass-accent bg-white/10' : ''}`}
    >
      <Icon size={18} className="shrink-0" strokeWidth={2} />
      <div className="min-h-0 w-full">
        <p className="hub-tile-label text-xs font-bold">{label}</p>
        <p className="hub-tile-sublabel text-[10px] text-white/55 mt-0.5">{sublabel ?? ''}</p>
      </div>
    </motion.button>
  );
}
