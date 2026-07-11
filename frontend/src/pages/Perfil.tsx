import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Fingerprint, Loader2, Bell, LogOut, Volume2, Vibrate,
  Share2, Trash2, Camera, Save, Lock, UserRound, Image as ImageIcon,
  Video, Sparkles, Music2, MessageCircle
} from 'lucide-react';
import { startRegistration } from '@simplewebauthn/browser';
import { AppShell } from '../components/AppShell';
import { GlassCard } from '../components/GlassCard';
import { Avatar } from '../components/Avatar';
import { PasswordInput } from '../components/PasswordInput';
import { api } from '../lib/api';
import { compressImageFile } from '../lib/image';
import { usePushNotifications, refreshUserPushState } from '../hooks/usePushNotifications';
import { shareMemberInvite } from '../lib/inviteShare';
import {
  BgMode,
  getPreferences,
  setPreferences,
  syncBgFromUser,
  UserPreferences
} from '../lib/preferences';
import { User, PlayerContext } from '../types';
import { openWaMe } from '../lib/whatsapp';

const EMOJIS = ['😎', '🔥', '👑', '💀', '🤡', '😈', '🦸', '🎭', '🐺', '🦁', '✨', '🌊', '🎯', '💎'];
const GENDERS = [
  { id: 'M', label: 'Hombre' },
  { id: 'F', label: 'Mujer' },
  { id: 'OTHER', label: 'Otro' }
] as const;

const BG_OPTIONS: { id: BgMode; label: string; desc: string; icon: typeof Video; preview?: string }[] = [
  { id: 'beach', label: 'Video playa', desc: 'Fondo animado', icon: Video, preview: '/wallpapers/beach-poster.jpg' },
  { id: 'celosia', label: 'Imagen celosía', desc: 'Estático artístico', icon: ImageIcon, preview: '/wallpapers/celosia-dark-640.jpg' },
  { id: 'orbs', label: 'Orbes', desc: 'Gradientes vivos', icon: Sparkles },
  { id: 'custom', label: 'Mi imagen', desc: 'Sube la tuya', icon: Camera }
];

export default function Perfil() {
  const navigate = useNavigate();
  const photoRef = useRef<HTMLInputElement>(null);
  const bgRef = useRef<HTMLInputElement>(null);
  const [user, setUser] = useState<User | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [nickname, setNickname] = useState('');
  const [bio, setBio] = useState('');
  const [gender, setGender] = useState('OTHER');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsappOptIn, setWhatsappOptIn] = useState(false);
  const [waTesting, setWaTesting] = useState(false);
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingBg, setUploadingBg] = useState(false);
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
    setPhone(u.phone ? u.phone.replace(/^\+58/, '0') : '');
    setWhatsappOptIn(!!u.whatsappOptIn);
    localStorage.setItem('user', JSON.stringify(u));
    syncBgFromUser(u.bgMode, u.bgUrl);
    setPrefs(getPreferences());
  };

  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (!stored) { navigate('/login'); return; }
    applyUser(JSON.parse(stored) as User);
    api.me().then(async (r) => {
      if (r.success) {
        applyUser(r.user as User);
        await refreshUserPushState();
        void push.refresh();
      }
    });
    api.gameStatus().then((r) => {
      if (r.player?.alliance) setAlliance(r.player.alliance);
    });
  }, [navigate]);

  const save = async () => {
    setSaving(true);
    try {
      const payload: Record<string, string | boolean> = {
        displayName: displayName.trim(),
        nickname: nickname.trim(),
        bio: bio.trim(),
        gender,
        phone: phone.trim(),
        whatsappOptIn: whatsappOptIn && !!phone.trim()
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
    setUploadingPhoto(true);
    try {
      const dataUrl = await compressImageFile(file);
      const res = await api.uploadAvatar(dataUrl);
      if (res.success) {
        applyUser(res.user as User);
        flash('Foto de perfil actualizada 📸');
      } else flash(res.error || 'Error al subir');
    } catch (e) {
      flash((e as Error).message || 'Error con la imagen');
    } finally {
      setUploadingPhoto(false);
      if (photoRef.current) photoRef.current.value = '';
    }
  };

  const onPickBg = async (file?: File | null) => {
    if (!file) return;
    setUploadingBg(true);
    try {
      const dataUrl = await compressImageFile(file, 1280, 0.7);
      const res = await api.uploadBackground(dataUrl);
      if (res.success) {
        applyUser(res.user as User);
        flash('Fondo personalizado aplicado 🖼️');
      } else flash(res.error || 'Error al subir fondo');
    } catch (e) {
      flash((e as Error).message || 'Error con la imagen');
    } finally {
      setUploadingBg(false);
      if (bgRef.current) bgRef.current.value = '';
    }
  };

  const setBgMode = async (mode: BgMode) => {
    if (mode === 'custom' && !user?.bgUrl) {
      bgRef.current?.click();
      return;
    }
    const res = await api.updateProfile({ bgMode: mode });
    if (res.success) {
      applyUser(res.user as User);
      flash(mode === 'beach' ? 'Video de playa activado' : 'Fondo actualizado');
    } else flash(res.error || 'Error');
  };

  const removePhoto = async () => {
    const res = await api.deleteAvatar();
    if (res.success) {
      applyUser(res.user as User);
      flash('Foto eliminada');
    }
  };

  const removeBg = async () => {
    const res = await api.deleteBackground();
    if (res.success) {
      applyUser(res.user as User);
      flash('Fondo personalizado eliminado');
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

  const activeBg = (user.bgMode as BgMode) || prefs.bgMode || 'beach';

  return (
    <AppShell>
      <div className="max-w-lg mx-auto px-4 py-6 pb-28">
        <button type="button" onClick={() => navigate('/')} className="flex items-center gap-2 text-white/50 mb-6">
          <ArrowLeft size={18} /> Hub
        </button>

        {/* Foto de perfil */}
        <div className="text-center mb-8">
          <div className="relative inline-block mb-4">
            <Avatar url={user.avatarUrl} emoji={user.avatarEmoji} name={user.displayName} size="xl" />
            <button
              type="button"
              disabled={uploadingPhoto}
              onClick={() => photoRef.current?.click()}
              className="absolute -bottom-1 -right-1 glass-strong rounded-full p-2.5 border border-white/20"
              aria-label="Cambiar foto de perfil"
            >
              {uploadingPhoto ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} className="text-reto-cyan" />}
            </button>
            <input
              ref={photoRef}
              type="file"
              accept="image/*"
              capture="user"
              className="hidden"
              onChange={(e) => onPickPhoto(e.target.files?.[0])}
            />
          </div>
          <h2 className="text-2xl font-black">{user.displayName}</h2>
          <p className="text-white/40 text-sm">@{user.username} · {user.points} Puntos</p>
          {user.bio && <p className="text-sm text-white/60 mt-2 max-w-xs mx-auto">{user.bio}</p>}
          {alliance && <p className="text-xs text-reto-purple mt-2">🤝 Aliado: {alliance.name}</p>}
          <div className="flex justify-center gap-3 mt-3">
            <button type="button" onClick={() => photoRef.current?.click()} className="text-xs text-reto-cyan underline">
              {user.avatarUrl ? 'Cambiar foto' : 'Subir foto'}
            </button>
            {user.avatarUrl && (
              <button type="button" onClick={removePhoto} className="text-xs text-reto-red underline">
                Quitar foto
              </button>
            )}
          </div>
        </div>

        {/* Fondo */}
        <GlassCard className="p-5 mb-4 space-y-4">
          <p className="text-xs uppercase tracking-widest text-white/40 flex items-center gap-2">
            <ImageIcon size={14} /> Fondo de la app
          </p>
          <p className="text-xs text-white/45">Elige video, imagen o sube la tuya. Se aplica en todo Reto.</p>
          <div className="grid grid-cols-2 gap-2">
            {BG_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const selected = activeBg === opt.id || (opt.id === 'custom' && activeBg === 'custom');
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setBgMode(opt.id)}
                  className={`relative overflow-hidden rounded-2xl p-3 text-left border ${
                    selected ? 'border-reto-pink ring-1 ring-reto-pink/50' : 'border-white/10 bg-white/5'
                  }`}
                >
                  {opt.preview ? (
                    <img src={opt.preview} alt="" className="absolute inset-0 w-full h-full object-cover opacity-40" />
                  ) : null}
                  <div className="relative z-10">
                    <Icon size={16} className="mb-1 text-reto-cyan" />
                    <p className="text-sm font-bold">{opt.label}</p>
                    <p className="text-[10px] text-white/50">{opt.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>
          <input
            ref={bgRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => onPickBg(e.target.files?.[0])}
          />
          <div className="flex gap-2">
            <button
              type="button"
              disabled={uploadingBg}
              onClick={() => bgRef.current?.click()}
              className="flex-1 glass-btn py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
            >
              {uploadingBg ? <Loader2 className="animate-spin" size={16} /> : <Camera size={16} />}
              Subir mi fondo
            </button>
            {user.bgUrl && (
              <button type="button" onClick={removeBg} className="px-4 glass-btn rounded-xl text-sm text-reto-red">
                Quitar
              </button>
            )}
          </div>
        </GlassCard>

        {/* Identidad */}
        <GlassCard className="p-5 mb-4 space-y-4">
          <p className="text-xs uppercase tracking-widest text-white/40 flex items-center gap-2">
            <UserRound size={14} /> Datos del perfil
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

        {/* Seguridad */}
        <GlassCard className="p-5 mb-4 space-y-3">
          <p className="text-xs uppercase tracking-widest text-white/40 flex items-center gap-2">
            <Lock size={14} /> Seguridad
          </p>
          <div>
            <label className="text-xs text-white/40 mb-1 block">Contraseña actual</label>
            <PasswordInput value={currentPassword} onChange={setCurrentPassword} autoComplete="current-password" />
          </div>
          <div>
            <label className="text-xs text-white/40 mb-1 block">Nueva contraseña</label>
            <PasswordInput value={newPassword} onChange={setNewPassword} autoComplete="new-password" minLength={8} />
          </div>
          <p className="text-[11px] text-white/35">Déjalas vacías si no quieres cambiarla. Se guarda con el botón de arriba.</p>

          <div className="flex items-center justify-between pt-2 border-t border-white/10">
            <div>
              <p className="font-bold flex items-center gap-2 text-sm"><Fingerprint size={16} /> Passkey</p>
              <p className="text-xs text-white/50">{user.hasPasskey ? 'Face ID / huella activos' : 'Acceso sin contraseña'}</p>
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

        {/* Configuración */}
        <GlassCard className="p-5 mb-4 space-y-3">
          <p className="text-xs uppercase tracking-widest text-white/40">Configuración</p>
          <p className="text-[11px] text-white/35 -mt-1 mb-1">Música, sonidos, notificaciones, WhatsApp y passkey</p>
          <button type="button" onClick={() => togglePref('music')} className="w-full flex items-center justify-between py-2">
            <span className="flex items-center gap-2 text-sm"><Music2 size={16} /> Música de fondo</span>
            <span className="text-xs text-reto-cyan">{prefs.music ? 'ON' : 'OFF'}</span>
          </button>
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

        <GlassCard glow="cyan" className="p-5 mb-4 space-y-3">
          <p className="text-xs uppercase tracking-widest text-white/40 flex items-center gap-2">
            <MessageCircle size={14} className="text-[#25D366]" /> WhatsApp
          </p>
          <div>
            <label className="text-xs text-white/40 mb-1 block">Número</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="04141234567" inputMode="tel" autoComplete="tel" />
          </div>
          <button
            type="button"
            onClick={() => setWhatsappOptIn(!whatsappOptIn)}
            className="w-full flex items-center justify-between py-2"
          >
            <span className="flex items-center gap-2 text-sm">Alertas por WhatsApp</span>
            <span className="text-xs text-reto-cyan">{whatsappOptIn && phone.trim() ? 'ON' : 'OFF'}</span>
          </button>
          <p className="text-[11px] text-white/35">Contraseñas, credenciales y cambios del reto. Guarda con el botón de arriba.</p>
          {user.whatsappOptIn && (
            <button
              type="button"
              disabled={waTesting}
              onClick={async () => {
                setWaTesting(true);
                try {
                  const r = await api.whatsappTest();
                  if (r.whatsapp?.sent) flash('Mensaje de prueba enviado ✓');
                  else if (r.whatsapp?.waMeUrl) {
                    openWaMe(r.whatsapp.waMeUrl);
                    flash('Abre WhatsApp para enviar la prueba');
                  } else flash(r.error || 'No se pudo enviar');
                } finally {
                  setWaTesting(false);
                }
              }}
              className="glass-btn w-full py-2 rounded-xl text-sm font-semibold"
            >
              {waTesting ? 'Enviando…' : 'Enviar prueba'}
            </button>
          )}
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
                onClick={async () => {
                  if (push.subscribed) await push.unsubscribe();
                  else await push.subscribe();
                  await refreshUserPushState();
                  const me = await api.me();
                  if (me.success && me.user) applyUser(me.user as User);
                  void push.refresh();
                }}
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
