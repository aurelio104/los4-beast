import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Copy, Shield, Users, Zap, Bell, Eye, Megaphone, Send, UserPlus, MessageCircle, UserCog } from 'lucide-react';
import { AppShell } from '../components/AppShell';
import { GlassCard } from '../components/GlassCard';
import { api } from '../lib/api';
import { shareInviteLink } from '../lib/inviteShare';
import { openWaMe, WhatsAppResult } from '../lib/whatsapp';
import { REWARDS } from '../types';

export default function Admin() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<Record<string, number> | null>(null);
  const [inviteLink, setInviteLink] = useState('');
  const [challengeDate, setChallengeDate] = useState('');
  const [redemptions, setRedemptions] = useState<{ id: string; rewardId: string; cost: number; userName: string; status: string }[]>([]);
  const [copied, setCopied] = useState(false);
  const [creatingInvite, setCreatingInvite] = useState(false);
  const [toast, setToast] = useState('');
  const [pushTitle, setPushTitle] = useState('🔥 Reto');
  const [pushBody, setPushBody] = useState('¡Entra al Hub y compite!');
  const [waInviteName, setWaInviteName] = useState('');
  const [waInvitePhone, setWaInvitePhone] = useState('');
  const [waInviting, setWaInviting] = useState(false);
  const [lastWaInvite, setLastWaInvite] = useState<WhatsAppResult | null>(null);
  const [lastInviteLink, setLastInviteLink] = useState('');

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
    setToast(r.success ? `${label} ✓${r.sent !== undefined ? ` (${r.sent} enviados)` : ''}` : 'Error');
    setTimeout(() => setToast(''), 3000);
  };

  const updateRedemption = async (id: string, status: string) => {
    await api.adminUpdateRedemption(id, status);
    setToast(`Canje → ${status}`);
    load();
    setTimeout(() => setToast(''), 2000);
  };

  const generateInvite = async () => {
    setCreatingInvite(true);
    try {
      const r = await api.adminCreateInvite();
      if (!r.success || !r.invite) throw new Error(r.error || 'Error');
      const url = `${window.location.origin}/join/${r.invite.code}`;
      setInviteLink(url);
      setToast('Invitación creada — compártela con un nuevo integrante');
    } catch (e) {
      setToast((e as Error).message);
    } finally {
      setCreatingInvite(false);
      setTimeout(() => setToast(''), 3000);
    }
  };

  const sendWhatsAppInvite = async () => {
    if (!waInvitePhone.trim()) {
      setToast('Indica el WhatsApp del invitado');
      return;
    }
    setWaInviting(true);
    setLastWaInvite(null);
    setLastInviteLink('');
    try {
      const r = await api.adminInviteWhatsApp({
        phone: waInvitePhone.trim(),
        displayName: waInviteName.trim() || undefined
      });
      if (!r.success || !r.joinUrl) throw new Error(r.error || 'Error al invitar');

      setLastInviteLink(r.joinUrl);

      if (r.whatsapp) {
        setLastWaInvite(r.whatsapp);
        if (r.whatsapp.sent) {
          setToast('Invitación enviada por WhatsApp — el invitado creará su correo y contraseña');
          setWaInvitePhone('');
          setWaInviteName('');
        } else if (r.whatsapp.waMeUrl) {
          openWaMe(r.whatsapp.waMeUrl);
          setToast('Link listo · Abre WhatsApp para enviar la invitación');
        } else {
          setToast('Link creado — WhatsApp no conectado, copia el link manualmente');
        }
      }
    } catch (e) {
      setToast((e as Error).message);
    } finally {
      setWaInviting(false);
      setTimeout(() => setToast(''), 5000);
    }
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

        <button
          type="button"
          onClick={() => navigate('/admin/users')}
          className="w-full mb-3 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 glass-btn border border-reto-gold/30"
        >
          <UserCog size={20} className="text-reto-gold" /> Gestión de usuarios
        </button>

        <button
          type="button"
          onClick={() => navigate('/admin/whatsapp')}
          className="w-full mb-4 py-4 rounded-2xl font-bold flex items-center justify-center gap-2"
          style={{ background: 'linear-gradient(135deg, #25D366, #128C7E)' }}
        >
          <MessageCircle size={20} /> WhatsApp — conectar y gestionar
        </button>

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
          <p className="text-sm font-bold mb-1 flex items-center gap-2"><UserPlus size={16} /> Invitar integrante</p>
          <p className="text-xs text-white/50 mb-3">Cada link es personal, de un solo uso y válido 14 días.</p>
          {inviteLink && (
            <p className="text-xs text-white/50 break-all mb-3 p-2 rounded-lg bg-white/5">{inviteLink}</p>
          )}
          <div className="flex gap-2">
            <button type="button" onClick={generateInvite} disabled={creatingInvite}
              className="flex-1 glass-btn py-3 rounded-xl flex items-center justify-center gap-2 font-semibold">
              <UserPlus size={18} />{creatingInvite ? '...' : 'Generar link'}
            </button>
            {inviteLink && (
              <button type="button" onClick={async () => {
                const code = inviteLink.split('/join/')[1] || '';
                await shareInviteLink(code);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
                className="flex-1 glass-btn py-3 rounded-xl flex items-center justify-center gap-2 font-semibold">
                <Copy size={18} />{copied ? '¡Copiado!' : 'Compartir'}
              </button>
            )}
          </div>
        </GlassCard>

        <GlassCard strong glow="gold" className="p-5 mb-4 space-y-3">
          <p className="text-sm font-bold mb-1 flex items-center gap-2">
            <MessageCircle size={16} className="text-[#25D366]" /> Invitar por WhatsApp
          </p>
          <p className="text-xs text-white/50 leading-relaxed">
            Envía un link personal por WhatsApp. El invitado abre el link y elige su correo y contraseña al registrarse.
          </p>
          <div>
            <label className="text-xs text-white/40 mb-1 block">Nombre del invitado (opcional)</label>
            <input value={waInviteName} onChange={(e) => setWaInviteName(e.target.value)} placeholder="Para saludarlo en el mensaje" />
          </div>
          <div>
            <label className="text-xs text-white/40 mb-1 block">WhatsApp del invitado</label>
            <input
              value={waInvitePhone}
              onChange={(e) => setWaInvitePhone(e.target.value)}
              placeholder="04141234567"
              inputMode="tel"
              autoComplete="tel"
            />
          </div>
          <button
            type="button"
            onClick={sendWhatsAppInvite}
            disabled={waInviting || !waInvitePhone.trim()}
            className="w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg, #25D366, #128C7E)' }}
          >
            <MessageCircle size={18} />
            {waInviting ? 'Enviando…' : 'Enviar invitación por WhatsApp'}
          </button>
          {lastInviteLink && (
            <div className="text-xs p-3 rounded-xl bg-white/5 space-y-2">
              <p className="text-white/50 break-all">{lastInviteLink}</p>
              <button
                type="button"
                onClick={async () => {
                  await navigator.clipboard.writeText(lastInviteLink);
                  setToast('Link copiado');
                }}
                className="glass-btn w-full py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-2"
              >
                <Copy size={14} /> Copiar link
              </button>
            </div>
          )}
          {lastWaInvite?.waMeUrl && !lastWaInvite.sent && (
            <button
              type="button"
              onClick={() => openWaMe(lastWaInvite.waMeUrl!)}
              className="w-full glass-btn py-2 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 text-[#25D366]"
            >
              <MessageCircle size={16} /> Reenviar por WhatsApp
            </button>
          )}
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
