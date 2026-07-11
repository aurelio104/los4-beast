import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { getPreferences } from '../lib/preferences';

interface AnimatedIconProps {
  icon: LucideIcon;
  size?: number;
  active?: boolean;
  pulse?: boolean;
  className?: string;
}

export function AnimatedIcon({ icon: Icon, size = 28, active, pulse, className = '' }: AnimatedIconProps) {
  const reduced = getPreferences().reducedMotion;

  if (reduced) {
    return <Icon size={size} className={className} strokeWidth={1.8} />;
  }

  return (
    <motion.div
      animate={
        pulse || active
          ? { scale: [1, 1.12, 1], rotate: active ? [0, -5, 5, 0] : 0 }
          : { scale: 1 }
      }
      transition={{ duration: 2, repeat: pulse || active ? Infinity : 0, ease: 'easeInOut' }}
      className={active ? 'drop-shadow-[0_0_12px_rgba(255,0,110,0.6)]' : ''}
    >
      <Icon size={size} className={className} strokeWidth={1.8} />
    </motion.div>
  );
}
