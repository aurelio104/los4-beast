import { getPreferences } from './preferences';

export function haptic(type: 'light' | 'medium' | 'heavy' | 'success' | 'error' = 'light') {
  if (!getPreferences().haptics) return;
  if (!('vibrate' in navigator)) return;

  const patterns: Record<string, number | number[]> = {
    light: 8,
    medium: 20,
    heavy: 40,
    success: [10, 50, 15],
    error: [30, 40, 30]
  };
  try {
    navigator.vibrate(patterns[type]);
  } catch {
    /* silent */
  }
}
