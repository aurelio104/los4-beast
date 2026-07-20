import { useState, useEffect, Suspense, type ComponentType, type LazyExoticComponent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AppShell } from '../components/AppShell';
import { MainTabLayout } from '../components/MainTabLayout';
import { PageContainer } from '../components/PageContainer';
import { PageTopBar } from '../components/PageTopBar';
import { GlassCard } from '../components/GlassCard';
import { ActionInfoModal } from '../components/ActionInfoModal';
import { RouteFallback } from '../components/RouteFallback';
import { useNotifications } from '../components/NotificationProvider';
import { api } from '../lib/api';
import { celebrateWin } from '../lib/celebrate';
import { playClickSound } from '../lib/sounds';
import { GAME_LIST } from '../types';
import { GAME_ACTION_INFO, GameActionKey } from '../lib/actionInfo';
import { lazyWithRetry } from '../lib/lazyWithRetry';
import DdakjiGame from '../games/ddakji/DdakjiGame';
import GlassBridgeGame from '../games/glass/GlassBridgeGame';
import HoneycombGame from '../games/honeycomb/HoneycombGame';
import MysteryBoxGame from '../games/mystery/MysteryBoxGame';
import CoinFlipGame from '../games/coin/CoinFlipGame';
import TugWarGame from '../games/tug/TugWarGame';
import TriviaGame from '../games/trivia/TriviaGame';

type RedLightProps = { onFinish: (success: boolean) => void; onBack: () => void };

const RedLightGame = lazyWithRetry(
  () => import('../games/redlight/RedLightGame') as Promise<{ default: ComponentType<unknown> }>,
  'RedLightGame'
) as LazyExoticComponent<ComponentType<RedLightProps>>;

type GameId = typeof GAME_LIST[number]['id'] | 'menu';

export default function Arena() {
  const navigate = useNavigate();
  const { showAppToast } = useNotifications();
  const [searchParams] = useSearchParams();
  const [game, setGame] = useState<GameId>('menu');
  const [infoGame, setInfoGame] = useState<GameActionKey | null>(null);

  useEffect(() => {
    const g = searchParams.get('game');
    if (g && GAME_LIST.some((x) => x.id === g)) setGame(g as GameId);
  }, [searchParams]);

  const showResult = (points: number, msg?: string) => {
    celebrateWin(points);
    showAppToast(msg || `${points >= 0 ? '+' : ''}${points} Puntos`);
    setTimeout(() => setGame('menu'), 2500);
  };

  const handleError = (e?: string) => {
    showAppToast(e || 'Error');
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
    <AppShell background="celosia">
      <MainTabLayout>
      <PageContainer variant="tabbar">
        <PageTopBar
          onBack={() => (game === 'menu' ? navigate('/') : setGame('menu'))}
          backLabel={game === 'menu' ? 'Hub' : 'Arena'}
        />

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

          {game === 'redlight' && (
            <Suspense fallback={<RouteFallback />}>
              <RedLightGame onFinish={(s) => run(() => api.redLight(s))} onBack={() => setGame('menu')} />
            </Suspense>
          )}
          {game === 'trivia' && <TriviaGame onFinish={(c) => run(() => api.trivia(c))} onBack={() => setGame('menu')} />}
          {game === 'ddakji' && (
            <DdakjiGame onFinish={(w, level) => run(() => api.ddakji(w, level))} onBack={() => setGame('menu')} />
          )}
          {game === 'glass' && <GlassBridgeGame onFinish={(s) => run(() => api.glassBridge(s))} onBack={() => setGame('menu')} />}
          {game === 'honeycomb' && <HoneycombGame onFinish={(p) => run(() => api.honeycomb(p))} onBack={() => setGame('menu')} />}
          {game === 'mystery' && (
            <MysteryBoxGame
              onOpen={async (i) => {
                try {
                  const res = await api.mysteryBox(i);
                  if (!res.success) {
                    handleError(res.error);
                    return null;
                  }
                  return res;
                } catch {
                  handleError('Error de conexión');
                  return null;
                }
              }}
              onSettled={(res) => {
                const pts = res.points ?? res.gained ?? 0;
                const msg = res.won ? `¡Jackpot! +${pts} BP` : `Migajas +${pts} BP`;
                celebrateWin(pts);
                showAppToast(msg);
                window.setTimeout(() => setGame('menu'), 1400);
              }}
              onBack={() => setGame('menu')}
            />
          )}
          {game === 'coin' && (
            <CoinFlipGame
              onFlip={async (c, b) => {
                try {
                  const res = await api.coinFlip(c, b);
                  if (!res.success) {
                    handleError(res.error);
                    return null;
                  }
                  return res;
                } catch {
                  handleError('Error de conexión');
                  return null;
                }
              }}
              onSettled={(res) => {
                const delta = res.gained ?? 0;
                const face = res.result === 'tails' ? 'Cruz' : 'Cara';
                const msg = res.won
                  ? `¡${face}! +${Math.abs(delta)} BP`
                  : `${face} — ${delta} BP`;
                celebrateWin(delta);
                showAppToast(msg);
                window.setTimeout(() => setGame('menu'), 1400);
              }}
              onBack={() => setGame('menu')}
            />
          )}
          {game === 'tug' && <TugWarGame onFinish={(t) => run(() => api.tugWar(t))} onBack={() => setGame('menu')} />}
        </AnimatePresence>

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
      </MainTabLayout>
    </AppShell>
  );
}
