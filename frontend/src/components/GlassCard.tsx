import { motion, HTMLMotionProps } from 'framer-motion';
import { ReactNode } from 'react';

interface GlassCardProps extends HTMLMotionProps<'div'> {
  children: ReactNode;
  strong?: boolean;
  glow?: 'pink' | 'purple' | 'gold' | 'cyan';
  className?: string;
}

const glowColors = {
  pink: 'rgba(255, 0, 110, 0.2)',
  purple: 'rgba(131, 56, 236, 0.2)',
  gold: 'rgba(255, 190, 11, 0.2)',
  cyan: 'rgba(6, 214, 160, 0.2)'
};

export function GlassCard({ children, strong, glow, className = '', ...props }: GlassCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
      className={`rounded-3xl ${strong ? 'glass-strong' : 'glass'} ${className}`}
      style={glow ? { boxShadow: `0 16px 48px ${glowColors[glow]}, inset 0 1px 0 rgba(255,255,255,0.15)` } : undefined}
      {...props}
    >
      {children}
    </motion.div>
  );
}
