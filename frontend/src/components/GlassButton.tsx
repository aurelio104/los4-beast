import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import { AnimatedIcon } from './AnimatedIcon';
import { haptic } from '../lib/haptics';
import { tapScale } from '../lib/motion';
import { useReducedMotion } from '../hooks/useReducedMotion';

interface GlassButtonProps {
  icon: LucideIcon;
  label: string;
  sublabel?: string;
  onClick?: () => void;
  disabled?: boolean;
  variant?: 'default' | 'danger' | 'gold' | 'success';
  loading?: boolean;
  showInfoHint?: boolean;
  badge?: string | number | boolean;
  pulse?: boolean;
}

const variants = {
  default: {
    border: 'rgba(255,255,255,0.18)',
    glow: 'rgba(131, 56, 236, 0.35)',
    tint: 'rgba(131, 56, 236, 0.08)'
  },
  danger: {
    border: 'rgba(239, 35, 60, 0.45)',
    glow: 'rgba(239, 35, 60, 0.38)',
    tint: 'rgba(239, 35, 60, 0.1)'
  },
  gold: {
    border: 'rgba(255, 190, 11, 0.45)',
    glow: 'rgba(255, 190, 11, 0.38)',
    tint: 'rgba(255, 190, 11, 0.1)'
  },
  success: {
    border: 'rgba(6, 214, 160, 0.45)',
    glow: 'rgba(6, 214, 160, 0.38)',
    tint: 'rgba(6, 214, 160, 0.1)'
  }
};

export function GlassButton({
  icon: Icon,
  label,
  sublabel,
  onClick,
  disabled,
  variant = 'default',
  loading,
  showInfoHint,
  badge,
  pulse
}: GlassButtonProps) {
  const reduced = useReducedMotion();
  const v = variants[variant];
  return (
    <motion.button
      whileHover={disabled || reduced ? undefined : tapScale.whileHover}
      whileTap={disabled || reduced ? undefined : tapScale.whileTap}
      onClick={() => {
        haptic('light');
        onClick?.();
      }}
      disabled={disabled || loading}
      className="hub-tile glass-btn relative flex flex-col items-center justify-between gap-1 p-2.5 sm:p-3 rounded-2xl disabled:opacity-40 disabled:cursor-not-allowed"
      style={{ borderColor: v.border, background: `linear-gradient(145deg, ${v.tint}, rgba(255,255,255,0.04))` }}
    >
      {showInfoHint && (
        <span className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-white/12 text-[10px] font-bold text-white/55 flex items-center justify-center ring-1 ring-white/10">
          i
        </span>
      )}
      {badge && (
        <motion.span
          animate={reduced ? {} : { scale: [1, 1.12, 1] }}
          transition={reduced ? undefined : { duration: 1.5, repeat: Infinity }}
          className="absolute top-1.5 left-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-reto-pink text-[10px] font-black flex items-center justify-center shadow-[0_0_12px_rgba(255,0,110,0.5)]"
        >
          {typeof badge === 'boolean' ? '!' : badge}
        </motion.span>
      )}
      <motion.div
        className="p-2 rounded-xl shrink-0"
        style={{ background: `linear-gradient(135deg, ${v.glow}, transparent)` }}
        animate={loading ? { rotate: 360 } : {}}
        transition={loading ? { duration: 1, repeat: Infinity, ease: 'linear' } : {}}
      >
        <AnimatedIcon icon={Icon} size={22} active={!!pulse || !!badge} pulse={pulse} className="text-white drop-shadow-lg" />
      </motion.div>
      <div className="flex flex-col items-center justify-end w-full min-h-0 flex-1 px-0.5">
        <span className="hub-tile-label text-xs font-semibold text-white text-center">{label}</span>
        <span className="hub-tile-sublabel text-[10px] text-white/55 text-center">{sublabel ?? ''}</span>
      </div>
    </motion.button>
  );
}
