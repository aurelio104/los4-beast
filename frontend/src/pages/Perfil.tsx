import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Fingerprint, Loader2, Bell, LogOut, Volume2, Vibrate,
  Share2, Trash2, Camera, Save, Lock, UserRound
} from 'lucide-react';
import { startRegistration } from '@simplewebauthn/browser';
import { AppShell } from '../components/AppShell';
import { GlassCard } from '../components/GlassCard';
import { Avatar } from '../components/Avatar';
import { api } from '../lib/api';
import { compressImageFile } from '../lib/image';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { shareMemberInvite } from '../lib/inviteShare';
import { getPreferences, setPreferences, UserPreferences } from '../lib/preferences';
import { User, PlayerContext } from '../types';

const EMOJIS = ['😎', '🔥', '👑', '💀', '🤡', '😈', '🦸', '🎭', '🐺', '🦁', '✨', '🌊', '🎯', '💎'];
const GENDERS = [
  { id: 'M', label: 'Hombre' },
  { id: 'F', label: 'Mujer' },
  { id: 'OTHER', label: 'Otro' }
] as const;

export default function Perfil() {
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [user, setUser] = useState<User | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [nickname, setNickname] = useState('');
  const [bio, setBio] = useState('');
  const [gender, setGender] = useState('OTHER');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [prefs, setPrefs] = useState<UserPreferences>(getPreferences());
  const [alliance, setAlliance] = useState<PlayerContext['alliance']>(null);
  const push = usePushNotifications();

  const applyUser = (u: User) => {
    setUser(u);
    setDisplayName(u.displayName || '');
    setNickname(u.nickname || '');
    setBio(u.bio || '');
    setGender(u.gender || 'OTHER');
    localStorage.setItem('user', JSON.stringify(u));
  };

  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (!stored) { navigate('/login'); return; }
    applyUser(JSON.parse(stored) as User);
    api.me().then((r) => {
      if (r.success) applyUser(r.user as User);
    });
    api.gameStatus().then((r) => {
      if (r.player?.alliance) setAlliance(r.player.alliance);
    });
  }, [navigate]);

  const save = async () => {
    setSaving(true);
    try {
      const payload: Record<string, string> = {
        displayName: displayName.trim(),
        nickname: nickname.trim(),
        bio: bio.trim(),
        gender
      };
      if (newPassword) {
        payload.currentPassword = currentPassword;
        payload.newPassword = newPassword;
      }
      const res = await api.updateProfile(payload);
      if (res.success) {
        applyUser(res.user as User);
        setCurrentPassword('');
        setNewPassword('');
        flash('Perfil actualizado ✅');
      } else {
        flash(res.error || 'No se pudo guardar');
      }
    } finally {
      setSaving(false);
    }
  };

  const onPickPhoto = async (file?: File | null) => {
    if (!file) return;
    setUploading(true);
    try {
      const dataUrl = await compressImageFile(file);
      const res = await api.uploadAvatar(dataUrl);
      if (res.success) {
        applyUser(res.user as User);
        flash('Foto actualizada 📸');
      } else {
        flash(res.error || 'Error al subir');
      }
    } catch (e) {
      flash((e as Error).message || 'Error con la imagen');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const removePhoto = async () => {
    const res = await api.deleteAvatar();
    if (res.success) {
      applyUser(res.user as User);
      flash('Foto eliminada');
    }
  };

  const setupPasskey = async () => {
    setPasskeyLoading(true);
    try {
      const options = await api.passkeyRegisterOptions();
      if (!options.challenge) throw new Error(options.error);
      const cred = await startRegistration({ optionsJSON: options });
      await api.passkeyRegister(cred);
      flash('Passkey configurada ✅');
      const me = await api.me();
      if (me.success) applyUser(me.user as User);
    } catch (e) {
      flash((e as Error).message || 'Error Passkey');
    } finally {
      setPasskeyLoading(false);
    }
  };

  const removePasskey = async () => {
    await api.passkeyDelete();
    flash('Passkey eliminada');
    const me = await api.me();
    if (me.success) applyUser(me.user as User);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login', { replace: true });
  };

  const togglePref = (key: keyof UserPreferences) => {
    setPrefs(setPreferences({ [key]: !prefs[key] }));
  };

  if (!user) return null;

  return (
    <AppShell>
      <div className="max-w-lg mx-auto px-4 py-6 pb-28">
        <button type="button" onClick={() => navigate('/')} className="flex items-center gap-2 text-white/50 mb-6">
          <ArrowLeft size={18} /> Hub
        </button>

        <div className="text-center mb-8">
          <div className="relative inline-block mb-4">
            <Avatar url={user.avatarUrl} emoji={user.avatarEmoji} name={user.displayName} size="xl" />
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
              className="absolute -bottom-1 -right-1 glass-strong rounded-full p-2.5 border border-white/20"
              aria-label="Cambiar foto"
            >
              {uploading ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} className="text-reto-cyan" />}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="user"
              className="hidden"
              onChange={(e) => onPickPhoto(e.target.files?.[0])}
            />
          </div>
          <h2 className="text-2xl font-black">{user.displayName}</h2>
          <p className="text-white/40 text-sm">@{user.username} · {user.points} BP</p>
          {user.bio && <p className="text-sm text-white/60 mt-2 max-w-xs mx-auto">{user.bio}</p>}
          {alliance && (
            <p className="text-xs text-reto-purple mt-2 flex items-center justify-center gap-2">
              🤝 Aliado: {alliance.name}
            </p>
          )}
          {user.avatarUrl && (
            <button type="button" onClick={removePhoto} className="text-xs text-reto-red mt-3 underline">
              Quitar foto
            </button>
          )}
        </div>

        <GlassCard className="p-5 mb-4 space-y-4">
          <p className="text-xs uppercase tracking-widest text-white/40 flex items-center gap-2">
            <UserRound size={14} /> Editar perfil
          </p>

          <div>
            <label className="text-xs text-white/40 mb-2 block">Emoji (si no hay foto)</label>
            <div className="flex flex-wrap gap-2">
              {EMOJIS.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={async () => {
                    const res = await api.updateProfile({ avatarEmoji: e });
                    if (res.success) applyUser(res.user as User);
                  }}
                  className={`text-2xl p-2 rounded-xl ${user.avatarEmoji === e ? 'glass-strong ring-2 ring-reto-pink' : 'bg-white/5'}`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-white/40 mb-1 block">Nombre visible</label>
            <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={50} />
          </div>
          <div>
            <label className="text-xs text-white/40 mb-1 block">Apodo</label>
            <input value={nickname} onChange={(e) => setNickname(e.target.value)} maxLength={30} placeholder="Cómo te llaman en el grupo" />
          </div>
          <div>
            <label className="text-xs text-white/40 mb-1 block">Bio</label>
            <textarea
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={160}
              placeholder="Cuéntale al grupo quién eres…"
            />
            <p className="text-[10px] text-white/30 text-right mt-1">{bio.length}/160</p>
          </div>
          <div>
            <label className="text-xs text-white/40 mb-2 block">Género</label>
            <div className="grid grid-cols-3 gap-2">
              {GENDERS.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setGender(g.id)}
                  className={`py-2 rounded-xl text-sm font-semibold ${gender === g.id ? 'glass-strong ring-1 ring-reto-pink' : 'bg-white/5'}`}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2"
            style={{ background: 'linear-gradient(135deg, #8338ec, #ff006e)' }}
          >
            {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
            Guardar cambios
          </button>
        </GlassCard>

        <GlassCard className="p-5 mb-4 space-y-3">
          <p className="text-xs uppercase tracking-widest text-white/40 flex items-center gap-2">
            <Lock size={14} /> Cambiar contraseña
          </p>
          <div>
            <label className="text-xs text-white/40 mb-1 block">Contraseña actual</label>
            <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} autoComplete="current-password" />
          </div>
          <div>
            <label className="text-xs text-white/40 mb-1 block">Nueva contraseña</label>
            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} autoComplete="new-password" minLength={8} />
          </div>
          <p className="text-[11px] text-white/35">Déjalas vacías si no quieres cambiarla. Se guarda con el botón de arriba.</p>
        </GlassCard>

        <GlassCard className="p-5 mb-4 space-y-3">
          <p className="text-xs uppercase tracking-widest text-white/40">Preferencias</p>
          <button type="button" onClick={() => togglePref('sound')} className="w-full flex items-center justify-between py-2">
            <span className="flex items-center gap-2 text-sm"><Volume2 size={16} /> Sonidos</span>
            <span className="text-xs text-reto-cyan">{prefs.sound ? 'ON' : 'OFF'}</span>
          </button>
          <button type="button" onClick={() => togglePref('haptics')} className="w-full flex items-center justify-between py-2">
            <span className="flex items-center gap-2 text-sm"><Vibrate size={16} /> Vibración</span>
            <span className="text-xs text-reto-cyan">{prefs.haptics ? 'ON' : 'OFF'}</span>
          </button>
          <button type="button" onClick={() => togglePref('reducedMotion')} className="w-full flex items-center justify-between py-2">
            <span className="text-sm">Reducir animaciones</span>
            <span className="text-xs text-reto-cyan">{prefs.reducedMotion ? 'ON' : 'OFF'}</span>
          </button>
        </GlassCard>

        <GlassCard glow="purple" className="p-5 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold flex items-center gap-2"><Fingerprint size={18} /> Passkey</p>
              <p className="text-xs text-white/50">{user.hasPasskey ? 'Configurada' : 'Face ID / huella'}</p>
            </div>
            {!user.hasPasskey ? (
              <button type="button" onClick={setupPasskey} disabled={passkeyLoading} className="glass-btn px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2">
                {passkeyLoading ? <Loader2 className="animate-spin" size={16} /> : 'Activar'}
              </button>
            ) : (
              <button type="button" onClick={removePasskey} className="glass-btn px-3 py-2 rounded-xl text-sm text-reto-red flex items-center gap-1">
                <Trash2 size={14} /> Quitar
              </button>
            )}
          </div>
        </GlassCard>

        {push.supported && (
          <GlassCard glow="gold" className="p-5 mb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold flex items-center gap-2"><Bell size={18} /> Notificaciones</p>
                <p className="text-xs text-white/50">Eventos y drama del grupo</p>
              </div>
              <button
                type="button"
                onClick={() => (push.subscribed ? push.unsubscribe() : push.subscribe())}
                disabled={push.loading}
                className="glass-btn px-4 py-2 rounded-xl text-sm font-semibold"
              >
                {push.subscribed ? 'Desactivar' : push.loading ? '...' : 'Activar'}
              </button>
            </div>
          </GlassCard>
        )}

        <button
          type="button"
          onClick={async () => {
            try {
              await shareMemberInvite();
              flash('Invitación lista para compartir');
            } catch (e) {
              flash((e as Error).message || 'Error al invitar');
            }
          }}
          className="w-full glass-btn py-4 rounded-2xl font-semibold mb-3 flex items-center justify-center gap-2"
        >
          <Share2 size={18} /> Invitar a alguien al grupo
        </button>

        <button type="button" onClick={logout} className="w-full py-4 rounded-2xl font-semibold text-reto-red flex items-center justify-center gap-2 border border-reto-red/30">
          <LogOut size={18} /> Cerrar sesión
        </button>

        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 glass-strong px-6 py-3 rounded-2xl z-50"
          >
            {toast}
          </motion.div>
        )}
      </div>
    </AppShell>
  );
}
