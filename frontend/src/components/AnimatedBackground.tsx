import { motion } from 'framer-motion';

const orbs = [
  { color: '#ff006e', size: 420, x: '10%', y: '15%', delay: 0 },
  { color: '#8338ec', size: 380, x: '70%', y: '10%', delay: 2 },
  { color: '#ffbe0b', size: 300, x: '50%', y: '60%', delay: 4 },
  { color: '#06d6a0', size: 260, x: '85%', y: '70%', delay: 1 },
  { color: '#ef233c', size: 200, x: '5%', y: '75%', delay: 3 }
];

export function AnimatedBackground() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 0 }}>
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at 50% 0%, #1a0a2e 0%, #0a0510 40%, #050508 100%)'
        }}
      />
      {orbs.map((orb, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            width: orb.size,
            height: orb.size,
            left: orb.x,
            top: orb.y,
            background: `radial-gradient(circle, ${orb.color}55 0%, ${orb.color}22 40%, transparent 70%)`,
            filter: 'blur(60px)',
            animation: `float ${8 + i * 2}s ease-in-out infinite`,
            animationDelay: `${orb.delay}s`
          }}
          animate={{
            scale: [1, 1.15, 0.9, 1],
            opacity: [0.5, 0.8, 0.4, 0.5]
          }}
          transition={{ duration: 6 + i, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px'
        }}
      />
    </div>
  );
}
