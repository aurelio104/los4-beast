import { isSoundEnabled } from './preferences';

let audioCtx: AudioContext | null = null;

function getCtx() {
  if (!audioCtx) audioCtx = new AudioContext();
  return audioCtx;
}

function tone(freq: number, duration: number, type: OscillatorType = 'sine', gain = 0.08) {
  if (!isSoundEnabled()) return;
  try {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.value = gain;
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start();
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.stop(ctx.currentTime + duration);
  } catch { /* silent */ }
}

export function playWinSound() {
  tone(523, 0.1);
  setTimeout(() => tone(659, 0.1), 80);
  setTimeout(() => tone(784, 0.15), 160);
}

export function playLoseSound() {
  tone(200, 0.2, 'sawtooth', 0.05);
  setTimeout(() => tone(150, 0.3, 'sawtooth', 0.04), 100);
}

export function playClickSound() {
  tone(800, 0.05, 'square', 0.03);
}

export function playCoinSound() {
  tone(1200, 0.08, 'triangle', 0.06);
  setTimeout(() => tone(900, 0.1, 'triangle', 0.05), 60);
}

export function playAlertSound() {
  tone(440, 0.15, 'sine', 0.1);
  setTimeout(() => tone(440, 0.15, 'sine', 0.1), 200);
}
