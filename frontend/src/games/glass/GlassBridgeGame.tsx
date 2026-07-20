import { useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CircleAlert, CircleCheck, CircleX, Footprints, Sparkles, Zap } from 'lucide-react';
import { playClickSound, playLoseSound, playWinSound } from '../../lib/sounds';
import { haptic } from '../../lib/haptics';

const STEPS = 8;
const PTS_PER_STEP = 25;
const TIP_KEY = 'reto_glass_tip_seen';
/** Altura fila + gap ≈ 2.7rem + 0.5rem */
const ROW_TRAVEL = 52;

export type GlassBridgeGameProps = {
  onFinish: (steps: number) => void;
  onBack: () => void;
};

type RowState = {
  picked: 0 | 1 | null;
  cracked: boolean;
  /** lado seguro conocido al revelar (muerte o paso) */
  safeSide: 0 | 1 | null;
};

type Phase = 'play' | 'result' | 'done';

function emptyRows(): RowState[] {
  return Array.from({ length: STEPS }, () => ({
    picked: null,
    cracked: false,
    safeSide: null
  }));
}

function bpFor(steps: number): number {
  return Math.min(200, steps * PTS_PER_STEP);
}

export default function GlassBridgeGame({ onFinish, onBack }: GlassBridgeGameProps) {
  const [step, setStep] = useState(0);
  const [rows, setRows] = useState<RowState[]>(emptyRows);
  const [phase, setPhase] = useState<Phase>('play');
  const [dead, setDead] = useState(false);
  const [won, setWon] = useState(false);
  const [cracked, setCracked] = useState<number | null>(null);
  const [safeFlash, setSafeFlash] = useState<number | null>(null);
  const [locked, setLocked] = useState(false);
  const [showTip, setShowTip] = useState(() => {
    try {
      return sessionStorage.getItem(TIP_KEY) !== '1';
    } catch {
      return true;
    }
  });

  const trap = useRef(Math.random() > 0.5 ? 0 : 1);
  const settledRef = useRef(false);
  const finalSteps = useRef(0);

  const dismissTip = () => {
    setShowTip(false);
    try {
      sessionStorage.setItem(TIP_KEY, '1');
    } catch {
      /* ignore */
    }
  };

  const settle = (stepsReached: number) => {
    if (settledRef.current) return;
    settledRef.current = true;
    finalSteps.current = stepsReached;
    setPhase('result');
    window.setTimeout(() => {
      setPhase('done');
      onFinish(stepsReached);
    }, 2400);
  };

  const pick = (side: number) => {
    if (phase !== 'play' || dead || won || locked) return;
    dismissTip();
    setLocked(true);
    playClickSound();

    const safeSide = (trap.current === 0 ? 1 : 0) as 0 | 1;

    if (side === trap.current) {
      setCracked(side);
      setRows((prev) =>
        prev.map((r, i) =>
          i === step ? { picked: side as 0 | 1, cracked: true, safeSide } : r
        )
      );
      setDead(true);
      playLoseSound();
      haptic('error');
      settle(step);
      return;
    }

    setSafeFlash(side);
    haptic('light');
    const next = step + 1;
    setRows((prev) =>
      prev.map((r, i) =>
        i === step ? { picked: side as 0 | 1, cracked: false, safeSide: side as 0 | 1 } : r
      )
    );

    window.setTimeout(() => {
      setSafeFlash(null);
      setStep(next);
      trap.current = Math.random() > 0.5 ? 0 : 1;
      if (next >= STEPS) {
        setWon(true);
        playWinSound();
        haptic('success');
        settle(STEPS);
      } else {
        setLocked(false);
      }
    }, 420);
  };

  const bpNow = bpFor(won ? STEPS : step);
  const bpIfDead = bpFor(step);
  const status =
    won
      ? '¡Llegaste al otro lado!'
      : dead
        ? 'El cristal se rompió…'
        : step === 0
          ? 'Elige la baldosa segura'
          : `Paso ${step} de ${STEPS}`;

  const cameraYFinal = won ? STEPS * ROW_TRAVEL : step * ROW_TRAVEL;

  return (
    <div className={`game-glass game-glass--${phase}${won ? ' is-win' : ''}${dead ? ' is-lose' : ''}`}>
      <div className="game-glass__aura" aria-hidden />

      <p className="game-glass__eyebrow">Glass Bridge</p>
      <p className="game-glass__title">Cruza el puente</p>

      <AnimatePresence>
        {showTip && phase === 'play' && !dead && !won && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="game-glass__tip"
          >
            <CircleAlert size={16} className="text-reto-cyan shrink-0" />
            <span>Una baldosa es segura. La otra se rompe. +{PTS_PER_STEP} BP por paso (máx. 200).</span>
            <button type="button" onClick={dismissTip} className="game-glass__tip-ok">
              Ok
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="game-glass__stakes">
        <div className="game-glass__stake">
          <Zap size={13} />
          <span>+{PTS_PER_STEP}/paso</span>
        </div>
        <div className="game-glass__stake game-glass__stake--bp">
          <strong>~{dead ? bpIfDead : bpNow} BP</strong>
        </div>
        <div className="game-glass__stake">
          <span>máx 200</span>
        </div>
      </div>

      <div className="game-glass__progress" aria-label={`Progreso ${step} de ${STEPS}`}>
        {Array.from({ length: STEPS }, (_, i) => (
          <span
            key={i}
            className={`game-glass__dot ${i < step || won ? 'is-done' : ''} ${i === step && !dead && !won ? 'is-current' : ''} ${dead && i === step ? 'is-fail' : ''}`}
          />
        ))}
      </div>
      <p className="game-glass__step-label">
        <Footprints size={14} className="inline -mt-0.5 mr-1 opacity-70" />
        {won ? STEPS : step}/{STEPS}
      </p>

      <div className="game-glass__scene" aria-hidden>
        <div className="game-glass__fog game-glass__fog--top" />
        <div className="game-glass__fog game-glass__fog--bottom" />
        <div className="game-glass__void" />

        <motion.div
          className="game-glass__world"
          animate={{ y: cameraYFinal }}
          transition={{ type: 'spring', stiffness: 120, damping: 18 }}
        >
          <div className={`game-glass__platform game-glass__platform--end ${won ? 'is-goal' : ''}`}>
            <span className="game-glass__platform-glow" />
            {won ? <Sparkles size={20} /> : <span className="game-glass__platform-mark">META</span>}
          </div>

          {[...Array.from({ length: STEPS }, (_, i) => STEPS - 1 - i)].map((rowIdx) => {
            const row = rows[rowIdx];
            const isPast = rowIdx < step || won;
            const isCurrent = rowIdx === step && !won;
            const isFuture = rowIdx > step && !won;

            return (
              <div
                key={rowIdx}
                className={[
                  'game-glass__row',
                  isPast ? 'is-past' : '',
                  isCurrent ? 'is-current' : '',
                  isFuture ? 'is-future' : ''
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                {[0, 1].map((side) => {
                  const pickedHere = row.picked === side;
                  const crackedHere = pickedHere && row.cracked;
                  const safeHere = pickedHere && !row.cracked;
                  const revealedSafe = row.safeSide === side && (dead || isPast);
                  const revealedTrap =
                    dead && rowIdx === step && row.safeSide != null && row.safeSide !== side && !pickedHere;

                  return (
                    <div
                      key={side}
                      className={[
                        'game-glass__pane',
                        crackedHere ? 'is-cracked' : '',
                        safeHere || revealedSafe ? 'is-safe' : '',
                        revealedTrap ? 'is-ghost' : '',
                        isCurrent && phase === 'play' ? 'is-choice' : ''
                      ]
                        .filter(Boolean)
                        .join(' ')}
                    >
                      <span className="game-glass__pane-face" />
                      <span className="game-glass__pane-edge" />
                      <span className="game-glass__pane-shine" />
                      {isCurrent && phase === 'play' && (
                        <span className="game-glass__pane-tag">{side === 0 ? 'I' : 'D'}</span>
                      )}
                      {crackedHere && <span className="game-glass__pane-crack" />}
                    </div>
                  );
                })}
              </div>
            );
          })}

          <div className={`game-glass__platform game-glass__platform--start ${step === 0 && !dead ? 'is-here' : ''}`}>
            <span className="game-glass__platform-mark">INICIO</span>
          </div>
        </motion.div>

        {phase === 'play' && !dead && !won && (
          <>
            <div className="game-glass__reticule" />
            <div className="game-glass__you">
              <Footprints size={14} />
            </div>
          </>
        )}
      </div>

      <p className={`game-glass__status ${dead ? 'is-fail' : ''} ${won ? 'is-win' : ''}`} aria-live="polite">
        {status}
      </p>

      {phase === 'play' && (
        <div className="game-glass__tiles">
          {[0, 1].map((side) => {
            const isCrack = cracked === side;
            const isSafe = safeFlash === side;
            return (
              <motion.button
                key={`${step}-${side}`}
                type="button"
                className={`game-glass__tile ${isCrack ? 'is-crack' : ''} ${isSafe ? 'is-safe' : ''} ${dead && !isCrack ? 'is-dim' : ''}`}
                disabled={dead || won || locked}
                onClick={() => pick(side)}
                whileTap={dead || won || locked ? undefined : { scale: 0.96 }}
                animate={
                  isCrack
                    ? { y: [0, 8, 120], opacity: [1, 1, 0], rotate: [0, -8, 18] }
                    : isSafe
                      ? { scale: [1, 1.06, 1], y: [0, -6, 0] }
                      : { y: 0, opacity: 1, rotate: 0 }
                }
                transition={{ duration: isCrack ? 0.7 : 0.35 }}
                aria-label={side === 0 ? 'Baldosa izquierda' : 'Baldosa derecha'}
              >
                <span className="game-glass__tile-pane" aria-hidden>
                  <span className="game-glass__tile-shine" />
                  <span className="game-glass__tile-edge" />
                </span>
                <span className="game-glass__tile-label">{side === 0 ? 'Izq' : 'Der'}</span>
                {isCrack && <span className="game-glass__shatter" aria-hidden />}
              </motion.button>
            );
          })}
        </div>
      )}

      <AnimatePresence>
        {(phase === 'result' || phase === 'done') && (
          <motion.div
            className={`game-glass__result ${won ? 'is-win' : 'is-lose'}`}
            initial={{ opacity: 0, y: 14, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="game-glass__result-icon">
              {won ? <CircleCheck size={22} /> : <CircleX size={22} />}
            </div>
            <div className="game-glass__result-body">
              <p className="game-glass__result-title">
                {won ? '¡Puente cruzado!' : 'Caíste al vacío'}
              </p>
              <p className="game-glass__result-meta">
                {won ? STEPS : step} de {STEPS} pasos · +{bpFor(won ? STEPS : step)} BP
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        type="button"
        onClick={onBack}
        className="game-glass__exit"
        disabled={phase !== 'play' || locked}
      >
        Salir
      </button>
    </div>
  );
}
