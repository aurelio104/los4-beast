import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { AppShell } from '../components/AppShell';
import { PageContainer } from '../components/PageContainer';
import { GlassCard } from '../components/GlassCard';
import { ActionInfoModal } from '../components/ActionInfoModal';
import { api } from '../lib/api';
import { celebrateWin, celebrateCoin } from '../lib/celebrate';
import { playClickSound } from '../lib/sounds';
import { GAME_LIST, TriviaQuestion } from '../types';
import { GAME_ACTION_INFO, GameActionKey } from '../lib/actionInfo';
import { haptic } from '../lib/haptics';
import { useSquareCanvas } from '../lib/useSquareCanvas';

type GameId = typeof GAME_LIST[number]['id'] | 'menu';

const FALLBACK_TRIVIA: TriviaQuestion[] = [
  { q: '¿Quién llega más tarde siempre?', options: ['El del grupo', 'Nadie', 'Todos'], correct: 0 },
  { q: '¿Mejor comida para el reto?', options: ['Burger', 'Pizza', 'Arepas'], correct: 0 },
  { q: '¿Traicionarías por 150 Puntos?', options: ['Obvio 👀', 'Nunca', 'Depende'], correct: 0 },
  { q: '¿Reto ideal en grupo?', options: ['Comida', 'Verdad o reto', 'Deporte'], correct: 0 }
];

export default function Arena() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [game, setGame] = useState<GameId>('menu');
  const [toast, setToast] = useState('');
  const [error, setError] = useState('');
  const [infoGame, setInfoGame] = useState<GameActionKey | null>(null);

  useEffect(() => {
    const g = searchParams.get('game');
    if (g && GAME_LIST.some((x) => x.id === g)) setGame(g as GameId);
  }, [searchParams]);

  const showResult = (points: number, msg?: string) => {
    celebrateWin(points);
    setToast(msg || `${points >= 0 ? '+' : ''}${points} Puntos`);
    setTimeout(() => { setToast(''); setGame('menu'); }, 2500);
  };

  const handleError = (e?: string) => {
    setError(e || 'Error');
    setTimeout(() => setError(''), 3000);
  };

  const run = async (
    fn: () => Promise<{ success: boolean; points?: number; error?: string; won?: boolean; result?: string }>,
    msg?: (res: { points?: number; won?: boolean; result?: string }) => string
  ) => {
    try {
      const res = await fn();
      if (!res.success) { handleError(res.error); return; }
      const custom = msg?.(res);
      showResult(res.points ?? 0, custom);
    } catch {
      handleError('Error de conexión');
    }
  };

  return (
    <AppShell>
      <PageContainer>
        <button onClick={() => game === 'menu' ? navigate('/') : setGame('menu')} className="flex items-center gap-2 text-white/50 mb-6">
          <ArrowLeft size={18} /> {game === 'menu' ? 'Hub' : 'Arena'}
        </button>

        <AnimatePresence mode="wait">
          {game === 'menu' && (
            <motion.div key="menu" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <h2 className="text-page-title font-black gradient-text mb-1">Arena</h2>
              <p className="text-white/40 text-sm mb-6">1 juego de cada tipo por día · confetti incluido 🎉</p>
              <div className="grid gap-3">
                {GAME_LIST.map((g, i) => (
                  <motion.div key={g.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
                    <GlassCard glow={g.color} className="p-5 cursor-pointer relative" onClick={() => setInfoGame(g.id as GameActionKey)} whileHover={{ scale: 1.02, x: 4 }}>
                      <span className="absolute top-3 right-3 w-5 h-5 rounded-full bg-white/10 text-[10px] font-bold text-white/50 flex items-center justify-center">i</span>
                      <div className="flex items-center gap-4">
                        <span className="text-3xl">{g.icon}</span>
                        <div>
                          <p className="font-bold">{g.title}</p>
                          <p className="text-xs text-white/50">{g.desc}</p>
                        </div>
                      </div>
                    </GlassCard>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {game === 'redlight' && <RedLightGame onFinish={(s) => run(() => api.redLight(s))} onBack={() => setGame('menu')} />}
          {game === 'trivia' && <TriviaGame onFinish={(c) => run(() => api.trivia(c))} onBack={() => setGame('menu')} />}
          {game === 'ddakji' && <DdakjiGame onFinish={(w) => run(() => api.ddakji(w))} onBack={() => setGame('menu')} />}
          {game === 'glass' && <GlassBridgeGame onFinish={(s) => run(() => api.glassBridge(s))} onBack={() => setGame('menu')} />}
          {game === 'honeycomb' && <HoneycombGame onFinish={(p) => run(() => api.honeycomb(p))} onBack={() => setGame('menu')} />}
          {game === 'mystery' && <MysteryBoxGame onFinish={(i) => run(() => api.mysteryBox(i))} onBack={() => setGame('menu')} />}
          {game === 'coin' && <CoinFlipGame onFinish={(c, b) => run(() => api.coinFlip(c, b), (r) => r.won ? `¡${r.result}! +${r.points} Puntos` : `${r.result} — ${r.points} Puntos`)} onBack={() => setGame('menu')} />}
          {game === 'tug' && <TugWarGame onFinish={(t) => run(() => api.tugWar(t))} onBack={() => setGame('menu')} />}
        </AnimatePresence>

        {(toast || error) && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className={`fixed left-1/2 -translate-x-1/2 z-50 glass-strong px-6 py-3 rounded-2xl font-semibold toast-above-nav max-w-[min(22rem,calc(100vw-2rem))] text-center ${error ? 'text-reto-red' : ''}`}>
            {error || toast}
          </motion.div>
        )}

        <AnimatePresence>
          {infoGame && (
            <ActionInfoModal
              info={GAME_ACTION_INFO[infoGame]}
              onClose={() => setInfoGame(null)}
              onConfirm={() => {
                playClickSound();
                setGame(infoGame);
                setInfoGame(null);
              }}
              confirmLabel="Jugar ahora"
            />
          )}
        </AnimatePresence>
      </PageContainer>
    </AppShell>
  );
}

function RedLightGame({ onFinish, onBack }: { onFinish: (s: boolean) => void; onBack: () => void }) {
  const [light, setLight] = useState<'red' | 'green'>('green');
  const scoreRef = useRef(0);
  const lightRef = useRef(light);
  lightRef.current = light;

  useEffect(() => {
    scoreRef.current = 0;
    let alive = true;
    const loop = setInterval(() => {
      if (!alive) return;
      setLight((l) => (Math.random() > 0.4 ? (l === 'green' ? 'red' : 'green') : l));
    }, 700 + Math.random() * 900);

    const tap = () => {
      if (lightRef.current === 'red') { alive = false; clearInterval(loop); onFinish(false); }
      else {
        scoreRef.current++;
        playClickSound();
        if (scoreRef.current >= 10) { alive = false; clearInterval(loop); onFinish(true); }
      }
    };
    window.addEventListener('pointerdown', tap);
    return () => { alive = false; clearInterval(loop); window.removeEventListener('pointerdown', tap); };
  }, [onFinish]);

  return (
    <motion.div key="rl" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center">
      <motion.div animate={{ backgroundColor: light === 'green' ? '#06d6a0' : '#ef233c', boxShadow: light === 'green' ? '0 0 80px rgba(6,214,160,0.6)' : '0 0 80px rgba(239,35,60,0.8)' }}
        className="game-light mb-6 sm:mb-8">
        <span className="text-xl sm:text-3xl font-black">{light === 'green' ? 'VERDE' : 'ROJO'}</span>
      </motion.div>
      <p className="text-white/60">Toca en VERDE · meta: 10</p>
      <button onClick={onBack} className="mt-6 text-white/40 text-sm">Salir</button>
    </motion.div>
  );
}

function TriviaGame({ onFinish, onBack }: { onFinish: (c: boolean) => void; onBack: () => void }) {
  const [questions, setQuestions] = useState<TriviaQuestion[]>(FALLBACK_TRIVIA);
  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);

  useEffect(() => {
    api.triviaQuestions().then((r) => {
      if (r.success && r.questions?.length) setQuestions(r.questions);
    });
  }, []);

  const answer = (i: number) => {
    haptic('light');
    const correct = i === questions[idx].correct;
    if (correct) setScore((s) => s + 1);
    if (idx < questions.length - 1) setIdx((x) => x + 1);
    else onFinish(score + (correct ? 1 : 0) >= 2);
  };

  const q = questions[idx];
  if (!q) return null;

  return (
    <GlassCard strong className="p-6">
      <p className="text-xs text-white/40 mb-2">{idx + 1}/{questions.length}</p>
      <p className="text-lg font-bold mb-6">{q.q}</p>
      <div className="space-y-3">
        {q.options.map((opt, i) => (
          <motion.button key={opt} whileTap={{ scale: 0.98 }} className="w-full glass-btn py-4 rounded-xl font-semibold" onClick={() => answer(i)}>{opt}</motion.button>
        ))}
      </div>
      <button onClick={onBack} className="mt-4 text-white/40 text-sm w-full">Salir</button>
    </GlassCard>
  );
}

function DdakjiGame({ onFinish, onBack }: { onFinish: (w: boolean) => void; onBack: () => void }) {
  const [power, setPower] = useState(0);
  const [flipped, setFlipped] = useState<boolean | null>(null);

  useEffect(() => {
    const id = setInterval(() => setPower((p) => (p >= 100 ? 0 : p + 4)), 50);
    return () => clearInterval(id);
  }, []);

  const flip = () => {
    if (flipped !== null) return;
    const won = power >= 40 && power <= 75;
    setFlipped(won);
    setTimeout(() => onFinish(won), 1200);
  };

  return (
    <div className="text-center">
      <motion.div animate={{ rotateY: flipped === true ? 180 : 0 }} className="w-32 h-32 mx-auto mb-6 rounded-2xl glass-strong flex items-center justify-center text-4xl">
        {flipped === null ? '🟥' : flipped ? '✅' : '❌'}
      </motion.div>
      <div className="h-3 rounded-full bg-white/10 mb-4 overflow-hidden">
        <motion.div className="h-full bg-reto-gold" style={{ width: `${power}%` }} />
      </div>
      <p className="text-sm text-white/50 mb-4">Toca en la zona dorada (40-75%)</p>
      <motion.button whileTap={{ scale: 0.95 }} onClick={flip} className="glass-btn px-10 py-4 rounded-2xl font-bold">¡FLIP!</motion.button>
      <button onClick={onBack} className="block mx-auto mt-4 text-white/40 text-sm">Salir</button>
    </div>
  );
}

function GlassBridgeGame({ onFinish, onBack }: { onFinish: (steps: number) => void; onBack: () => void }) {
  const [step, setStep] = useState(0);
  const [dead, setDead] = useState(false);
  const trap = useRef(Math.random() > 0.5 ? 0 : 1);

  const pick = (side: number) => {
    if (dead) return;
    if (side === trap.current) { setDead(true); setTimeout(() => onFinish(step), 1000); }
    else {
      const next = step + 1;
      setStep(next);
      trap.current = Math.random() > 0.5 ? 0 : 1;
      if (next >= 8) setTimeout(() => onFinish(8), 500);
    }
  };

  return (
    <div className="text-center">
      <p className="mb-4 text-white/60">Paso {step}/8 · elige la baldosa segura</p>
      <div className="flex gap-3 sm:gap-4 justify-center mb-6 flex-wrap">
        {[0, 1].map((s) => (
          <motion.button key={s} whileHover={{ scale: 1.05 }} onClick={() => pick(s)}
            className={`game-tile rounded-2xl glass-strong ${dead ? 'opacity-50' : ''}`}>
            {dead && s === trap.current ? '💥' : '🟦'}
          </motion.button>
        ))}
      </div>
      <button onClick={onBack} className="text-white/40 text-sm">Salir</button>
    </div>
  );
}

function HoneycombGame({ onFinish, onBack }: { onFinish: (p: number) => void; onBack: () => void }) {
  const { wrapRef, canvasRef } = useSquareCanvas(300);
  const [precision, setPrecision] = useState<number | null>(null);

  const startDraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    let drawing = false;
    let points = 0;
    let total = 0;

    const onStart = (e: PointerEvent) => { drawing = true; ctx.beginPath(); ctx.moveTo(e.offsetX, e.offsetY); };
    const onMove = (e: PointerEvent) => {
      if (!drawing) return;
      total++;
      const cx = canvas.clientWidth / 2;
      const cy = canvas.clientHeight / 2;
      const dist = Math.hypot(e.offsetX - cx, e.offsetY - cy);
      const radius = canvas.clientWidth * 0.28;
      const band = canvas.clientWidth * 0.1;
      if (dist >= radius - band && dist <= radius + band) points++;
      ctx.lineTo(e.offsetX, e.offsetY);
      ctx.strokeStyle = '#ffbe0b'; ctx.lineWidth = 3; ctx.stroke();
    };
    const onEnd = () => {
      drawing = false;
      const p = total ? Math.round((points / total) * 100) : 0;
      setPrecision(p);
      setTimeout(() => onFinish(p), 800);
      canvas.removeEventListener('pointerdown', onStart);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onEnd);
    };
    canvas.addEventListener('pointerdown', onStart);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onEnd);
  }, [canvasRef, onFinish]);

  useEffect(() => { startDraw(); }, [startDraw]);

  return (
    <GlassCard className="p-4 text-center">
      <p className="text-sm text-white/60 mb-4">Traza el círculo sin salirte</p>
      <div ref={wrapRef} className="game-canvas-wrap">
        <canvas ref={canvasRef} className="bg-white/5 touch-none" />
      </div>
      {precision !== null && <p className="mt-2 text-reto-gold font-bold">{precision}% precisión</p>}
      <button onClick={onBack} className="mt-4 text-white/40 text-sm">Salir</button>
    </GlassCard>
  );
}

function MysteryBoxGame({ onFinish, onBack }: { onFinish: (i: number) => void; onBack: () => void }) {
  const [picked, setPicked] = useState<number | null>(null);
  return (
    <div className="text-center">
      <p className="text-white/60 mb-6">Elige un cofre</p>
      <div className="flex gap-3 sm:gap-4 justify-center flex-wrap">
        {[0, 1, 2].map((i) => (
          <motion.button key={i} whileHover={{ scale: 1.1, rotate: 5 }} whileTap={{ scale: 0.9 }}
            disabled={picked !== null} onClick={() => { setPicked(i); setTimeout(() => onFinish(i), 600); }}
            className="game-chest-btn glass-strong rounded-2xl disabled:opacity-60">📦</motion.button>
        ))}
      </div>
      <button onClick={onBack} className="mt-8 text-white/40 text-sm">Salir</button>
    </div>
  );
}

function CoinFlipGame({ onFinish, onBack }: { onFinish: (c: string, b: number) => void; onBack: () => void }) {
  const [bet, setBet] = useState(50);
  const [spinning, setSpinning] = useState(false);

  const flip = (choice: string) => {
    if (spinning) return;
    setSpinning(true);
    celebrateCoin();
    setTimeout(() => { setSpinning(false); onFinish(choice, bet); }, 1500);
  };

  return (
    <GlassCard strong className="p-6 text-center">
      <motion.div animate={{ rotateY: spinning ? 720 : 0 }} transition={{ duration: 1.5 }} className="text-7xl mb-6">🪙</motion.div>
      <p className="text-sm text-white/50 mb-4">Apuesta: {bet} Puntos</p>
      <input type="range" min={20} max={200} step={10} value={bet} onChange={(e) => setBet(+e.target.value)} className="w-full mb-6" />
      <div className="flex gap-3">
        <button onClick={() => flip('heads')} className="flex-1 glass-btn py-4 rounded-xl font-bold">Cara</button>
        <button onClick={() => flip('tails')} className="flex-1 glass-btn py-4 rounded-xl font-bold">Cruz</button>
      </div>
      <button onClick={onBack} className="mt-4 text-white/40 text-sm">Salir</button>
    </GlassCard>
  );
}

function TugWarGame({ onFinish, onBack }: { onFinish: (taps: number) => void; onBack: () => void }) {
  const [taps, setTaps] = useState(0);
  const [time, setTime] = useState(10);
  const finishedRef = useRef(false);
  const tapsRef = useRef(0);
  tapsRef.current = taps;

  useEffect(() => {
    if (time <= 0 && !finishedRef.current) {
      finishedRef.current = true;
      onFinish(tapsRef.current);
      return;
    }
    const id = setTimeout(() => setTime((t) => t - 1), 1000);
    return () => clearTimeout(id);
  }, [time, onFinish]);

  return (
    <div className="text-center">
      <motion.p key={time} initial={{ scale: 1.5 }} animate={{ scale: 1 }} className="text-5xl font-black gradient-text mb-2">{time}s</motion.p>
      <p className="text-3xl font-bold text-reto-gold mb-6">{taps} taps</p>
      <motion.button whileTap={{ scale: 0.92 }} onClick={() => { setTaps((t) => t + 1); playClickSound(); }}
        className="game-tap-btn glass-strong text-lg sm:text-xl font-black"
        style={{ boxShadow: '0 0 40px rgba(255,0,110,0.4)' }}>TIRA</motion.button>
      <button onClick={onBack} className="mt-6 text-white/40 text-sm">Salir</button>
    </div>
  );
}
