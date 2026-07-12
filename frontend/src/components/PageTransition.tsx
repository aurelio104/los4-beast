import { ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { pageTransition, pageTransitionConfig } from '../lib/motion';
import { useReducedMotion } from '../hooks/useReducedMotion';

export function PageTransition({ children }: { children: ReactNode }) {
  const location = useLocation();
  const reducedMotion = useReducedMotion();

  if (reducedMotion) {
    return <div className="page-transition-shell">{children}</div>;
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={pageTransition.initial}
        animate={{ opacity: 1, transform: 'none' }}
        exit={pageTransition.exit}
        transition={pageTransitionConfig}
        className="page-transition-shell"
        style={{ transform: 'none' }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
