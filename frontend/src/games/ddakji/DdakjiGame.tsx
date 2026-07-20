import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CircleCheck, CircleX, Layers, Zap } from 'lucide-react';
import { playClickSound, playLoseSound, playWinSound } from '../../lib/sounds';
import { haptic } from '../../lib/haptics';

export type DdakjiLevel = 1 | 2 | 3;

type LevelConfig = {
  id: DdakjiLevel;
  label: string;
  title: string;
  zoneMin: number;
  zoneMax: number;
  step: number;
  tickMs: number;
  winBp: number;
  loseBp: number;
  blurb: string;
};

const LEVELS: LevelConfig[] = [
  {
    id: 1,
    label: 'N1',
    title: 'Fácil',
    zoneMin: 32,
    zoneMax: 78,
    step: 1.6,
    tickMs: 60,
    winBp: 60,
    loseBp: 12,
    blurb: 'Zona ancha · ~1.7s para acertar',
  },
  {
    id: 2,
    label: 'N2',
    title: 'Medio',
    zoneMin: 48,
    zoneMax: 66,
    step: 2.6,
    tickMs: 45,
    winBp: 90,
    loseBp: 15,
    blurb: 'Zona corta · ~0.3s para acertar',
  },
  {
    id: 3,
    label: 'N3',
    title: 'Difícil',
    zoneMin: 54,
    zoneMax: 64,
    step: 3.2,
    tickMs: 34,
    winBp: 150,
    loseBp: 20,
    blurb: 'Zona mínima · ~0.1s — reflejos',
  },
];

const TIP_KEY = 'reto_ddakji_tip_seen';
const LEVEL_KEY = 'reto_ddakji_level';

function readLevel(): DdakjiLevel {
  try {
    const n = Number(localStorage.getItem(LEVEL_KEY));
    if (n === 1 || n === 2 || n === 3) return n;
  } catch {
    /* ignore */
  }
  return 2;
}

export type DdakjiGameProps = {
  onFinish: (won: boolean, level: DdakjiLevel) => void;
  onBack: () => void;
};

type Phase = 'select' | 'play' | 'result' | 'done';

function timingLabel(power: number, zoneMin: number, zoneMax: number): { text: string; tone: 'soon' | 'now' | 'late' } {
  if (power < zoneMin) return { text: 'Espera…', tone: 'soon' };
  if (power <= zoneMax) return { text: '¡Ahora!', tone: 'now' };
  return { text: 'Pasaste', tone: 'late' };
}

export default function DdakjiGame({ onFinish, onBack }: DdakjiGameProps) {
  const [level, setLevel] = useState<DdakjiLevel>(() => readLevel());
  const [phase, setPhase] = useState<Phase>('select');
  const [power, setPower] = useState(0);
  const [won, setWon] = useState<boolean | null>(null);
  const [resultPower, setResultPower] = useState<number | null>(null);
  const [showTip, setShowTip] = useState(() => {
    try {
      return sessionStorage.getItem(TIP_KEY) !== '1';
    } catch {
      return true;
    }
  });

  const settledRef = useRef(false);
  const inZoneRef = useRef(false);
  const cfg = LEVELS.find((l) => l.id === level)!;
  const playing = phase === 'play';

  const pickLevel = (next: DdakjiLevel) => {
    setLevel(next);
    haptic('light');
    playClickSound();
    try {
      localStorage.setItem(LEVEL_KEY, String(next));
    } catch {
      /* ignore */
    }
  };

  const startPlay = () => {
    settledRef.current = false;
    setPower(0);
    setWon(null);
    setResultPower(null);
    setPhase('play');
    haptic('light');
    playClickSound();
  };

  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => {
      setPower((p) => (p >= 100 ? 0 : Math.min(100, p + cfg.step)));
    }, cfg.tickMs);
    return () => window.clearInterval(id);
  }, [playing, cfg.step, cfg.tickMs]);

  const timing = timingLabel(power, cfg.zoneMin, cfg.zoneMax);
  const inZone = power >= cfg.zoneMin && power <= cfg.zoneMax;

  useEffect(() => {
    if (!playing) return;
    if (inZoneRef.current !== inZone) {
      if (inZone) haptic('light');
      inZoneRef.current = inZone;
    }
  }, [inZone, playing]);

  const dismissTip = () => {
    setShowTip(false);
    try {
      sessionStorage.setItem(TIP_KEY, '1');
    } catch {
      /* ignore */
    }
  };

  const flip = () => {
    if (!playing || won !== null) return;
    dismissTip();
    const success = power >= cfg.zoneMin && power <= cfg.zoneMax;
    setResultPower(Math.round(power));
    setWon(success);
    setPhase('result');
    playClickSound();
    if (success) {
      playWinSound();
      haptic('success');
    } else {
      playLoseSound();
      haptic('error');
    }
    window.setTimeout(() => {
      if (settledRef.current) return;
      settledRef.current = true;
      setPhase('done');
      onFinish(success, level);
    }, 2400);
  };

  const tooSoon = resultPower != null && resultPower < cfg.zoneMin;
  const tooLate = resultPower != null && resultPower > cfg.zoneMax;

  return (
    <div
      className={[
        'game-ddakji',
        `game-ddakji--${phase}`,
        inZone && playing ? 'is-hot' : '',
        won === true ? 'is-win' : '',
        won === false ? 'is-lose' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="game-ddakji__aura" aria-hidden />

      <p className="game-ddakji__eyebrow">Ddakji Flip</p>
      <p className="game-ddakji__title">Voltea la carta</p>

      {phase === 'select' ? (
        <div className="game-ddakji__select">
          <p className="game-ddakji__select-label">Elige nivel</p>
          <div className="game-ddakji__levels" role="group" aria-label="Nivel de dificultad">
            {LEVELS.map((l) => (
              <button
                key={l.id}
                type="button"
                className={`game-ddakji__level game-ddakji__level--${l.id} ${level === l.id ? 'is-active' : ''}`}
                onClick={() => pickLevel(l.id)}
              >
                <span className="game-ddakji__level-code">{l.label}</span>
                <span className="game-ddakji__level-title">{l.title}</span>
                <span className="game-ddakji__level-meta">+{l.winBp} BP</span>
              </button>
            ))}
          </div>

          <div className="game-ddakji__preview" aria-hidden>
            <div className="game-ddakji__preview-track">
              <div
                className="game-ddakji__preview-zone"
                style={{ left: `${cfg.zoneMin}%`, width: `${cfg.zoneMax - cfg.zoneMin}%` }}
              />
            </div>
            <div className="game-ddakji__preview-meta">
              <span>
                Zona {cfg.zoneMin}–{cfg.zoneMax}
              </span>
              <span>{cfg.blurb}</span>
            </div>
          </div>

          <motion.button type="button" whileTap={{ scale: 0.96 }} className="game-ddakji__flip is-hot" onClick={startPlay}>
            Jugar {cfg.title}
          </motion.button>
          <button type="button" onClick={onBack} className="game-ddakji__exit">
            Salir
          </button>
        </div>
      ) : null}

      {phase !== 'select' ? (
        <>
          <div className="game-ddakji__level-chip" aria-label={`Nivel ${cfg.label}`}>
            {cfg.label} {cfg.title}
          </div>

          <AnimatePresence>
            {showTip && playing && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="game-ddakji__tip"
              >
                <Layers size={16} className="text-reto-gold shrink-0" />
                <span>
                  Espera la zona dorada ({cfg.zoneMin}–{cfg.zoneMax}) y toca la carta o ¡FLIP!
                </span>
                <button type="button" onClick={dismissTip} className="game-ddakji__tip-ok">
                  Ok
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="game-ddakji__stakes">
            <div className="game-ddakji__stake game-ddakji__stake--win">
              <Zap size={13} />
              <span>Acierto</span>
              <strong>+{cfg.winBp}</strong>
            </div>
            <div className="game-ddakji__stake">
              <span>Fallo</span>
              <strong>+{cfg.loseBp}</strong>
            </div>
          </div>

          <div className="game-ddakji__arena" style={{ perspective: 1100 }}>
            <div className="game-ddakji__rival" aria-hidden>
              <span className="game-ddakji__rival-face" />
              <span className="game-ddakji__rival-label">Rival</span>
            </div>

            <motion.button
              type="button"
              className={`game-ddakji__card ${inZone && playing ? 'is-ready' : ''}`}
              disabled={!playing}
              onClick={flip}
              animate={
                won === null
                  ? { rotateY: 0, rotateZ: 0, x: 0, y: 0, scale: inZone ? 1.05 : 1 }
                  : won
                    ? { rotateY: 180, rotateZ: -8, y: -18, scale: 1.08 }
                    : { rotateY: 165, rotateZ: [0, -12, 10, -6, 0], x: [0, -10, 10, -4, 0], scale: 0.96 }
              }
              transition={
                won === false
                  ? { duration: 0.55, x: { duration: 0.45 } }
                  : won === true
                    ? { duration: 0.65, ease: [0.22, 1, 0.36, 1] }
                    : { type: 'spring', stiffness: 280, damping: 20 }
              }
              whileTap={playing ? { scale: 0.95 } : undefined}
              aria-label="Voltear carta"
            >
              <div className="game-ddakji__face game-ddakji__face--front">
                <span className="game-ddakji__frame" />
                <span className="game-ddakji__glyph" aria-hidden>
                  R
                </span>
                <span className="game-ddakji__corner game-ddakji__corner--tl" />
                <span className="game-ddakji__corner game-ddakji__corner--br" />
              </div>
              <div className="game-ddakji__face game-ddakji__face--back">
                <span className="game-ddakji__frame game-ddakji__frame--back" />
                {won === true ? <CircleCheck size={52} strokeWidth={2.25} /> : <CircleX size={52} strokeWidth={2.25} />}
              </div>
            </motion.button>

            {playing && inZone && (
              <motion.div
                className="game-ddakji__ready-ring"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: [0.35, 0.85, 0.35], scale: [0.95, 1.05, 0.95] }}
                transition={{ duration: 0.9, repeat: Infinity }}
                aria-hidden
              />
            )}
          </div>

          <div className="game-ddakji__meter" aria-hidden>
            <div className="game-ddakji__track">
              <div
                className="game-ddakji__zone"
                style={{ left: `${cfg.zoneMin}%`, width: `${cfg.zoneMax - cfg.zoneMin}%` }}
              />
              <motion.div
                className={`game-ddakji__fill ${inZone ? 'is-hot' : ''}`}
                animate={{ width: `${power}%` }}
                transition={{ duration: 0.05 }}
              />
              <div className={`game-ddakji__needle ${inZone ? 'is-hot' : ''}`} style={{ left: `${power}%` }} />
            </div>
            <div className="game-ddakji__marks">
              <span className="game-ddakji__mark-label" style={{ left: `${(cfg.zoneMin + cfg.zoneMax) / 2}%` }}>
                Zona dorada
              </span>
              <span style={{ left: `${cfg.zoneMin}%` }}>{cfg.zoneMin}</span>
              <span style={{ left: `${cfg.zoneMax}%` }}>{cfg.zoneMax}</span>
            </div>
          </div>

          <p className={`game-ddakji__timing game-ddakji__timing--${timing.tone}`} aria-live="polite">
            {playing
              ? timing.text
              : won
                ? '¡Volteaste la carta!'
                : tooSoon
                  ? 'Muy pronto…'
                  : tooLate
                    ? 'Te pasaste…'
                    : 'Fallaste'}
          </p>

          {playing && (
            <motion.button
              type="button"
              whileTap={{ scale: 0.96 }}
              onClick={flip}
              className={`game-ddakji__flip ${inZone ? 'is-hot' : ''}`}
            >
              ¡FLIP!
            </motion.button>
          )}

          <AnimatePresence>
            {(phase === 'result' || phase === 'done') && won != null && (
              <motion.div
                className={`game-ddakji__result ${won ? 'is-win' : 'is-lose'}`}
                initial={{ opacity: 0, y: 14, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0 }}
              >
                <div className="game-ddakji__result-icon">{won ? <CircleCheck size={22} /> : <CircleX size={22} />}</div>
                <div className="game-ddakji__result-body">
                  <p className="game-ddakji__result-title">{won ? '¡Carta volteada!' : 'No la volteaste'}</p>
                  <p className="game-ddakji__result-meta">
                    {cfg.label} · Timing {resultPower ?? 0}% · zona {cfg.zoneMin}–{cfg.zoneMax} · +
                    {won ? cfg.winBp : cfg.loseBp} BP
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <button type="button" onClick={onBack} className="game-ddakji__exit" disabled={!playing}>
            Salir
          </button>
        </>
      ) : null}
    </div>
  );
}
