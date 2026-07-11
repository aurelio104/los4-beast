import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CHALLENGE_DATE } from '../types';

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function FlipUnit({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative">
        <motion.div
          key={value}
          initial={{ rotateX: -90, opacity: 0 }}
          animate={{ rotateX: 0, opacity: 1 }}
          exit={{ rotateX: 90, opacity: 0 }}
          transition={{ duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
          className="glass-strong w-[72px] h-[88px] sm:w-[80px] sm:h-[96px] rounded-2xl flex items-center justify-center"
          style={{ perspective: '400px' }}
        >
          <span className="text-4xl sm:text-5xl font-black gradient-text tabular-nums">{value}</span>
        </motion.div>
        <div className="absolute inset-x-0 top-1/2 h-px bg-white/10" />
      </div>
      <span className="text-[10px] sm:text-xs uppercase tracking-[0.2em] text-white/40 font-medium">{label}</span>
    </div>
  );
}

export function CountdownTimer() {
  const [time, setTime] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const start = new Date('2026-07-11T00:00:00-04:00').getTime();
    const end = CHALLENGE_DATE.getTime();
    const total = end - start;

    const tick = () => {
      const now = Date.now();
      const diff = Math.max(0, end - now);
      setTime({
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000)
      });
      setProgress(Math.min(100, ((now - start) / total) * 100));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const units = [
    { value: pad(time.days), label: 'Días' },
    { value: pad(time.hours), label: 'Hrs' },
    { value: pad(time.minutes), label: 'Min' },
    { value: pad(time.seconds), label: 'Seg' }
  ];

  return (
    <div className="w-full">
      <div className="flex justify-center gap-3 sm:gap-4">
        <AnimatePresence mode="popLayout">
          {units.map((u) => (
            <FlipUnit key={u.label} value={u.value} label={u.label} />
          ))}
        </AnimatePresence>
      </div>
      <div className="mt-6 px-2">
        <div className="flex justify-between text-[10px] text-white/40 mb-2 uppercase tracking-wider">
          <span>Camino al reto</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="h-2 rounded-full bg-white/5 overflow-hidden">
          <motion.div
            className="h-full rounded-full shimmer-bar"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
          />
        </div>
      </div>
    </div>
  );
}
