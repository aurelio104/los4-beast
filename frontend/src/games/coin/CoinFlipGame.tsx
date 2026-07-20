import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CircleCheck, CircleX, Coins, Minus, Plus, Wallet, X } from 'lucide-react';
import { celebrateCoin } from '../../lib/celebrate';
import { playClickSound } from '../../lib/sounds';
import { haptic } from '../../lib/haptics';
import { api } from '../../lib/api';
import type { User } from '../../types';

const TIP_KEY = 'reto_coin_tip_seen';
const BET_MIN = 20;
const BET_MAX = 200;
const BET_STEP = 10;
const BET_CHIPS = [20, 50, 100, 200] as const;

export type CoinFlipApiResult = {
  success: boolean;
  won?: boolean;
  result?: string;
  points?: number;
  gained?: number;
  error?: string;
};

export type CoinFlipGameProps = {
  onFlip: (choice: string, bet: number) => Promise<CoinFlipApiResult | null>;
  onSettled: (res: CoinFlipApiResult) => void;
  onBack: () => void;
};

type Phase = 'idle' | 'spinning' | 'reveal' | 'done';
type Side = 'heads' | 'tails';

function faceLabel(side: string | undefined): string {
  return side === 'tails' ? 'Cruz' : 'Cara';
}

function landRotation(current: number, result: Side): number {
  const base = Math.ceil((current + 720) / 360) * 360;
  return result === 'heads' ? base : base + 180;
}

export default function CoinFlipGame({ onFlip, onSettled, onBack }: CoinFlipGameProps) {
  const [bet, setBet] = useState(50);
  const [balance, setBalance] = useState<number | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [choice, setChoice] = useState<Side | null>(null);
  const [outcome, setOutcome] = useState<Side | null>(null);
  const [won, setWon] = useState<boolean | null>(null);
  const [gained, setGained] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  const [spark, setSpark] = useState(0);
  const [showTip, setShowTip] = useState(() => {
    try {
      return sessionStorage.getItem(TIP_KEY) !== '1';
    } catch {
      return true;
    }
  });

  const busyRef = useRef(false);
  const settledRef = useRef(false);

  useEffect(() => {
    void api.me().then((r) => {
      if (!r.success || !r.user) return;
      const u = r.user as User;
      if (typeof u.points === 'number') {
        setBalance(u.points);
        setBet((b) => Math.min(b, Math.max(BET_MIN, Math.min(BET_MAX, u.points))));
      }
    });
  }, []);

  const maxBet = Math.min(BET_MAX, balance ?? BET_MAX);
  const effectiveMax = Math.max(BET_MIN, maxBet);
  const locked = phase !== 'idle';

  const dismissTip = () => {
    setShowTip(false);
    try {
      sessionStorage.setItem(TIP_KEY, '1');
    } catch {
      /* ignore */
    }
  };

  const clampBet = (v: number) => Math.max(BET_MIN, Math.min(effectiveMax, v));

  const nudgeBet = (delta: number) => {
    if (locked) return;
    setBet((b) => clampBet(b + delta));
    playClickSound();
    haptic('light');
  };

  const setChip = (v: number) => {
    if (locked) return;
    setBet(clampBet(v));
    playClickSound();
    haptic('light');
  };

  const flip = async (side: Side) => {
    if (busyRef.current || phase !== 'idle') return;
    if (balance != null && balance < bet) {
      haptic('error');
      return;
    }

    busyRef.current = true;
    dismissTip();
    setChoice(side);
    setOutcome(null);
    setWon(null);
    setPhase('spinning');
    setSpark((s) => s + 1);
    setRotateY((y) => y + 1080);
    playClickSound();
    celebrateCoin();
    haptic('medium');

    const res = await onFlip(side, bet);
    if (!res || !res.success || !res.result) {
      busyRef.current = false;
      setPhase('idle');
      setChoice(null);
      setRotateY((y) => Math.round(y / 360) * 360);
      return;
    }

    const result = (res.result === 'tails' ? 'tails' : 'heads') as Side;
    setOutcome(result);
    setWon(!!res.won);
    setGained(res.gained ?? (res.won ? bet : -bet));
    if (typeof res.points === 'number') setBalance(res.points);

    setRotateY((y) => landRotation(y, result));
    setSpark((s) => s + 1);

    window.setTimeout(() => {
      setPhase('reveal');
      if (res.won) haptic('success');
      else haptic('error');
    }, 1100);

    window.setTimeout(() => {
      if (settledRef.current) return;
      settledRef.current = true;
      setPhase('done');
      onSettled(res);
    }, 3200);
  };

  const riskLabel =
    bet <= 50 ? 'Apuesta baja' : bet <= 120 ? 'Apuesta media' : 'Apuesta alta';
  const canAfford = balance == null || balance >= bet;

  return (
    <div className={`game-coin game-coin--${phase}${won === false ? ' is-lose' : ''}${won ? ' is-win' : ''}`}>
      <div className="game-coin__aura" aria-hidden />

      <p className="game-coin__eyebrow">Coin Flip</p>
      <p className="game-coin__title">Cara o cruz</p>

      {showTip && phase === 'idle' && (
        <div className="game-coin__tip">
          <Coins size={16} className="text-reto-gold shrink-0" />
          <span>Ganas el doble o pierdes la apuesta. 1 tirada por día.</span>
          <button type="button" onClick={dismissTip} className="game-coin__tip-ok">
            Ok
          </button>
        </div>
      )}

      {balance != null && (
        <div className="game-coin__wallet">
          <Wallet size={14} />
          <span>Disponible</span>
          <strong>{balance} BP</strong>
        </div>
      )}

      <div className={`game-coin__stage ${phase === 'spinning' ? 'is-spinning' : ''} ${phase === 'reveal' || phase === 'done' ? 'is-landed' : ''}`}>
        <span className="game-coin__edge" aria-hidden />
        <div className="game-coin__stage-inner" style={{ perspective: 1200 }}>
          <motion.div
            className="game-coin__flip"
            animate={{
              rotateY,
              y: phase === 'spinning' ? [0, -10, 0] : phase === 'reveal' ? [0, -6, 0] : 0,
              scale: phase === 'reveal' ? [1, 1.06, 1] : 1
            }}
            transition={{
              rotateY: { duration: phase === 'spinning' ? 1.05 : 1.1, ease: [0.2, 0.75, 0.2, 1] },
              y: { duration: 0.55, repeat: phase === 'spinning' ? Infinity : 0 },
              scale: { duration: 0.45 }
            }}
          >
            <div className="game-coin__face game-coin__face--heads">
              <span className="game-coin__rim" />
              <span className="game-coin__core">
                <span className="game-coin__glyph">R</span>
                <span className="game-coin__face-label">Cara</span>
              </span>
            </div>
            <div className="game-coin__face game-coin__face--tails">
              <span className="game-coin__rim" />
              <span className="game-coin__core">
                <span className="game-coin__glyph game-coin__glyph--x">
                  <X size={36} strokeWidth={2.75} />
                </span>
                <span className="game-coin__face-label">Cruz</span>
              </span>
            </div>
          </motion.div>
        </div>
        <div className={`game-coin__glow ${outcome === 'tails' ? 'is-cyan' : ''}`} aria-hidden />
        <AnimatePresence>
          {spark > 0 && phase === 'spinning' && (
            <motion.span
              key={spark}
              className="game-coin__sparks"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 1, 0.6] }}
              exit={{ opacity: 0 }}
              aria-hidden
            />
          )}
        </AnimatePresence>
      </div>

      <p className="game-coin__hint">
        {phase === 'idle' && (canAfford ? 'Elige cara o cruz' : 'BP insuficientes para esta apuesta')}
        {phase === 'spinning' && 'La moneda gira…'}
        {(phase === 'reveal' || phase === 'done') && outcome && `Salió ${faceLabel(outcome)}`}
      </p>

      <div className={`game-coin__bet ${locked ? 'is-locked' : ''}`}>
        <div className="game-coin__bet-head">
          <span className="game-coin__bet-label">Apuesta</span>
          <span className="game-coin__bet-value">{bet} BP</span>
        </div>

        <div className="game-coin__chips" role="group" aria-label="Apuestas rápidas">
          {BET_CHIPS.map((chip) => {
            const disabled = locked || (balance != null && balance < chip) || chip > effectiveMax;
            return (
              <button
                key={chip}
                type="button"
                className={`game-coin__chip ${bet === chip ? 'is-on' : ''}`}
                disabled={disabled}
                onClick={() => setChip(chip)}
              >
                {chip}
              </button>
            );
          })}
        </div>

        <div className="game-coin__bet-row">
          <button
            type="button"
            className="game-coin__bet-nudge"
            disabled={locked || bet <= BET_MIN}
            onClick={() => nudgeBet(-BET_STEP)}
            aria-label="Bajar apuesta"
          >
            <Minus size={18} />
          </button>
          <input
            type="range"
            className="game-coin__slider"
            min={BET_MIN}
            max={effectiveMax}
            step={BET_STEP}
            value={Math.min(bet, effectiveMax)}
            disabled={locked}
            onChange={(e) => setBet(clampBet(+e.target.value))}
            aria-label="Cantidad a apostar"
            style={
              {
                ['--coin-pct']: `${((Math.min(bet, effectiveMax) - BET_MIN) / Math.max(1, effectiveMax - BET_MIN)) * 100}%`
              } as CSSProperties
            }
          />
          <button
            type="button"
            className="game-coin__bet-nudge"
            disabled={locked || bet >= effectiveMax}
            onClick={() => nudgeBet(BET_STEP)}
            aria-label="Subir apuesta"
          >
            <Plus size={18} />
          </button>
        </div>
        <p className="game-coin__risk">
          {riskLabel} · ganas {bet * 2} o pierdes {bet}
        </p>
      </div>

      <div className={`game-coin__actions ${locked ? 'is-locked' : ''}`}>
        <motion.button
          type="button"
          className={`game-coin__btn game-coin__btn--heads ${choice === 'heads' ? 'is-on' : ''} ${locked && choice !== 'heads' ? 'is-dim' : ''}`}
          disabled={locked || !canAfford}
          whileTap={locked ? undefined : { scale: 0.97 }}
          onClick={() => void flip('heads')}
        >
          <span className="game-coin__btn-mini" aria-hidden>
            R
          </span>
          Cara
        </motion.button>
        <motion.button
          type="button"
          className={`game-coin__btn game-coin__btn--tails ${choice === 'tails' ? 'is-on' : ''} ${locked && choice !== 'tails' ? 'is-dim' : ''}`}
          disabled={locked || !canAfford}
          whileTap={locked ? undefined : { scale: 0.97 }}
          onClick={() => void flip('tails')}
        >
          <span className="game-coin__btn-mini game-coin__btn-mini--x" aria-hidden>
            <X size={16} strokeWidth={2.75} />
          </span>
          Cruz
        </motion.button>
      </div>

      <AnimatePresence>
        {(phase === 'reveal' || phase === 'done') && outcome && choice && (
          <motion.div
            className={`game-coin__result ${won ? 'is-win' : 'is-lose'}`}
            initial={{ opacity: 0, y: 14, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="game-coin__result-icon">
              {won ? <CircleCheck size={22} /> : <CircleX size={22} />}
            </div>
            <div className="game-coin__result-body">
              <p className="game-coin__result-title">{won ? '¡Ganaste!' : 'Perdiste'}</p>
              <p className="game-coin__result-meta">
                Elegiste {faceLabel(choice)} · salió {faceLabel(outcome)}
              </p>
              <p className={`game-coin__result-delta ${won ? 'is-up' : 'is-down'}`}>
                {gained >= 0 ? '+' : ''}
                {gained} BP
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button type="button" onClick={onBack} className="game-coin__exit" disabled={locked}>
        Salir
      </button>
    </div>
  );
}
