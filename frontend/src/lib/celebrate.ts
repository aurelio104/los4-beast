import { playWinSound, playLoseSound, playCoinSound, playAlertSound } from './sounds';
import { getPreferences, isSoundEnabled } from './preferences';
import { haptic } from './haptics';

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return getPreferences().reducedMotion || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

async function fireConfetti(options: import('canvas-confetti').Options) {
  if (prefersReducedMotion()) return;
  const { default: fire } = await import('canvas-confetti');
  fire(options);
}

export function celebrateWin(points: number) {
  if (points > 0) {
    if (isSoundEnabled()) playWinSound();
    haptic('success');
    const count = Math.min(120, 32 + points);
    void fireConfetti({
      particleCount: count,
      spread: 80,
      origin: { y: 0.65 },
      colors: ['#ff006e', '#8338ec', '#ffbe0b', '#06d6a0'],
      disableForReducedMotion: true
    });
    if (points >= 100) {
      setTimeout(() => {
        void fireConfetti({ particleCount: 40, angle: 60, spread: 55, origin: { x: 0, y: 0.7 }, disableForReducedMotion: true });
        void fireConfetti({ particleCount: 40, angle: 120, spread: 55, origin: { x: 1, y: 0.7 }, disableForReducedMotion: true });
      }, 200);
    }
  } else {
    if (isSoundEnabled()) playLoseSound();
    haptic('error');
  }
}

export function celebrateCoin() {
  if (isSoundEnabled()) playCoinSound();
  haptic('medium');
  void fireConfetti({ particleCount: 24, spread: 50, origin: { y: 0.7 }, colors: ['#ffbe0b'], disableForReducedMotion: true });
}

export function celebrateBetrayal() {
  if (isSoundEnabled()) playAlertSound();
  haptic('heavy');
  void fireConfetti({ particleCount: 32, spread: 100, origin: { y: 0.5 }, colors: ['#ef233c', '#ff006e'], disableForReducedMotion: true });
}

export function celebrateChest() {
  if (isSoundEnabled()) playWinSound();
  haptic('success');
  void fireConfetti({ particleCount: 80, spread: 120, origin: { y: 0.5 }, ticks: 180, disableForReducedMotion: true });
}
