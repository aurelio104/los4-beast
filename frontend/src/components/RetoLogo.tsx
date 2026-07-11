import { motion } from 'framer-motion';

const SIZES = {
  xs: 'w-6 h-6',
  sm: 'w-8 h-8',
  md: 'w-10 h-10',
  lg: 'w-14 h-14',
  xl: 'w-20 h-20',
  hero: 'w-[clamp(4rem,18vw,5.5rem)] h-[clamp(4rem,18vw,5.5rem)]'
} as const;

type RetoLogoProps = {
  size?: keyof typeof SIZES;
  className?: string;
  animate?: boolean;
  glow?: boolean;
};

export function RetoLogo({ size = 'md', className = '', animate = false, glow = false }: RetoLogoProps) {
  const img = (
    <img
      src="/logoR.png"
      alt="Reto"
      className={`${SIZES[size]} object-contain select-none ${glow ? 'drop-shadow-[0_0_20px_rgba(131,56,236,0.55)]' : ''} ${className}`}
      draggable={false}
    />
  );

  if (!animate) return img;

  return (
    <motion.div
      animate={{ scale: [1, 1.04, 1], rotate: [0, 2, -2, 0] }}
      transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
      className="inline-flex"
    >
      {img}
    </motion.div>
  );
}
