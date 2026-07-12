import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CHALLENGE_DATE } from '../types';
import { fadeUpTransition } from '../lib/motion';

function pad(n: number) {
  return String(n).padStart(2, '0');
}

type UnitTone = 'gold' | 'pink' | 'purple' | 'cyan';

function FlipUnit({
  value,
  label,
  tone,
  urgent
}: {
  value: string;
  label: string;
  tone: UnitTone;
  urgent?: boolean;
}) {
  return (
    <div className={`countdown-unit countdown-unit--${tone}`}>
      <div className="relative w-full">
        <motion.div
          key={value}
          initial={{ rotateX: -90, opacity: 0 }}
          animate={{ rotateX: 0, opacity: 1 }}
          exit={{ rotateX: 90, opacity: 0 }}
          transition={fadeUpTransition}
          className={`countdown-unit-box flex items-center justify-center mx-auto ${urgent ? 'countdown-urgent' : ''}`}
          style={{ perspective: '400px' }}
        >
          <span className="countdown-unit-digit font-black tabular-nums">{value}</span>
        </motion.div>
        <div className="countdown-unit-split" aria-hidden />
      </div>
      <span className="countdown-unit-label">{label}</span>
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

  const urgent = time.days === 0 && time.hours === 0 && time.minutes < 10;

  const units: { value: string; label: string; tone: UnitTone }[] = [
    { value: pad(time.days), label: 'Días', tone: 'gold' },
    { value: pad(time.hours), label: 'Hrs', tone: 'pink' },
    { value: pad(time.minutes), label: 'Min', tone: 'purple' },
    { value: pad(time.seconds), label: 'Seg', tone: 'cyan' }
  ];

  return (
    <div className="w-full min-w-0">
      <div className="countdown-row">
        <AnimatePresence mode="popLayout">
          {units.map((u) => (
            <FlipUnit key={u.label} value={u.value} label={u.label} tone={u.tone} urgent={urgent && u.tone === 'cyan'} />
          ))}
        </AnimatePresence>
      </div>
      <div className="countdown-progress mt-5 sm:mt-6 px-1">
        <div className="flex justify-between text-[10px] mb-2 uppercase tracking-wider">
          <span className="countdown-progress-label">Camino al reto</span>
          <span className="countdown-progress-pct">{Math.round(progress)}%</span>
        </div>
        <div className="countdown-progress-track">
          <motion.div
            className={`countdown-progress-fill ${urgent ? 'countdown-bar-urgent' : ''}`}
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
          />
        </div>
      </div>
    </div>
  );
}
