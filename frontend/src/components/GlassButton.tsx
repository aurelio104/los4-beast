import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { AnimatedIcon } from './AnimatedIcon';
import { haptic } from '../lib/haptics';

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
  default: { border: 'rgba(255,255,255,0.15)', glow: 'rgba(131, 56, 236, 0.3)' },
  danger: { border: 'rgba(239, 35, 60, 0.4)', glow: 'rgba(239, 35, 60, 0.35)' },
  gold: { border: 'rgba(255, 190, 11, 0.4)', glow: 'rgba(255, 190, 11, 0.35)' },
  success: { border: 'rgba(6, 214, 160, 0.4)', glow: 'rgba(6, 214, 160, 0.35)' }
};

export function GlassButton({ icon: Icon, label, sublabel, onClick, disabled, variant = 'default', loading, showInfoHint, badge, pulse }: GlassButtonProps) {
  const v = variants[variant];
  return (
    <motion.button
      whileHover={disabled ? {} : { scale: 1.03, y: -3 }}
      whileTap={disabled ? {} : { scale: 0.97 }}
      onClick={() => { haptic('light'); onClick?.(); }}
      disabled={disabled || loading}
      className="glass-btn relative flex flex-col items-center justify-center gap-2 p-4 rounded-2xl min-h-[100px] disabled:opacity-40 disabled:cursor-not-allowed"
      style={{ borderColor: v.border }}
      onHoverStart={() => {}}
    >
      {showInfoHint && (
        <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-white/10 text-[10px] font-bold text-white/50 flex items-center justify-center">
          i
        </span>
      )}
      {badge && (
        <span className="absolute top-2 left-2 min-w-[18px] h-[18px] px-1 rounded-full bg-beast-pink text-[10px] font-black flex items-center justify-center animate-pulse">
          {typeof badge === 'boolean' ? '!' : badge}
        </span>
      )}
      <motion.div
        className="p-3 rounded-2xl"
        style={{ background: `linear-gradient(135deg, ${v.glow}, transparent)` }}
        animate={loading ? { rotate: 360 } : {}}
        transition={loading ? { duration: 1, repeat: Infinity, ease: 'linear' } : {}}
      >
        <AnimatedIcon icon={Icon} active={!!pulse || !!badge} pulse={pulse} className="text-white drop-shadow-lg" />
      </motion.div>
      <span className="text-sm font-semibold text-white text-center leading-tight">{label}</span>
      {sublabel && <span className="text-[10px] text-white/50 text-center">{sublabel}</span>}
    </motion.button>
  );
}
