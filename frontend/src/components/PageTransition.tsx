import { ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { pageTransition, pageTransitionConfig } from '../lib/motion';
import { useReducedMotion } from '../hooks/useReducedMotion';

export function PageTransition({ children }: { children: ReactNode }) {
  const location = useLocation();
  const reducedMotion = useReducedMotion();

  if (reducedMotion) {
    return <div className="min-h-dvh">{children}</div>;
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={pageTransition.initial}
        animate={pageTransition.animate}
        exit={pageTransition.exit}
        transition={pageTransitionConfig}
        className="min-h-dvh"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
