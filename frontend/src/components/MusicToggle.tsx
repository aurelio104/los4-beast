import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Music2, VolumeX } from 'lucide-react';
import { getPreferences, setPreferences } from '../lib/preferences';

type MusicToggleProps = {
  size?: 'sm' | 'md';
  className?: string;
};

/** Toggle de música integrado en la barra — nunca flotante suelto. */
export function MusicToggle({ size = 'md', className = '' }: MusicToggleProps) {
  const [on, setOn] = useState(() => getPreferences().music);

  useEffect(() => {
    const sync = () => setOn(getPreferences().music);
    window.addEventListener('reto-prefs', sync);
    return () => window.removeEventListener('reto-prefs', sync);
  }, []);

  const toggle = () => {
    const next = !getPreferences().music;
    setPreferences({ music: next });
    setOn(next);
  };

  const dim = size === 'sm' ? 16 : 18;
  const pad = size === 'sm' ? 'p-2' : 'p-2.5';

  return (
    <motion.button
      type="button"
      onClick={toggle}
      whileTap={{ scale: 0.92 }}
      aria-label={on ? 'Silenciar música' : 'Activar música'}
      title={on ? 'Música ON' : 'Música OFF'}
      className={`${pad} rounded-xl glass-btn shrink-0 ${on ? 'text-reto-cyan ring-1 ring-reto-cyan/30' : 'text-white/45'} ${className}`}
    >
      {on ? <Music2 size={dim} strokeWidth={2} /> : <VolumeX size={dim} strokeWidth={2} />}
    </motion.button>
  );
}
