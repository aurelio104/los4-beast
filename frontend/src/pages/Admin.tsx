import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Shield, Users, Zap, Bell, Eye, Megaphone, Send, MessageCircle, UserCog, Skull, CalendarDays } from 'lucide-react';
import { AppShell } from '../components/AppShell';
import { PageContainer } from '../components/PageContainer';
import { PageTopBar } from '../components/PageTopBar';
import { GlassCard } from '../components/GlassCard';
import { useNotifications } from '../components/NotificationProvider';
import { api } from '../lib/api';
import { REWARDS } from '../types';

export default function Admin() {
  const navigate = useNavigate();
  const { showAppToast } = useNotifications();
  const [stats, setStats] = useState<Record<string, number> | null>(null);
  const [challengeDate, setChallengeDate] = useState('');
  const [redemptions, setRedemptions] = useState<{ id: string; rewardId: string; cost: number; userName: string; status: string }[]>([]);
  const [pushTitle, setPushTitle] = useState('Reto');
  const [pushBody, setPushBody] = useState('¡Entra al Hub y compite!');

  const load = () => {
    api.adminDashboard().then((r) => {
      if (r.success) {
        setStats(r.stats);
        setChallengeDate(r.challengeDate);
        setRedemptions(r.redemptions as typeof redemptions);
      }
    });
  };

  useEffect(() => {
    load();
  }, []);

  const act = async (label: string, fn: () => Promise<{ success: boolean; sent?: number }>) => {
    const r = await fn();
    showAppToast(r.success ? `${label} ✓${r.sent !== undefined ? ` (${r.sent} enviados)` : ''}` : 'Error');
  };

  const updateRedemption = async (id: string, status: string) => {
    await api.adminUpdateRedemption(id, status);
    showAppToast(`Canje → ${status}`);
    load();
  };

  return (
    <AppShell>
      <PageContainer>
        <PageTopBar onBack={() => navigate('/')} />

        <div className="flex items-center gap-3 mb-6">
          <Shield className="text-reto-gold" size={28} />
          <h2 className="text-page-title font-black gradient-text">Panel Admin</h2>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <button
            type="button"
            onClick={() => navigate('/admin/users')}
            className="py-4 px-3 rounded-2xl font-bold flex flex-col items-center justify-center gap-2 text-center glass-btn border border-reto-gold/30 min-h-[5.5rem]"
          >
            <UserCog size={22} className="text-reto-gold shrink-0" />
            <span className="text-xs sm:text-sm leading-tight">Gestión de usuarios</span>
          </button>
          <button
            type="button"
            onClick={() => navigate('/admin/whatsapp')}
            className="py-4 px-3 rounded-2xl font-bold flex flex-col items-center justify-center gap-2 text-center min-h-[5.5rem] btn-whatsapp"
          >
            <MessageCircle size={22} className="shrink-0" />
            <span className="text-xs sm:text-sm leading-tight">WhatsApp</span>
          </button>
        </div>

        <div className="stats-grid mb-6">
          {[
            { icon: Users, label: 'Jugadores', key: 'players' },
            { icon: Zap, label: 'Acciones', key: 'actions' },
            { icon: Shield, label: 'Canjes', key: 'redemptions' },
            { icon: Eye, label: 'Confesiones', key: 'confessions' },
            { icon: Megaphone, label: 'Push subs', key: 'pushSubs' },
            { icon: Bell, label: 'Votos', key: 'votes' }
          ].map((s, i) => (
            <GlassCard key={s.key} className="p-3 text-center" glow="purple">
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: i * 0.05 }}>
                <s.icon size={16} className="mx-auto text-white/50 mb-1" />
                <p className="text-lg font-black">{stats?.[s.key] ?? '—'}</p>
                <p className="text-[9px] text-white/40 uppercase">{s.label}</p>
              </motion.div>
            </GlassCard>
          ))}
        </div>

        <GlassCard className="p-5 mb-4 space-y-3">
          <p className="text-sm font-bold flex items-center gap-2"><Send size={16} /> Push personalizado</p>
          <input value={pushTitle} onChange={(e) => setPushTitle(e.target.value)} placeholder="Título" />
          <input value={pushBody} onChange={(e) => setPushBody(e.target.value)} placeholder="Mensaje" />
          <button type="button" onClick={() => act('Push enviado', () => api.pushBroadcast(pushTitle, pushBody))}
            className="w-full glass-btn py-3 rounded-xl font-semibold">Enviar a todos</button>
        </GlassCard>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <button type="button" onClick={() => act('Notificación evento', api.adminNotifyEvent)} className="glass-btn py-4 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2">
            <Megaphone size={16} /> Notificar evento
          </button>
          <button type="button" onClick={() => act('Confesiones reveladas', api.adminRevealConfessions)} className="glass-btn py-4 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2">
            <Skull size={16} /> Revelar confesiones
          </button>
        </div>

        <GlassCard className="p-5 mb-4">
          <p className="text-sm font-bold mb-1 flex items-center gap-2"><CalendarDays size={16} /> Reto final</p>
          <p className="text-white/60 text-sm">{new Date(challengeDate).toLocaleString('es-VE', { dateStyle: 'full', timeStyle: 'short' })}</p>
        </GlassCard>

        <p className="text-xs uppercase tracking-widest text-white/40 mb-3">Canjes</p>
        <div className="space-y-2">
          {redemptions.map((r) => {
            const reward = REWARDS.find((x) => x.id === r.rewardId);
            return (
              <GlassCard key={r.id} className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-sm font-semibold">{reward?.emoji} {reward?.title || r.rewardId}</p>
                    <p className="text-xs text-white/40">{r.userName} · {r.cost} Puntos</p>
                  </div>
                  <span className="text-xs px-2 py-1 rounded-full bg-reto-gold/20 text-reto-gold">{r.status}</span>
                </div>
                {r.status === 'PENDING' && (
                  <div className="flex gap-2">
                    <button type="button" onClick={() => updateRedemption(r.id, 'APPROVED')} className="flex-1 text-xs py-2 rounded-lg bg-reto-cyan/20">Aprobar</button>
                    <button type="button" onClick={() => updateRedemption(r.id, 'DELIVERED')} className="flex-1 text-xs py-2 rounded-lg bg-reto-gold/20">Entregado</button>
                  </div>
                )}
              </GlassCard>
            );
          })}
          {!redemptions.length && <p className="text-center text-white/30 py-4">Sin canjes aún</p>}
        </div>
      </PageContainer>
    </AppShell>
  );
}
