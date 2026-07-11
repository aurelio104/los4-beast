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
  ChevronUp
} from 'lucide-react';
import { AppShell } from '../components/AppShell';
import { GlassCard } from '../components/GlassCard';
import { PasswordInput } from '../components/PasswordInput';
import { PasswordStrengthMeter } from '../components/PasswordStrengthMeter';
import { api } from '../lib/api';
import { isPasswordOrPinValid, passwordHint } from '../lib/pinPassword';
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
  const [deleteConfirm, setDeleteConfirm] = useState('');

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

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
    setResetPassword('');
    setResetConfirm('');
    setLastWaReset(null);
    setDeleteConfirm('');
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
    if (deleteConfirm !== user.username) {
      showToast(`Escribe @${user.username} para confirmar`);
      return;
    }
    if (!window.confirm(`Eliminar permanentemente a ${user.displayName}? Esta acción no se puede deshacer.`)) return;
    setActionUserId(user.id);
    try {
      const r = await api.adminDeleteUser(user.id);
      if (!r.success) throw new Error(r.error || 'Error');
      showToast('Usuario eliminado');
      setExpandedId(null);
      setDeleteConfirm('');
      load();
    } catch (e) {
      showToast((e as Error).message);
    } finally {
      setActionUserId(null);
    }
  };

  return (
    <AppShell>
      <div className="max-w-lg mx-auto px-4 py-6 pb-24">
        <button type="button" onClick={() => navigate('/admin')} className="flex items-center gap-2 text-white/50 mb-6">
          <ArrowLeft size={18} /> Panel Admin
        </button>

        <div className="flex items-center justify-between gap-3 mb-6">
          <h2 className="text-2xl font-black gradient-text">Gestión de usuarios</h2>
          <span className="text-xs text-white/40 tabular-nums">{users.length} cuentas</span>
        </div>

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
                      <span>{u.points ?? 0} BP</span>
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

                            <div className="pt-2 border-t border-white/10 space-y-2">
                              <p className="text-xs font-bold text-reto-red flex items-center gap-1.5">
                                <Trash2 size={14} /> Eliminar permanentemente
                              </p>
                              <p className="text-[11px] text-white/40">
                                Borra la cuenta y todo su progreso. Escribe <strong>@{u.username}</strong> para confirmar.
                              </p>
                              <input
                                value={deleteConfirm}
                                onChange={(e) => setDeleteConfirm(e.target.value)}
                                placeholder={`@${u.username}`}
                                className="text-sm"
                              />
                              <button
                                type="button"
                                disabled={busy || deleteConfirm !== u.username}
                                onClick={() => deleteUser(u)}
                                className="w-full py-2.5 rounded-xl text-sm font-bold bg-reto-red/20 text-reto-red border border-reto-red/30 disabled:opacity-40"
                              >
                                {busy ? 'Eliminando…' : 'Eliminar usuario'}
                              </button>
                            </div>
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
        )}
      </div>
    </AppShell>
  );
}
