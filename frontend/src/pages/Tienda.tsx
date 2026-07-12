import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { AppShell } from '../components/AppShell';
import { MainTabLayout } from '../components/MainTabLayout';
import { PageContainer } from '../components/PageContainer';
import { PageSkeleton } from '../components/PageSkeleton';
import { PageTopBar } from '../components/PageTopBar';
import { GlassCard } from '../components/GlassCard';
import { PointsBadge } from '../components/PointsBadge';
import { ActionInfoModal } from '../components/ActionInfoModal';
import { api } from '../lib/api';
import { REWARDS, User } from '../types';
import { REWARD_INFO } from '../lib/actionInfo';
import { celebrateWin } from '../lib/celebrate';
import { getStoredUser } from '../lib/user';
import { useNotifications } from '../components/NotificationProvider';

export default function Tienda() {
  const navigate = useNavigate();
  const { showAppToast } = useNotifications();
  const [user, setUser] = useState<User | null>(getStoredUser);
  const [hydrating, setHydrating] = useState(!getStoredUser());
  const [infoRewardId, setInfoRewardId] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (!stored) { navigate('/login'); return; }
    api.me().then((r) => {
      if (r.success) {
        setUser(r.user as User);
        localStorage.setItem('user', JSON.stringify(r.user));
      }
    }).finally(() => setHydrating(false));
  }, [navigate]);

  const redeem = async (rewardId: string, cost: number) => {
    const res = await api.redeem(rewardId, cost);
    if (res.success) {
      celebrateWin(-cost);
      showAppToast('¡Canjeado! Se entrega el 29 de agosto');
      const u = { ...user!, points: res.points };
      setUser(u);
      localStorage.setItem('user', JSON.stringify(u));
    } else {
      showAppToast(res.error || 'Error');
    }
  };

  if (hydrating && !user) {
    return (
      <AppShell background="celosia">
        <MainTabLayout>
          <PageContainer variant="tabbar"><PageSkeleton lines={5} /></PageContainer>
        </MainTabLayout>
      </AppShell>
    );
  }

  if (!user) return null;

  return (
    <AppShell background="celosia">
      <MainTabLayout>
      <PageContainer variant="tabbar">
        <PageTopBar onBack={() => navigate('/')} backLabel="Volver" />

        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-black gradient-text">Tienda</h2>
            <p className="text-xs text-white/40">Premios sociales · bajo costo</p>
          </div>
          <PointsBadge points={user.points} />
        </div>

        <GlassCard glow="gold" className="p-4 mb-6">
          <p className="text-sm text-white/70">
            🎯 Los canjes se <strong className="text-reto-gold">entregan en persona</strong> el 29 de agosto.
            La idea es reunirse y compartir — nada caro, puro drama amistoso.
          </p>
        </GlassCard>

        <div className="space-y-4">
          {REWARDS.map((r, i) => {
            const canAfford = user.points >= r.cost;
            return (
              <motion.div
                key={r.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
              >
                <GlassCard
                  className={`p-5 relative ${canAfford ? 'cursor-pointer' : 'opacity-50'}`}
                  glow={canAfford ? 'pink' : undefined}
                  whileHover={canAfford ? { scale: 1.02 } : {}}
                  onClick={() => setInfoRewardId(r.id)}
                >
                  <span className="absolute top-3 right-3 w-5 h-5 rounded-full bg-white/10 text-[10px] font-bold text-white/50 flex items-center justify-center">i</span>
                  <div className="flex items-center gap-4">
                    <motion.span
                      className="text-4xl"
                      animate={{ rotate: [0, 10, -10, 0] }}
                      transition={{ duration: 3, repeat: Infinity, delay: i * 0.5 }}
                    >
                      {r.emoji}
                    </motion.span>
                    <div className="flex-1">
                      <p className="font-bold">{r.title}</p>
                      <p className="text-xs text-white/50">{r.desc}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-reto-gold tabular-nums">{r.cost}</p>
                      <p className="text-[10px] text-white/30">Puntos</p>
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            );
          })}
        </div>

        <AnimatePresence>
          {infoRewardId && REWARD_INFO[infoRewardId] && (
            <ActionInfoModal
              info={REWARD_INFO[infoRewardId]}
              onClose={() => setInfoRewardId(null)}
              onConfirm={() => {
                const reward = REWARDS.find((x) => x.id === infoRewardId);
                if (reward && user && user.points >= reward.cost) {
                  redeem(reward.id, reward.cost);
                }
                setInfoRewardId(null);
              }}
              confirmLabel={
                user && REWARDS.find((x) => x.id === infoRewardId) && user.points >= REWARDS.find((x) => x.id === infoRewardId)!.cost
                  ? `Canjear (${REWARDS.find((x) => x.id === infoRewardId)!.cost} Puntos)`
                  : 'Puntos insuficientes'
              }
              disabled={!user || !REWARDS.find((x) => x.id === infoRewardId) || user.points < REWARDS.find((x) => x.id === infoRewardId)!.cost}
            />
          )}
        </AnimatePresence>      </PageContainer>
      </MainTabLayout>
    </AppShell>
  );
}
