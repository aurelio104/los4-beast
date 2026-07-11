import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Fingerprint, Loader2, Bell, LogOut, Volume2, Vibrate, Share2, Trash2 } from 'lucide-react';
import { startRegistration } from '@simplewebauthn/browser';
import { AppShell } from '../components/AppShell';
import { GlassCard } from '../components/GlassCard';
import { api } from '../lib/api';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { shareInvite } from '../hooks/useInstallPrompt';
import { getPreferences, setPreferences, UserPreferences } from '../lib/preferences';
import { User, PlayerContext } from '../types';

const EMOJIS = ['😎', '🔥', '👑', '💀', '🤡', '😈', '🦸', '🎭', '🐺', '🦁'];
const INVITE = 'RETO2026';

export default function Perfil() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [nickname, setNickname] = useState('');
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const [toast, setToast] = useState('');
  const [prefs, setPrefs] = useState<UserPreferences>(getPreferences());
  const [alliance, setAlliance] = useState<PlayerContext['alliance']>(null);
  const push = usePushNotifications();

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (!stored) { navigate('/login'); return; }
    const u = JSON.parse(stored) as User;
    setUser(u);
    setNickname(u.nickname || '');
    api.me().then((r) => {
      if (r.success) {
        setUser(r.user as User);
        localStorage.setItem('user', JSON.stringify(r.user));
      }
    });
    api.gameStatus().then((r) => {
      if (r.player?.alliance) setAlliance(r.player.alliance);
    });
  }, [navigate]);

  const save = async () => {
    const res = await api.updateProfile({ nickname });
    if (res.success) {
      setUser(res.user as User);
      localStorage.setItem('user', JSON.stringify(res.user));
      setToast('Perfil actualizado');
    }
    setTimeout(() => setToast(''), 2000);
  };

  const setupPasskey = async () => {
    setPasskeyLoading(true);
    try {
      const options = await api.passkeyRegisterOptions();
      if (!options.challenge) throw new Error(options.error);
      const cred = await startRegistration({ optionsJSON: options });
      await api.passkeyRegister(cred);
      setToast('Passkey configurada ✅');
      const me = await api.me();
      if (me.success) { setUser(me.user as User); localStorage.setItem('user', JSON.stringify(me.user)); }
    } catch (e) {
      setToast((e as Error).message || 'Error Passkey');
    } finally {
      setPasskeyLoading(false);
      setTimeout(() => setToast(''), 3000);
    }
  };

  const removePasskey = async () => {
    await api.passkeyDelete();
    setToast('Passkey eliminada');
    const me = await api.me();
    if (me.success) { setUser(me.user as User); localStorage.setItem('user', JSON.stringify(me.user)); }
    setTimeout(() => setToast(''), 2000);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login', { replace: true });
  };

  const togglePref = (key: keyof UserPreferences) => {
    const next = setPreferences({ [key]: !prefs[key] });
    setPrefs(next);
  };

  if (!user) return null;

  return (
    <AppShell>
      <div className="max-w-lg mx-auto px-4 py-6 pb-24">
        <button type="button" onClick={() => navigate('/')} className="flex items-center gap-2 text-white/50 mb-6">
          <ArrowLeft size={18} /> Hub
        </button>

        <div className="text-center mb-8">
          <motion.span className="text-6xl block mb-3" animate={{ scale: [1, 1.1, 1] }} transition={{ repeat: Infinity, duration: 3 }}>
            {user.avatarEmoji || '😎'}
          </motion.span>
          <h2 className="text-xl font-black">{user.displayName}</h2>
          <p className="text-white/40 text-sm">@{user.username} · {user.points} BP</p>
          {alliance && <p className="text-xs text-reto-purple mt-2">🤝 Aliado: {alliance.name}</p>}
        </div>

        <GlassCard className="p-5 mb-4 space-y-4">
          <div>
            <label className="text-xs text-white/40 mb-2 block">Avatar</label>
            <div className="flex flex-wrap gap-2">
              {EMOJIS.map((e) => (
                <button key={e} type="button" onClick={async () => {
                  const res = await api.updateProfile({ avatarEmoji: e });
                  if (res.success) { setUser(res.user as User); localStorage.setItem('user', JSON.stringify(res.user)); }
                }}
                  className={`text-2xl p-2 rounded-xl ${user.avatarEmoji === e ? 'glass-strong ring-2 ring-reto-pink' : 'bg-white/5'}`}>{e}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-white/40 mb-1 block">Apodo</label>
            <input value={nickname} onChange={(e) => setNickname(e.target.value)} />
          </div>
          <button type="button" onClick={save} className="w-full glass-btn py-3 rounded-xl font-semibold">Guardar</button>
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
                <p className="text-xs text-white/50">Eventos cada 10 días</p>
              </div>
              <button type="button"
                onClick={() => push.subscribed ? push.unsubscribe() : push.subscribe()}
                disabled={push.loading}
                className="glass-btn px-4 py-2 rounded-xl text-sm font-semibold">
                {push.subscribed ? 'Desactivar' : push.loading ? '...' : 'Activar'}
              </button>
            </div>
          </GlassCard>
        )}

        <button type="button" onClick={async () => { await shareInvite(INVITE); setToast('Invitación compartida'); setTimeout(() => setToast(''), 2000); }}
          className="w-full glass-btn py-4 rounded-2xl font-semibold mb-3 flex items-center justify-center gap-2">
          <Share2 size={18} /> Invitar amigos
        </button>

        <button type="button" onClick={logout} className="w-full py-4 rounded-2xl font-semibold text-reto-red flex items-center justify-center gap-2 border border-reto-red/30">
          <LogOut size={18} /> Cerrar sesión
        </button>

        {toast && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 glass-strong px-6 py-3 rounded-2xl z-50">
            {toast}
          </motion.div>
        )}
      </div>
    </AppShell>
  );
}
