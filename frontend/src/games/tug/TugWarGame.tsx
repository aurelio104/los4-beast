import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CircleCheck, CircleX, Swords, Timer, Zap } from 'lucide-react';
import { playClickSound, playLoseSound, playWinSound } from '../../lib/sounds';
import { haptic } from '../../lib/haptics';

const DURATION = 10;
const COUNTDOWN = 3;
const TIP_KEY = 'reto_tug_tip_seen';
const PULL_CAP = 75;

export type TugWarGameProps = {
  onFinish: (taps: number) => void;
  onBack: () => void;
};

type Phase = 'intro' | 'countdown' | 'play' | 'result';
type Floater = { id: number; label: string };

function scoreLabel(taps: number, bp: number): { title: string; tone: 'low' | 'ok' | 'great' } {
  if (taps <= 0) return { title: 'Sin tirones', tone: 'low' };
  if (bp < 8) return { title: 'Tirón flojo', tone: 'low' };
  if (bp < 20) return { title: 'Buen ritmo', tone: 'ok' };
  if (bp < 40) return { title: 'Fuerza total', tone: 'great' };
  return { title: 'Dominio absoluto', tone: 'great' };
}

export default function TugWarGame({ onFinish, onBack }: TugWarGameProps) {
  const [phase, setPhase] = useState<Phase>('intro');
  const [count, setCount] = useState(COUNTDOWN);
  const [taps, setTaps] = useState(0);
  const [timeLeft, setTimeLeft] = useState(DURATION);
  const [pulse, setPulse] = useState(0);
  const [shake, setShake] = useState(0);
  const [floaters, setFloaters] = useState<Floater[]>([]);
  const [comboFlash, setComboFlash] = useState(0);
  const [showTip, setShowTip] = useState(() => {
    try {
      return sessionStorage.getItem(TIP_KEY) !== '1';
    } catch {
      return true;
    }
  });

  const finishedRef = useRef(false);
  const tapsRef = useRef(0);
  const floaterId = useRef(0);
  const onFinishRef = useRef(onFinish);
  onFinishRef.current = onFinish;
  tapsRef.current = taps;

  const dismissTip = () => {
    setShowTip(false);
    try {
      sessionStorage.setItem(TIP_KEY, '1');
    } catch {
      /* ignore */
    }
  };

  const start = () => {
    dismissTip();
    playClickSound();
    haptic('medium');
    setCount(COUNTDOWN);
    setPhase('countdown');
  };

  useEffect(() => {
    if (phase !== 'countdown') return;
    if (count > 0) {
      const id = window.setTimeout(() => setCount((c) => c - 1), 750);
      return () => window.clearTimeout(id);
    }
    const id = window.setTimeout(() => {
      setPhase('play');
      setTimeLeft(DURATION);
      playClickSound();
      haptic('success');
    }, 520);
    return () => window.clearTimeout(id);
  }, [phase, count]);

  useEffect(() => {
    if (phase !== 'play' || finishedRef.current) return;
    if (timeLeft <= 0) {
      finishedRef.current = true;
      const finalTaps = tapsRef.current;
      const bp = Math.min(150, Math.floor(finalTaps / 3));
      setPhase('result');
      if (bp > 0) {
        playWinSound();
        haptic('success');
      } else {
        playLoseSound();
        haptic('medium');
      }
      window.setTimeout(() => onFinishRef.current(finalTaps), 2400);
      return;
    }
    const id = window.setTimeout(() => setTimeLeft((t) => t - 1), 1000);
    return () => window.clearTimeout(id);
  }, [phase, timeLeft]);

  const tap = () => {
    if (phase !== 'play') return;
    const next = tapsRef.current + 1;
    tapsRef.current = next;
    setTaps(next);
    setPulse((p) => p + 1);
    setShake((s) => s + 1);
    playClickSound();
    if (next % 3 === 0) {
      haptic('medium');
      setComboFlash((c) => c + 1);
      const id = ++floaterId.current;
      setFloaters((f) => [...f.slice(-4), { id, label: '+1 BP' }]);
      window.setTimeout(() => setFloaters((f) => f.filter((x) => x.id !== id)), 700);
    } else {
      haptic('light');
    }
  };

  const bp = Math.min(150, Math.floor(taps / 3));
  const pullPct = Math.min(100, (taps / PULL_CAP) * 100);
  const timePct = Math.max(0, (timeLeft / DURATION) * 100);
  const urgent = phase === 'play' && timeLeft <= 3;
  const ringR = 50;
  const ringC = 2 * Math.PI * ringR;
  const ringOffset =
    phase === 'play' ? ringC * (1 - timeLeft / DURATION) : phase === 'result' ? 0 : ringC;
  const result = scoreLabel(taps, bp);
  const countdownLabel = count > 0 ? String(count) : 'YA';
  const powerPct = Math.min(100, (bp / 50) * 100);

  return (
    <div className={`game-tug game-tug--${phase}${urgent ? ' is-urgent' : ''}`}>
      <div className="game-tug__aura" aria-hidden />

      <p className="game-tug__eyebrow">Tug of War</p>
      <p className="game-tug__title">Tira la cuerda</p>

      <AnimatePresence>
        {showTip && phase === 'intro' && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="game-tug__tip"
          >
            <Swords size={16} className="text-reto-pink shrink-0" />
            <span>10 segundos de frenesí. Cada 3 taps = 1 BP (máx. 150).</span>
            <button type="button" onClick={dismissTip} className="game-tug__tip-ok">
              Ok
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {(phase === 'play' || phase === 'result') && (
        <>
          <div className={`game-tug__hud ${urgent ? 'is-urgent' : ''}`}>
            <div className="game-tug__stat">
              <Timer size={14} />
              <motion.span
                key={phase === 'play' ? timeLeft : 'end'}
                initial={{ scale: 1.25 }}
                animate={{ scale: 1 }}
                className="game-tug__time"
              >
                {phase === 'play' ? timeLeft : 0}s
              </motion.span>
            </div>
            <div className="game-tug__stat game-tug__stat--gold">
              <Zap size={14} />
              <span>{taps}</span>
            </div>
            <div className="game-tug__stat game-tug__stat--cyan">
              <span>{bp} BP</span>
            </div>
          </div>
          <div className="game-tug__timerbar" aria-hidden>
            <motion.div
              className={`game-tug__timerfill ${urgent ? 'is-urgent' : ''}`}
              animate={{ width: `${phase === 'play' ? timePct : 0}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </>
      )}

      {/* Cuerda épica */}
      <div className={`game-tug__arena ${phase === 'play' ? 'is-live' : ''} ${phase === 'result' ? 'is-settled' : ''}`} aria-hidden>
        <div className="game-tug__grip game-tug__grip--you">
          <span className="game-tug__grip-disc" />
          <span className="game-tug__grip-bar" />
          <span className="game-tug__grip-label">Tú</span>
        </div>

        <motion.div
          key={shake}
          className="game-tug__ropeway"
          animate={
            phase === 'play' && shake > 0
              ? { x: [0, -4, 4, -2, 0], y: [0, -1, 1, 0] }
              : { x: 0, y: 0 }
          }
          transition={{ duration: 0.16 }}
        >
          <div className="game-tug__rope-body">
            <span className="game-tug__rope-glow" />
            <span className="game-tug__rope-twist" />
            <span className="game-tug__rope-fill" style={{ width: `${pullPct}%` }} />
            <motion.div
              className="game-tug__marker"
              animate={{ left: `${6 + pullPct * 0.88}%` }}
              transition={{ type: 'spring', stiffness: 400, damping: 24 }}
            >
              <span className="game-tug__marker-core" />
            </motion.div>
          </div>
        </motion.div>

        <div className="game-tug__grip game-tug__grip--foe">
          <span className="game-tug__grip-disc" />
          <span className="game-tug__grip-bar" />
          <span className="game-tug__grip-label">Arena</span>
        </div>
      </div>

      <div className="game-tug__stage-wrap">
        <AnimatePresence mode="wait">
          {phase === 'intro' && (
            <motion.div
              key="intro"
              className="game-tug__panel"
              initial={{ opacity: 0, scale: 0.94, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96 }}
            >
              <div className="game-tug__intro-orb" aria-hidden>
                <span className="game-tug__intro-ring" />
                <span className="game-tug__intro-ring game-tug__intro-ring--2" />
                <Swords size={34} />
              </div>
              <p className="game-tug__intro-text">Prepárate. Cuando diga YA, toca sin parar.</p>
              <button type="button" className="game-tug__start" onClick={start}>
                Empezar
              </button>
            </motion.div>
          )}

          {phase === 'countdown' && (
            <motion.div
              key={`cd-${countdownLabel}`}
              className="game-tug__countdown"
              initial={{ scale: 0.35, opacity: 0, rotate: -8 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              exit={{ scale: 1.4, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 340, damping: 16 }}
            >
              <span className="game-tug__countdown-ring" aria-hidden />
              <span className="game-tug__countdown-num">{countdownLabel}</span>
            </motion.div>
          )}

          {(phase === 'play' || phase === 'result') && (
            <motion.div
              key="play"
              className={`game-tug__pad ${phase === 'play' ? 'is-active' : ''} ${phase === 'result' ? `is-result is-result--${result.tone}` : ''}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onPointerDown={
                phase === 'play'
                  ? (e) => {
                      e.preventDefault();
                      tap();
                    }
                  : undefined
              }
            >
              <div className="game-tug__stage">
                <span className="game-tug__halo game-tug__halo--a" aria-hidden />
                <span className="game-tug__halo game-tug__halo--b" aria-hidden />

                <svg className="game-tug__ring" viewBox="0 0 120 120" aria-hidden>
                  <defs>
                    <linearGradient id="tugRing" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#ff4d8d" />
                      <stop offset="50%" stopColor="#ffd60a" />
                      <stop offset="100%" stopColor="#00e5ff" />
                    </linearGradient>
                  </defs>
                  <circle className="game-tug__ring-bg" cx="60" cy="60" r={ringR} />
                  <circle
                    className={`game-tug__ring-fg ${urgent ? 'is-urgent' : ''} ${phase === 'result' && bp > 0 ? 'is-win' : ''}`}
                    cx="60"
                    cy="60"
                    r={ringR}
                    stroke="url(#tugRing)"
                    strokeDasharray={ringC}
                    strokeDashoffset={ringOffset}
                    transform="rotate(-90 60 60)"
                  />
                </svg>

                <div
                  className={`game-tug__btn ${urgent ? 'is-urgent' : ''} ${phase === 'result' ? (bp > 0 ? 'is-done' : 'is-fail') : ''}`}
                  aria-hidden
                >
                  <span className="game-tug__btn-sheen" />
                  <span className="game-tug__btn-hex" />
                  <AnimatePresence>
                    {pulse > 0 && phase === 'play' && (
                      <motion.span
                        key={pulse}
                        className="game-tug__ripple"
                        initial={{ scale: 0.5, opacity: 0.7 }}
                        animate={{ scale: 1.85, opacity: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.34 }}
                      />
                    )}
                  </AnimatePresence>

                  {phase === 'result' ? (
                    <div className="game-tug__score">
                      <span className="game-tug__score-bp">{bp}</span>
                      <span className="game-tug__score-unit">BP</span>
                    </div>
                  ) : (
                    <span className="game-tug__btn-label">Tira</span>
                  )}
                </div>

                <AnimatePresence>
                  {floaters.map((f) => (
                    <motion.span
                      key={f.id}
                      className="game-tug__floater"
                      initial={{ opacity: 0, y: 10, scale: 0.75 }}
                      animate={{ opacity: 1, y: -56, scale: 1.05 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.7 }}
                    >
                      {f.label}
                    </motion.span>
                  ))}
                </AnimatePresence>

                {comboFlash > 0 && phase === 'play' && (
                  <motion.div
                    key={comboFlash}
                    className="game-tug__combo"
                    initial={{ opacity: 0, scale: 0.7 }}
                    animate={{ opacity: [0, 1, 0], scale: [0.7, 1.15, 1.25] }}
                    transition={{ duration: 0.48 }}
                  >
                    Combo
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {phase !== 'result' && (
        <p className="game-tug__hint">
          {phase === 'intro' && 'Pulsa Empezar cuando estés listo'}
          {phase === 'countdown' && (count > 0 ? 'Prepárate…' : '¡Ahora!')}
          {phase === 'play' && (urgent ? '¡Últimos segundos!' : 'Toca en cualquier parte del área')}
        </p>
      )}

      <AnimatePresence>
        {phase === 'result' && (
          <motion.div
            className={`game-tug__result game-tug__result--${result.tone}`}
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="game-tug__result-icon">
              {result.tone === 'low' ? <CircleX size={22} /> : <CircleCheck size={22} />}
            </div>
            <div className="game-tug__result-body">
              <p className="game-tug__result-title">{result.title}</p>
              <p className="game-tug__result-meta">
                {taps} taps · {bp} BP
              </p>
              <div className="game-tug__power" aria-hidden>
                <motion.div
                  className="game-tug__power-fill"
                  initial={{ width: 0 }}
                  animate={{ width: `${powerPct}%` }}
                  transition={{ duration: 0.7, ease: 'easeOut' }}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        type="button"
        onClick={onBack}
        className="game-tug__exit"
        disabled={phase === 'countdown' || phase === 'play' || phase === 'result'}
      >
        Salir
      </button>
    </div>
  );
}
