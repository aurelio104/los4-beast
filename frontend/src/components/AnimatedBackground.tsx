import { motion } from 'framer-motion';
import { useReducedMotion } from '../hooks/useReducedMotion';

const orbs = [
  { color: '#ff006e', size: 420, x: '10%', y: '15%', delay: 0 },
  { color: '#8338ec', size: 380, x: '70%', y: '10%', delay: 2 },
  { color: '#ffbe0b', size: 300, x: '50%', y: '60%', delay: 4 },
  { color: '#06d6a0', size: 260, x: '85%', y: '70%', delay: 1 },
  { color: '#ef233c', size: 200, x: '5%', y: '75%', delay: 3 }
];

export function AnimatedBackground() {
  const reduced = useReducedMotion();

  if (reduced) {
    return <div className="app-shell-static" aria-hidden />;
  }

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none contain-strict" style={{ zIndex: 0 }}>
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at 50% 0%, #1a0a2e 0%, #0a0510 40%, #050508 100%)'
        }}
      />
      <div
        className="absolute inset-0 opacity-70"
        style={{
          background: `
            radial-gradient(ellipse 80% 50% at 20% 30%, rgba(255, 0, 110, 0.12) 0%, transparent 55%),
            radial-gradient(ellipse 60% 45% at 80% 20%, rgba(131, 56, 236, 0.14) 0%, transparent 50%),
            radial-gradient(ellipse 50% 40% at 60% 80%, rgba(255, 190, 11, 0.1) 0%, transparent 45%),
            radial-gradient(ellipse 40% 35% at 10% 70%, rgba(6, 214, 160, 0.08) 0%, transparent 40%)
          `,
          animation: 'mesh-pulse 8s ease-in-out infinite'
        }}
      />
      {orbs.map((orb, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full will-change-transform"
          style={{
            width: orb.size,
            height: orb.size,
            left: orb.x,
            top: orb.y,
            background: `radial-gradient(circle, ${orb.color}70 0%, ${orb.color}30 40%, transparent 70%)`,
            filter: 'blur(60px)',
            animation: `float ${8 + i * 2}s ease-in-out infinite`,
            animationDelay: `${orb.delay}s`
          }}
          animate={{
            scale: [1, 1.18, 0.92, 1],
            opacity: [0.55, 0.9, 0.45, 0.55]
          }}
          transition={{ duration: 6 + i, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}
      <div
        className="absolute inset-0 opacity-35"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
          animation: 'grid-drift 24s linear infinite'
        }}
      />
    </div>
  );
}
