import { motion, HTMLMotionProps } from 'framer-motion';
import { ReactNode, HTMLAttributes } from 'react';
import { useReducedMotion } from '../hooks/useReducedMotion';

interface GlassCardProps extends HTMLMotionProps<'div'> {
  children: ReactNode;
  strong?: boolean;
  glow?: 'pink' | 'purple' | 'gold' | 'cyan';
  className?: string;
  /** Sin animación de entrada (listas largas). */
  static?: boolean;
}

const glowColors = {
  pink: 'rgba(255, 0, 110, 0.2)',
  purple: 'rgba(131, 56, 236, 0.2)',
  gold: 'rgba(255, 190, 11, 0.2)',
  cyan: 'rgba(6, 214, 160, 0.2)'
};

export function GlassCard({ children, strong, glow, className = '', static: isStatic, ...props }: GlassCardProps) {
  const reducedMotion = useReducedMotion();
  const skipMotion = isStatic || reducedMotion;
  const boxStyle = glow ? { boxShadow: `0 16px 48px ${glowColors[glow]}, inset 0 1px 0 rgba(255,255,255,0.15)` } : undefined;
  const cls = `rounded-3xl perf-card ${strong ? 'glass-strong' : 'glass'} ${className}`;

  if (skipMotion) {
    return (
      <div className={cls} style={boxStyle} {...(props as HTMLAttributes<HTMLDivElement>)}>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.34, 1.2, 0.64, 1] }}
      className={cls}
      style={boxStyle}
      {...props}
    >
      {children}
    </motion.div>
  );
}
