import confetti from 'canvas-confetti';
import { playWinSound, playLoseSound, playCoinSound, playAlertSound } from './sounds';
import { isSoundEnabled } from './preferences';
import { haptic } from './haptics';

export function celebrateWin(points: number) {
  if (points > 0) {
    if (isSoundEnabled()) playWinSound();
    haptic('success');
    const count = Math.min(150, 40 + points);
    confetti({
      particleCount: count,
      spread: 80,
      origin: { y: 0.65 },
      colors: ['#ff006e', '#8338ec', '#ffbe0b', '#06d6a0']
    });
    if (points >= 100) {
      setTimeout(() => {
        confetti({ particleCount: 50, angle: 60, spread: 55, origin: { x: 0, y: 0.7 } });
        confetti({ particleCount: 50, angle: 120, spread: 55, origin: { x: 1, y: 0.7 } });
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
  confetti({ particleCount: 30, spread: 50, origin: { y: 0.7 }, colors: ['#ffbe0b'] });
}

export function celebrateBetrayal() {
  if (isSoundEnabled()) playAlertSound();
  haptic('heavy');
  confetti({ particleCount: 40, spread: 100, origin: { y: 0.5 }, colors: ['#ef233c', '#ff006e'] });
}

export function celebrateChest() {
  if (isSoundEnabled()) playWinSound();
  haptic('success');
  confetti({ particleCount: 100, spread: 120, origin: { y: 0.5 }, ticks: 200 });
}
