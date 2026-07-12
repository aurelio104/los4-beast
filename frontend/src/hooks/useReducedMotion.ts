import { useEffect, useState } from 'react';
import { getPreferences } from '../lib/preferences';

function computeReduced(): boolean {
  if (typeof window === 'undefined') return false;
  const system = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  return system || getPreferences().reducedMotion;
}

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(computeReduced);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(computeReduced());
    mq.addEventListener('change', update);
    window.addEventListener('reto-prefs', update);
    return () => {
      mq.removeEventListener('change', update);
      window.removeEventListener('reto-prefs', update);
    };
  }, []);

  return reduced;
}
