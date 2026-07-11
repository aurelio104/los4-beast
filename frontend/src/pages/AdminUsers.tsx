import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  KeyRound,
  Fingerprint,
  Trash2,
  UserX,
  UserCheck,
  MessageCircle,
  Shield,
  ChevronDown,
  ChevronUp,
  UserPlus,
  Copy
} from 'lucide-react';
import { AppShell } from '../components/AppShell';
import { PageContainer } from '../components/PageContainer';
import { GlassCard } from '../components/GlassCard';
import { PasswordInput } from '../components/PasswordInput';
import { PasswordStrengthMeter } from '../components/PasswordStrengthMeter';
import { api } from '../lib/api';
import { isPasswordOrPinValid, passwordHint } from '../lib/pinPassword';
import { shareInviteLink } from '../lib/inviteShare';
import { openWaMe, WhatsAppResult } from '../lib/whatsapp';

type AdminUser = {
  id: string;
  username: string;
  email: string;
  displayName: string;
  nickname: string | null;
  role: string;
  phone?: string | null;
  whatsappOptIn?: boolean;
  passkeyRegistered?: boolean;
  points?: number;
  isActive?: boolean;
  createdAt?: string;
};

export default function AdminUsers() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [includeInactive, setIncludeInactive] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [toast, setToast] = useState('');
  const [loading, setLoading] = useState(true);

  const [resetPassword, setResetPassword] = useState('');
  const [resetConfirm, setResetConfirm] = useState('');
  const [resetting, setResetting] = useState(false);
  const [lastWaReset, setLastWaReset] = useState<WhatsAppResult | null>(null);

  const [actionUserId, setActionUserId] = useState<string | null>(null);

  const [inviteLink, setInviteLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [creatingInvite, setCreatingInvite] = useState(false);
  const [waInviteName, setWaInviteName] = useState('');
  const [waInvitePhone, setWaInvitePhone] = useState('');
  const [waInviting, setWaInviting] = useState(false);
  const [lastWaInvite, setLastWaInvite] = useState<WhatsAppResult | null>(null);
  const [lastInviteLink, setLastInviteLink] = useState('');

  const showToast = (msg: string, ms = 3500) => {
    setToast(msg);
    setTimeout(() => setToast(''), ms);
  };

  const load = () => {
    setLoading(true);
    api
      .adminUsers(includeInactive)
      .then((r) => {
        if (r.success) setUsers(r.users);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [includeInactive]);

  const generateInvite = async () => {
    setCreatingInvite(true);
    try {
      const r = await api.adminCreateInvite();
      if (!r.success || !r.invite) throw new Error(r.error || 'Error');
      const url = `${window.location.origin}/join/${r.invite.code}`;
      setInviteLink(url);
      showToast('Link personal creado — compártelo con el invitado');
    } catch (e) {
      showToast((e as Error).message);
    } finally {
      setCreatingInvite(false);
    }
  };

  const sendWhatsAppInvite = async () => {
    if (!waInvitePhone.trim()) {
      showToast('Indica el WhatsApp del invitado');
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
          showToast('Invitación enviada por WhatsApp');
          setWaInvitePhone('');
          setWaInviteName('');
        } else if (r.whatsapp.waMeUrl) {
          openWaMe(r.whatsapp.waMeUrl);
          showToast('Abre WhatsApp para enviar la invitación');
        } else {
          showToast('Link creado — copia y envía manualmente');
        }
      }
    } catch (e) {
      showToast((e as Error).message);
    } finally {
      setWaInviting(false);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
    setResetPassword('');
    setResetConfirm('');
    setLastWaReset(null);
  };

  const resetUserPassword = async (userId: string) => {
    if (!isPasswordOrPinValid(resetPassword)) {
      showToast(passwordHint());
      return;
    }
    if (resetPassword !== resetConfirm) {
      showToast('Las contraseñas no coinciden');
      return;
    }
    setResetting(true);
    setLastWaReset(null);
    try {
      const r = await api.adminResetPassword(userId, resetPassword);
      if (!r.success) throw new Error(r.error || 'Error al resetear');
      const name = r.user?.displayName || r.user?.username || 'Usuario';
      setResetPassword('');
      setResetConfirm('');
      if (r.whatsapp) {
        setLastWaReset(r.whatsapp);
        if (!r.whatsapp.sent && r.whatsapp.waMeUrl) {
          openWaMe(r.whatsapp.waMeUrl);
          showToast(`Contraseña actualizada · Abre WhatsApp para enviar a ${name}`);
        } else if (r.whatsapp.sent) {
          showToast(`Contraseña enviada por WhatsApp a ${name}`);
        } else {
          showToast(`Contraseña actualizada para ${name}`);
        }
      } else {
        showToast(`Contraseña actualizada para ${name}`);
      }
    } catch (e) {
      showToast((e as Error).message);
    } finally {
      setResetting(false);
    }
  };

  const resetPasskey = async (userId: string) => {
    if (!window.confirm('¿Quitar la passkey de este usuario? Tendrá que registrarla de nuevo.')) return;
    setActionUserId(userId);
    try {
      const r = await api.adminResetPasskey(userId);
      if (!r.success) throw new Error(r.error || 'Error');
      showToast('Passkey eliminada');
      load();
    } catch (e) {
      showToast((e as Error).message);
    } finally {
      setActionUserId(null);
    }
  };

  const toggleActive = async (user: AdminUser) => {
    const next = !user.isActive;
    const label = next ? 'reactivar' : 'desactivar';
    if (!window.confirm(`¿${label.charAt(0).toUpperCase() + label.slice(1)} a ${user.displayName}?`)) return;
    setActionUserId(user.id);
    try {
      const r = await api.adminSetUserActive(user.id, next);
      if (!r.success) throw new Error(r.error || 'Error');
      showToast(next ? 'Usuario reactivado' : 'Usuario desactivado');
      load();
    } catch (e) {
      showToast((e as Error).message);
    } finally {
      setActionUserId(null);
    }
  };

  const deleteUser = async (user: AdminUser) => {
    if (!window.confirm(`¿Eliminar a ${user.displayName}? Se borra la cuenta y todo su progreso.`)) return;
    setActionUserId(user.id);
    try {
      const r = await api.adminDeleteUser(user.id);
      if (!r.success) throw new Error(r.error || 'Error');
      showToast('Usuario eliminado');
      setExpandedId(null);
      load();
    } catch (e) {
      showToast((e as Error).message);
    } finally {
      setActionUserId(null);
    }
  };

  return (
    <AppShell>
      <PageContainer>
        <button type="button" onClick={() => navigate('/admin')} className="flex items-center gap-2 text-white/50 mb-6">
          <ArrowLeft size={18} /> Panel Admin
        </button>

        <div className="flex items-center justify-between gap-3 mb-4">
          <h2 className="text-2xl font-black gradient-text">Gestión de usuarios</h2>
          <span className="text-xs text-white/40 tabular-nums">{users.length} cuentas</span>
        </div>

        <GlassCard strong glow="gold" className="p-5 mb-4">
          <p className="text-sm font-bold mb-1 flex items-center gap-2"><UserPlus size={16} /> Invitar · Link personal</p>
          <p className="text-xs text-white/50 mb-3">Un solo uso · válido 14 días · el invitado elige correo y contraseña.</p>
          {inviteLink && (
            <p className="text-xs text-white/50 break-all mb-3 p-2 rounded-lg bg-white/5">{inviteLink}</p>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={generateInvite}
              disabled={creatingInvite}
              className="flex-1 glass-btn py-3 rounded-xl flex items-center justify-center gap-2 font-semibold"
            >
              <UserPlus size={18} />{creatingInvite ? '...' : 'Generar link'}
            </button>
            {inviteLink && (
              <button
                type="button"
                onClick={async () => {
                  const code = inviteLink.split('/join/')[1] || '';
                  await shareInviteLink(code);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="flex-1 glass-btn py-3 rounded-xl flex items-center justify-center gap-2 font-semibold"
              >
                <Copy size={18} />{copied ? '¡Copiado!' : 'Compartir'}
              </button>
            )}
          </div>
        </GlassCard>

        <GlassCard strong glow="gold" className="p-5 mb-4 space-y-3">
          <p className="text-sm font-bold flex items-center gap-2">
            <MessageCircle size={16} className="text-[#25D366]" /> Invitar por WhatsApp
          </p>
          <div>
            <label className="text-xs text-white/40 mb-1 block">Nombre del invitado (opcional)</label>
            <input value={waInviteName} onChange={(e) => setWaInviteName(e.target.value)} placeholder="Ej. Omar" />
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
            {waInviting ? 'Enviando…' : 'Enviar invitación'}
          </button>
          {lastInviteLink && (
            <button
              type="button"
              onClick={async () => {
                await navigator.clipboard.writeText(lastInviteLink);
                showToast('Link copiado');
              }}
              className="glass-btn w-full py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-2"
            >
              <Copy size={14} /> Copiar link
            </button>
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

        <label className="flex items-center gap-2 text-xs text-white/50 mb-4 cursor-pointer">
          <input
            type="checkbox"
            checked={includeInactive}
            onChange={(e) => setIncludeInactive(e.target.checked)}
            className="rounded"
          />
          Mostrar cuentas desactivadas
        </label>

        {loading && <p className="text-center text-white/30 py-8">Cargando…</p>}

        <div className="space-y-2">
          {users.map((u) => {
            const open = expandedId === u.id;
            const busy = actionUserId === u.id;
            const isAdmin = u.role === 'MASTER';

            return (
              <GlassCard key={u.id} className={`overflow-hidden ${!u.isActive ? 'opacity-60' : ''}`}>
                <button
                  type="button"
                  onClick={() => toggleExpand(u.id)}
                  className="w-full p-4 flex items-center gap-3 text-left"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-bold truncate">{u.displayName}</p>
                      {isAdmin && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-reto-gold/20 text-reto-gold font-bold flex items-center gap-0.5">
                          <Shield size={10} /> Admin
                        </span>
                      )}
                      {!u.isActive && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/10 text-white/50">Inactivo</span>
                      )}
                    </div>
                    <p className="text-xs text-white/45 truncate">@{u.username} · {u.email}</p>
                    <div className="flex flex-wrap gap-2 mt-1.5 text-[10px] text-white/35">
                      <span>{u.points ?? 0} Puntos</span>
                      {u.passkeyRegistered && <span className="text-reto-cyan">Passkey ✓</span>}
                      {u.phone && <span>{u.whatsappOptIn ? 'WA ✓' : 'WA ○'}</span>}
                    </div>
                  </div>
                  {open ? <ChevronUp size={18} className="text-white/40 shrink-0" /> : <ChevronDown size={18} className="text-white/40 shrink-0" />}
                </button>

                <AnimatePresence>
                  {open && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-white/10"
                    >
                      <div className="p-4 space-y-4">
                        <div className="space-y-2">
                          <p className="text-xs font-bold text-white/60 flex items-center gap-1.5">
                            <KeyRound size={14} /> Restablecer contraseña
                          </p>
                          <PasswordInput
                            value={resetPassword}
                            onChange={setResetPassword}
                            autoComplete="new-password"
                            placeholder={passwordHint()}
                          />
                          {resetPassword && !/^\d{4,6}$/.test(resetPassword) && (
                            <PasswordStrengthMeter password={resetPassword} />
                          )}
                          <PasswordInput
                            value={resetConfirm}
                            onChange={setResetConfirm}
                            autoComplete="new-password"
                            placeholder="Confirmar contraseña"
                          />
                          <button
                            type="button"
                            onClick={() => resetUserPassword(u.id)}
                            disabled={
                              resetting ||
                              !isPasswordOrPinValid(resetPassword) ||
                              resetPassword !== resetConfirm
                            }
                            className="w-full py-2.5 rounded-xl text-sm font-bold disabled:opacity-40"
                            style={{ background: 'linear-gradient(135deg, #8338ec, #ff006e)' }}
                          >
                            {resetting ? 'Guardando…' : 'Actualizar contraseña'}
                          </button>
                          {lastWaReset?.waMeUrl && !lastWaReset.sent && expandedId === u.id && (
                            <button
                              type="button"
                              onClick={() => openWaMe(lastWaReset.waMeUrl!)}
                              className="w-full glass-btn py-2 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 text-[#25D366]"
                            >
                              <MessageCircle size={16} /> Reenviar por WhatsApp
                            </button>
                          )}
                        </div>

                        {u.passkeyRegistered && (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => resetPasskey(u.id)}
                            className="w-full glass-btn py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
                          >
                            <Fingerprint size={16} /> Quitar passkey
                          </button>
                        )}

                        {!isAdmin && (
                          <>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => toggleActive(u)}
                              className="w-full glass-btn py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
                            >
                              {u.isActive ? (
                                <>
                                  <UserX size={16} /> Desactivar cuenta
                                </>
                              ) : (
                                <>
                                  <UserCheck size={16} /> Reactivar cuenta
                                </>
                              )}
                            </button>

                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => deleteUser(u)}
                              className="w-full py-2.5 rounded-xl text-sm font-bold bg-reto-red/20 text-reto-red border border-reto-red/30 flex items-center justify-center gap-2"
                            >
                              <Trash2 size={16} />
                              {busy ? 'Eliminando…' : 'Eliminar usuario'}
                            </button>
                          </>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </GlassCard>
            );
          })}
        </div>

        {!loading && !users.length && (
          <p className="text-center text-white/30 py-8">No hay usuarios</p>
        )}

        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 glass-strong px-6 py-3 rounded-2xl z-50 max-w-[90vw] text-center text-sm"
          >
            {toast}
          </motion.div>
        )}</PageContainer>
    </AppShell>
  );
}
