import { useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CircleCheck, CircleX, Gift, Sparkles } from 'lucide-react';
import { playClickSound } from '../../lib/sounds';
import { haptic } from '../../lib/haptics';

const TIP_KEY = 'reto_mystery_tip_seen';

const CHESTS = [
  { id: 0, tone: 'gold' as const, label: 'Ámbar' },
  { id: 1, tone: 'cyan' as const, label: 'Cian' },
  { id: 2, tone: 'pink' as const, label: 'Rosa' }
];

export type MysteryBoxApiResult = {
  success: boolean;
  points?: number;
  gained?: number;
  won?: boolean;
  winBox?: number;
  error?: string;
};

export type MysteryBoxGameProps = {
  onOpen: (boxIndex: number) => Promise<MysteryBoxApiResult | null>;
  onSettled: (res: MysteryBoxApiResult) => void;
  onBack: () => void;
};

type Phase = 'pick' | 'opening' | 'reveal' | 'done';

export default function MysteryBoxGame({ onOpen, onSettled, onBack }: MysteryBoxGameProps) {
  const [phase, setPhase] = useState<Phase>('pick');
  const [picked, setPicked] = useState<number | null>(null);
  const [winBox, setWinBox] = useState<number | null>(null);
  const [won, setWon] = useState<boolean | null>(null);
  const [points, setPoints] = useState(0);
  const [showTip, setShowTip] = useState(() => {
    try {
      return sessionStorage.getItem(TIP_KEY) !== '1';
    } catch {
      return true;
    }
  });

  const busyRef = useRef(false);
  const settledRef = useRef(false);

  const dismissTip = () => {
    setShowTip(false);
    try {
      sessionStorage.setItem(TIP_KEY, '1');
    } catch {
      /* ignore */
    }
  };

  const pick = async (i: number) => {
    if (busyRef.current || phase !== 'pick') return;
    busyRef.current = true;
    dismissTip();
    setPicked(i);
    setPhase('opening');
    playClickSound();
    haptic('medium');

    const res = await onOpen(i);
    if (!res || !res.success) {
      busyRef.current = false;
      setPhase('pick');
      setPicked(null);
      return;
    }

    const jackpot = typeof res.winBox === 'number' ? res.winBox : i;
    const didWin = !!res.won;
    const pts = res.points ?? res.gained ?? (didWin ? 120 : 5);

    window.setTimeout(() => {
      setWinBox(jackpot);
      setWon(didWin);
      setPoints(pts);
      setPhase('reveal');
      haptic(didWin ? 'success' : 'medium');
    }, 700);

    window.setTimeout(() => {
      if (settledRef.current) return;
      settledRef.current = true;
      setPhase('done');
      onSettled(res);
    }, 2800);
  };

  const locked = phase !== 'pick';

  return (
    <div className={`game-mystery game-mystery--${phase}${won ? ' is-win' : ''}${won === false ? ' is-lose' : ''}`}>
      <div className="game-mystery__aura" aria-hidden />

      <p className="game-mystery__eyebrow">Caja misteriosa</p>
      <p className="game-mystery__title">Elige un cofre</p>

      <AnimatePresence>
        {showTip && phase === 'pick' && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="game-mystery__tip"
          >
            <Gift size={16} className="text-reto-pink shrink-0" />
            <span>Solo uno esconde el premio grande (+120). Los otros dan migajas (+5).</span>
            <button type="button" onClick={dismissTip} className="game-mystery__tip-ok">
              Ok
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="game-mystery__stakes" aria-hidden={phase !== 'pick'}>
        <div className="game-mystery__stake game-mystery__stake--big">
          <Sparkles size={14} />
          <span>Premio</span>
          <strong>+120 BP</strong>
        </div>
        <div className="game-mystery__stake">
          <span>Migajas</span>
          <strong>+5 BP</strong>
        </div>
      </div>

      <p className="game-mystery__hint">
        {phase === 'pick' && 'Toca un cofre para abrirlo'}
        {phase === 'opening' && 'Abriendo…'}
        {(phase === 'reveal' || phase === 'done') && (won ? '¡Jackpot!' : 'Solo migajas…')}
      </p>

      <div className="game-mystery__row" role="group" aria-label="Cofres">
        {CHESTS.map((chest, idx) => {
          const isPicked = picked === chest.id;
          const isWinChest = winBox === chest.id;
          const isRevealed = phase === 'reveal' || phase === 'done';
          const isDim = locked && !isPicked && !isRevealed;
          const showEmpty = isRevealed && !isWinChest;
          const showPrize = isRevealed && isWinChest;

          return (
            <motion.button
              key={chest.id}
              type="button"
              disabled={locked}
              aria-label={`Cofre ${chest.label}`}
              className={[
                'game-mystery__chest',
                `game-mystery__chest--${chest.tone}`,
                isPicked || (isRevealed && isWinChest) ? 'is-open' : '',
                isDim ? 'is-dim' : '',
                showPrize ? 'is-prize' : '',
                showEmpty ? 'is-empty' : '',
                isPicked ? 'is-picked' : ''
              ]
                .filter(Boolean)
                .join(' ')}
              initial={{ opacity: 0, y: 20 }}
              animate={{
                opacity: isDim ? 0.32 : 1,
                y: 0,
                scale: isPicked && phase === 'opening' ? 1.1 : showPrize ? 1.08 : 1
              }}
              transition={{ delay: idx * 0.08, type: 'spring', stiffness: 300, damping: 20 }}
              whileHover={!locked ? { y: -8, scale: 1.05 } : undefined}
              whileTap={!locked ? { scale: 0.96 } : undefined}
              onClick={() => void pick(chest.id)}
            >
              <span className="game-mystery__glow" aria-hidden />
              <span className="game-mystery__pedestal" aria-hidden />

              <span className="game-mystery__lid" aria-hidden>
                <span className="game-mystery__lid-top" />
                <span className="game-mystery__latch" />
              </span>
              <span className="game-mystery__body" aria-hidden>
                <span className="game-mystery__band" />
                <span className="game-mystery__gem" />
              </span>

              <AnimatePresence>
                {showPrize && (
                  <motion.span
                    className="game-mystery__prize"
                    initial={{ opacity: 0, y: 12, scale: 0.5 }}
                    animate={{ opacity: 1, y: -8, scale: 1 }}
                    transition={{ type: 'spring', stiffness: 320, damping: 16 }}
                    aria-hidden
                  >
                    <Sparkles size={18} />
                    <span>120</span>
                  </motion.span>
                )}
                {showEmpty && (
                  <motion.span
                    className="game-mystery__crumbs"
                    initial={{ opacity: 0, scale: 0.6 }}
                    animate={{ opacity: 1, scale: 1 }}
                    aria-hidden
                  >
                    5
                  </motion.span>
                )}
                {isPicked && phase === 'opening' && (
                  <motion.span
                    className="game-mystery__burst"
                    initial={{ opacity: 0, scale: 0.4 }}
                    animate={{ opacity: 1, scale: 1.15 }}
                    exit={{ opacity: 0 }}
                    aria-hidden
                  >
                    <Sparkles size={22} />
                  </motion.span>
                )}
              </AnimatePresence>

              <span className="game-mystery__label">{chest.label}</span>
            </motion.button>
          );
        })}
      </div>

      <AnimatePresence>
        {(phase === 'reveal' || phase === 'done') && won != null && (
          <motion.div
            className={`game-mystery__result ${won ? 'is-win' : 'is-lose'}`}
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="game-mystery__result-icon">
              {won ? <CircleCheck size={22} /> : <CircleX size={22} />}
            </div>
            <div className="game-mystery__result-body">
              <p className="game-mystery__result-title">
                {won ? '¡Premio grande!' : 'Solo migajas'}
              </p>
              <p className="game-mystery__result-meta">
                Elegiste {CHESTS[picked ?? 0]?.label}
                {winBox != null && winBox !== picked
                  ? ` · el jackpot estaba en ${CHESTS[winBox]?.label}`
                  : ''}
              </p>
              <p className={`game-mystery__result-delta ${won ? 'is-up' : ''}`}>+{points} BP</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button type="button" onClick={onBack} className="game-mystery__exit" disabled={locked}>
        Salir
      </button>
    </div>
  );
}
