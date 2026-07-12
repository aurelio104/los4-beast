import { motion, HTMLMotionProps } from 'framer-motion';
import { ReactNode, HTMLAttributes } from 'react';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { fadeUp, fadeUpTransition } from '../lib/motion';

interface GlassCardProps extends HTMLMotionProps<'div'> {
  children: ReactNode;
  strong?: boolean;
  glow?: 'pink' | 'purple' | 'gold' | 'cyan';
  accent?: boolean;
  interactive?: boolean;
  className?: string;
  /** Sin animación de entrada (listas largas). */
  static?: boolean;
}

const glowColors = {
  pink: 'rgba(255, 0, 110, 0.28)',
  purple: 'rgba(131, 56, 236, 0.28)',
  gold: 'rgba(255, 190, 11, 0.28)',
  cyan: 'rgba(6, 214, 160, 0.28)'
};

export function GlassCard({
  children,
  strong,
  glow,
  accent,
  interactive,
  className = '',
  static: isStatic,
  ...props
}: GlassCardProps) {
  const reducedMotion = useReducedMotion();
  const skipMotion = isStatic || reducedMotion;
  const boxStyle = glow
    ? { boxShadow: `0 16px 48px ${glowColors[glow]}, 0 0 24px ${glowColors[glow]}, inset 0 1px 0 rgba(255,255,255,0.18)` }
    : undefined;
  const cls = [
    'rounded-3xl perf-card',
    strong ? 'glass-strong' : 'glass',
    accent ? 'glass-accent' : '',
    interactive ? 'glass-interactive cursor-pointer' : '',
    className
  ]
    .filter(Boolean)
    .join(' ');

  if (skipMotion) {
    return (
      <div className={cls} style={boxStyle} {...(props as HTMLAttributes<HTMLDivElement>)}>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      initial={fadeUp.initial}
      animate={fadeUp.animate}
      transition={fadeUpTransition}
      whileHover={interactive ? { y: -2 } : undefined}
      className={cls}
      style={boxStyle}
      {...props}
    >
      {children}
    </motion.div>
  );
}
