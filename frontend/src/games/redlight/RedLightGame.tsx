import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { AnimatePresence, motion } from 'framer-motion';
import { CircleCheck, CircleX, Hand, Loader2, OctagonAlert, Zap } from 'lucide-react';
import * as THREE from 'three';
import { playClickSound, playLoseSound, playWinSound } from '../../lib/sounds';
import { haptic } from '../../lib/haptics';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { RedLightScene, type LightColor } from './RedLightScene';

const GOAL = 10;
const WIN_BP = 80;
const LOSE_BP = -20;
const TIP_KEY = 'reto_redlight_tip_seen';

export type RedLightGameProps = {
  onFinish: (success: boolean) => void;
  onBack: () => void;
};

type Phase = 'ready' | 'play' | 'result' | 'done';

export default function RedLightGame({ onFinish, onBack }: RedLightGameProps) {
  const reducedMotion = useReducedMotion();
  const [phase, setPhase] = useState<Phase>('ready');
  const [countdown, setCountdown] = useState(3);
  const [light, setLight] = useState<LightColor>('green');
  const [score, setScore] = useState(0);
  const [burstKey, setBurstKey] = useState(0);
  const [won, setWon] = useState<boolean | null>(null);
  const [flash, setFlash] = useState(false);
  const [showTip, setShowTip] = useState(() => {
    try {
      return sessionStorage.getItem(TIP_KEY) !== '1';
    } catch {
      return true;
    }
  });

  const lightRef = useRef(light);
  const scoreRef = useRef(0);
  const endedRef = useRef(false);
  const settledRef = useRef(false);
  lightRef.current = light;

  const dismissTip = () => {
    setShowTip(false);
    try {
      sessionStorage.setItem(TIP_KEY, '1');
    } catch {
      /* ignore */
    }
  };

  const settle = (success: boolean) => {
    if (settledRef.current) return;
    settledRef.current = true;
    setWon(success);
    setPhase('result');
    window.setTimeout(() => {
      setPhase('done');
      onFinish(success);
    }, 2400);
  };

  /* countdown → play */
  useEffect(() => {
    if (phase !== 'ready') return;
    if (countdown < 0) {
      setPhase('play');
      haptic('medium');
      playClickSound();
      return;
    }
    const id = window.setTimeout(() => {
      setCountdown((c) => c - 1);
      haptic('light');
    }, countdown === 0 ? 480 : 700);
    return () => window.clearTimeout(id);
  }, [phase, countdown]);

  /* light loop — intervalos variables */
  useEffect(() => {
    if (phase !== 'play') return;
    let alive = true;
    let timer = 0;

    const tick = () => {
      if (!alive || endedRef.current) return;
      setLight((l) => {
        const next: LightColor = Math.random() > 0.35 ? (l === 'green' ? 'red' : 'green') : l;
        if (next !== l) {
          haptic('light');
          setFlash(true);
          window.setTimeout(() => setFlash(false), 180);
        }
        return next;
      });
      const delay = 520 + Math.random() * 980;
      timer = window.setTimeout(tick, delay);
    };

    timer = window.setTimeout(tick, 600 + Math.random() * 400);
    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
  }, [phase]);

  const handleTap = useCallback(() => {
    if (phase !== 'play' || endedRef.current) return;
    dismissTip();

    if (lightRef.current === 'red') {
      endedRef.current = true;
      playLoseSound();
      haptic('error');
      settle(false);
      return;
    }

    scoreRef.current += 1;
    setScore(scoreRef.current);
    setBurstKey((k) => k + 1);
    playClickSound();
    haptic('light');

    if (scoreRef.current >= GOAL) {
      endedRef.current = true;
      playWinSound();
      haptic('success');
      settle(true);
    }
  }, [phase, onFinish]);

  const playing = phase === 'play';
  const progress = Math.min(1, score / GOAL);

  return (
    <div
      className={[
        'game-redlight',
        `game-redlight--${phase}`,
        light === 'green' ? 'is-green' : 'is-red',
        flash ? 'is-flash' : '',
        won === true ? 'is-win' : '',
        won === false ? 'is-lose' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="game-redlight__aura" aria-hidden />

      <p className="game-redlight__eyebrow">Red Light</p>
      <p className="game-redlight__title">Congélate o corre</p>

      <AnimatePresence>
        {showTip && (phase === 'ready' || phase === 'play') && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="game-redlight__tip"
          >
            <Hand size={16} className="text-reto-cyan shrink-0" />
            <span>Toca el orbe solo en VERDE. En ROJO, ni un dedo. Llega a {GOAL} taps.</span>
            <button type="button" onClick={dismissTip} className="game-redlight__tip-ok">
              Ok
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="game-redlight__stakes">
        <div className="game-redlight__stake game-redlight__stake--win">
          <Zap size={13} />
          <span>Sobrevive</span>
          <strong>+{WIN_BP}</strong>
        </div>
        <div className="game-redlight__stake game-redlight__stake--lose">
          <OctagonAlert size={13} />
          <span>Eliminado</span>
          <strong>{LOSE_BP}</strong>
        </div>
      </div>

      <div className="game-redlight__progress" aria-hidden>
        <div className="game-redlight__progress-fill" style={{ width: `${progress * 100}%` }} />
        <div className="game-redlight__progress-label">
          <span className="tabular-nums">
            {score}/{GOAL}
          </span>
        </div>
      </div>

      <div className="game-redlight__dots" aria-hidden>
        {Array.from({ length: GOAL }, (_, i) => (
          <span
            key={i}
            className={`game-redlight__dot ${i < score ? 'is-done' : ''} ${
              i === score && playing ? 'is-next' : ''
            }`}
          />
        ))}
      </div>

      <motion.div
        key={light + String(flash)}
        className={`game-redlight__signal ${light === 'green' ? 'is-green' : 'is-red'}`}
        initial={{ scale: 0.92, opacity: 0.7 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 420, damping: 22 }}
      >
        <span className="game-redlight__signal-lamp" />
        <span className="game-redlight__signal-text">
          {phase === 'ready'
            ? countdown > 0
              ? 'Prepárate'
              : '¡YA!'
            : won === false
              ? 'Eliminado'
              : won === true
                ? '¡Pasaste!'
                : light === 'green'
                  ? 'VERDE — toca'
                  : 'ROJO — quieto'}
        </span>
      </motion.div>

      <div
        className={`game-redlight__stage ${light === 'green' ? 'is-green' : 'is-red'}`}
        role="button"
        tabIndex={playing ? 0 : -1}
        aria-label={light === 'green' ? 'Tocar en verde' : 'No tocar — luz roja'}
        aria-disabled={!playing}
        onPointerDown={(e) => {
          if (!playing) return;
          if ((e.target as HTMLElement).closest('[data-redlight-exit]')) return;
          e.preventDefault();
          handleTap();
        }}
        onKeyDown={(e) => {
          if (!playing) return;
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleTap();
          }
        }}
      >
        <div className="game-redlight__stage-frame" aria-hidden />
        <div className="game-redlight__stage-scan" aria-hidden />

        <Suspense
          fallback={
            <div className="game-redlight__loading">
              <Loader2 className="animate-spin text-reto-cyan" size={28} />
            </div>
          }
        >
          <Canvas
            className="game-redlight__canvas"
            dpr={[1, 1.75]}
            camera={{ position: [0, 1.15, 4.35], fov: 40, near: 0.1, far: 40 }}
            gl={{
              antialias: true,
              alpha: true,
              powerPreference: 'high-performance',
              toneMapping: THREE.ACESFilmicToneMapping,
            }}
            onCreated={({ gl }) => {
              gl.setClearColor('#05070d', 1);
            }}
          >
            <RedLightScene light={light} reducedMotion={reducedMotion} burstKey={burstKey} />
          </Canvas>
        </Suspense>

        <AnimatePresence>
          {phase === 'ready' && (
            <motion.div
              className="game-redlight__countdown"
              key={countdown}
              initial={{ scale: 1.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.6, opacity: 0 }}
              transition={{ duration: 0.35 }}
            >
              {countdown > 0 ? countdown : 'YA'}
            </motion.div>
          )}
        </AnimatePresence>

        {playing && light === 'green' && (
          <motion.div
            className="game-redlight__tap-hint"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.4, 0.9, 0.4] }}
            transition={{ duration: 1.2, repeat: Infinity }}
            aria-hidden
          >
            Toca
          </motion.div>
        )}
      </div>

      <AnimatePresence>
        {(phase === 'result' || phase === 'done') && won != null && (
          <motion.div
            className={`game-redlight__result ${won ? 'is-win' : 'is-lose'}`}
            initial={{ opacity: 0, y: 14, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="game-redlight__result-icon">
              {won ? <CircleCheck size={22} /> : <CircleX size={22} />}
            </div>
            <div className="game-redlight__result-body">
              <p className="game-redlight__result-title">
                {won ? '¡Cruzaste vivo!' : 'Te vio — eliminado'}
              </p>
              <p className="game-redlight__result-meta">
                {score}/{GOAL} taps · {won ? `+${WIN_BP}` : LOSE_BP} BP
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        type="button"
        data-redlight-exit
        onClick={onBack}
        className="game-redlight__exit"
        disabled={phase === 'result' || phase === 'done'}
      >
        Salir
      </button>
    </div>
  );
}
