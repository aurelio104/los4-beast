import type { Transition, Variants } from 'framer-motion';

export const EASE_SPRING = [0.34, 1.2, 0.64, 1] as const;
export const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

export const DURATION = {
  fast: 0.2,
  normal: 0.35,
  slow: 0.6
} as const;

export const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 8 }
};

export const fadeUpTransition: Transition = {
  duration: DURATION.normal,
  ease: EASE_SPRING
};

export const scaleIn = {
  initial: { opacity: 0, scale: 0.92 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.96 }
};

export const scaleInTransition: Transition = {
  duration: DURATION.fast,
  ease: EASE_OUT_EXPO
};

export const slideSheet = {
  initial: { y: '100%', opacity: 0.6 },
  animate: { y: 0, opacity: 1 },
  exit: { y: '100%', opacity: 0 }
};

export const slideSheetTransition: Transition = {
  type: 'spring',
  stiffness: 380,
  damping: 36
};

export const pageTransition = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 }
};

export const pageTransitionConfig: Transition = {
  duration: DURATION.fast,
  ease: EASE_OUT_EXPO
};

export const overlayFade = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 }
};

export const overlayTransition: Transition = {
  duration: DURATION.fast
};

export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05, delayChildren: 0.02 }
  }
};

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: DURATION.normal, ease: EASE_SPRING }
  }
};

export const glowPulse = {
  animate: {
    boxShadow: [
      '0 0 20px rgba(255, 0, 110, 0.25)',
      '0 0 36px rgba(131, 56, 236, 0.45)',
      '0 0 20px rgba(255, 0, 110, 0.25)'
    ]
  },
  transition: { duration: 2.5, repeat: Infinity, ease: 'easeInOut' }
};

export const tapScale = { whileTap: { scale: 0.97 }, whileHover: { scale: 1.02, y: -2 } };
