import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Copy, Shield, Users, Zap, Bell, Eye, Megaphone, Send } from 'lucide-react';
import { AppShell } from '../components/AppShell';
import { GlassCard } from '../components/GlassCard';
import { api } from '../lib/api';
import { REWARDS } from '../types';

export default function Admin() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<Record<string, number> | null>(null);
  const [inviteCode, setInviteCode] = useState('');
  const [challengeDate, setChallengeDate] = useState('');
  const [redemptions, setRedemptions] = useState<{ id: string; rewardId: string; cost: number; userName: string; status: string }[]>([]);
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState('');
  const [pushTitle, setPushTitle] = useState('🔥 Reto');
  const [pushBody, setPushBody] = useState('¡Entra al Hub y compite!');

  const load = () => api.adminDashboard().then((r) => {
    if (r.success) {
      setStats(r.stats);
      setInviteCode(r.inviteCode);
      setChallengeDate(r.challengeDate);
      setRedemptions(r.redemptions as typeof redemptions);
    }
  });

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user.role !== 'MASTER') { navigate('/'); return; }
    load();
  }, [navigate]);

  const inviteLink = `${window.location.origin}/join/${inviteCode}`;

  const act = async (label: string, fn: () => Promise<{ success: boolean; sent?: number }>) => {
    const r = await fn();
    setToast(r.success ? `${label} ✓${r.sent !== undefined ? ` (${r.sent} enviados)` : ''}` : 'Error');
    setTimeout(() => setToast(''), 3000);
  };

  const updateRedemption = async (id: string, status: string) => {
    await api.adminUpdateRedemption(id, status);
    setToast(`Canje → ${status}`);
    load();
    setTimeout(() => setToast(''), 2000);
  };

  return (
    <AppShell>
      <div className="max-w-lg mx-auto px-4 py-6 pb-24">
        <button type="button" onClick={() => navigate('/')} className="flex items-center gap-2 text-white/50 mb-6">
          <ArrowLeft size={18} /> Hub
        </button>

        <div className="flex items-center gap-3 mb-6">
          <Shield className="text-reto-gold" size={28} />
          <h2 className="text-2xl font-black gradient-text">Panel Admin</h2>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-6">
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

        <GlassCard strong glow="gold" className="p-5 mb-4">
          <p className="text-sm font-bold mb-2">🔗 Link de invitación</p>
          <p className="text-xs text-white/50 break-all mb-3">{inviteLink}</p>
          <button type="button" onClick={() => { navigator.clipboard.writeText(inviteLink); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
            className="w-full glass-btn py-3 rounded-xl flex items-center justify-center gap-2 font-semibold">
            <Copy size={18} />{copied ? '¡Copiado!' : 'Copiar link'}
          </button>
        </GlassCard>

        <GlassCard className="p-5 mb-4 space-y-3">
          <p className="text-sm font-bold flex items-center gap-2"><Send size={16} /> Push personalizado</p>
          <input value={pushTitle} onChange={(e) => setPushTitle(e.target.value)} placeholder="Título" />
          <input value={pushBody} onChange={(e) => setPushBody(e.target.value)} placeholder="Mensaje" />
          <button type="button" onClick={() => act('Push enviado', () => api.pushBroadcast(pushTitle, pushBody))}
            className="w-full glass-btn py-3 rounded-xl font-semibold">Enviar a todos</button>
        </GlassCard>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <button type="button" onClick={() => act('Notificación evento', api.adminNotifyEvent)} className="glass-btn py-4 rounded-2xl text-sm font-semibold">📢 Notificar evento</button>
          <button type="button" onClick={() => act('Confesiones reveladas', api.adminRevealConfessions)} className="glass-btn py-4 rounded-2xl text-sm font-semibold">💀 Revelar confesiones</button>
        </div>

        <GlassCard className="p-5 mb-4">
          <p className="text-sm font-bold mb-1">📅 Reto final</p>
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
                    <p className="text-xs text-white/40">{r.userName} · {r.cost} BP</p>
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

        {toast && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 glass-strong px-6 py-3 rounded-2xl z-50">{toast}</motion.div>
        )}
      </div>
    </AppShell>
  );
}
