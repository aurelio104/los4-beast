import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UserPlus, Loader2, Camera, ChevronRight, ChevronLeft,
  Lock, UserRound, Sparkles, CircleCheck, Check,
  Hourglass, Ban, ArrowRight
} from 'lucide-react';
import { RetoLogo } from '../components/RetoLogo';
import { AppShell } from '../components/AppShell';
import { GlassCard } from '../components/GlassCard';
import { Avatar } from '../components/Avatar';
import { PasswordStrengthMeter } from '../components/PasswordStrengthMeter';
import { api } from '../lib/api';
import { compressImageFile } from '../lib/image';
import { isPasswordStrongEnough } from '../lib/passwordStrength';
import { syncBgFromUser } from '../lib/preferences';
import { User } from '../types';

const EMOJIS = ['😎', '🔥', '👑', '💀', '🤡', '😈', '🦸', '🎭', '🐺', '🦁', '✨', '🌊'];
const STEPS = ['Datos', 'Foto', 'Contraseña', '¡Listo!'];

type Step = 0 | 1 | 2 | 3;

export default function Join() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const photoRef = useRef<HTMLInputElement>(null);

  const [valid, setValid] = useState<boolean | null>(null);
  const [expired, setExpired] = useState(false);
  const [inviterName, setInviterName] = useState('');
  const [inviterEmoji, setInviterEmoji] = useState('😎');
  const [inviterAvatarUrl, setInviterAvatarUrl] = useState<string | null>(null);

  const [step, setStep] = useState<Step>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    username: '',
    email: '',
    displayName: '',
    nickname: '',
    gender: 'OTHER',
    avatarEmoji: '😎'
  });
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    if (!code) { setValid(false); return; }
    api.invite(code).then((r) => {
      setValid(r.valid);
      setExpired(!!r.expired);
      if (r.valid) {
        setInviterName(r.inviterName || 'Un miembro');
        setInviterEmoji(r.inviterEmoji || '😎');
        setInviterAvatarUrl(r.inviterAvatarUrl || null);
      }
    });
  }, [code]);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const onPickPhoto = async (file?: File | null) => {
    if (!file) return;
    try {
      const dataUrl = await compressImageFile(file);
      setPhotoDataUrl(dataUrl);
      setPhotoPreview(dataUrl);
    } catch (e) {
      setError((e as Error).message);
    }
    if (photoRef.current) photoRef.current.value = '';
  };

  const validateStep = (): string | null => {
    if (step === 0) {
      if (form.displayName.trim().length < 2) return 'Nombre muy corto';
      if (form.username.trim().length < 3) return 'Usuario: mínimo 3 caracteres';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return 'Email inválido';
    }
    if (step === 2) {
      if (!isPasswordStrongEnough(password)) return 'La contraseña no es lo suficientemente segura';
      if (password !== confirmPassword) return 'Las contraseñas no coinciden';
    }
    return null;
  };

  const createAccount = async () => {
    if (!code) throw new Error('Invitación inválida');
    const res = await api.join({
      ...form,
      inviteCode: code,
      password
    });
    if (!res.success || !res.token) throw new Error(res.error || 'Error al registrarse');

    localStorage.setItem('token', res.token);
    let user = res.user as User;
    localStorage.setItem('user', JSON.stringify(user));

    if (photoDataUrl) {
      const up = await api.uploadAvatar(photoDataUrl);
      if (up.success && up.user) user = up.user as User;
    } else if (form.avatarEmoji) {
      const up = await api.updateProfile({ avatarEmoji: form.avatarEmoji });
      if (up.success && up.user) user = up.user as User;
    }

    localStorage.setItem('user', JSON.stringify(user));
    syncBgFromUser(user.bgMode, user.bgUrl);
    return user;
  };

  const next = async () => {
    setError('');
    const err = validateStep();
    if (err) { setError(err); return; }

    if (step === 2) {
      setLoading(true);
      try {
        await createAccount();
        setStep(3);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
      return;
    }

    if (step < 3) setStep((step + 1) as Step);
  };

  const back = () => {
    if (step > 0 && step < 3) setStep((step - 1) as Step);
  };

  if (valid === null) {
    return (
      <AppShell background="beach">
        <div className="min-h-dvh flex items-center justify-center">
          <Loader2 className="animate-spin text-reto-pink" size={40} />
        </div>
      </AppShell>
    );
  }

  if (!valid) {
    return (
      <AppShell background="beach">
        <div className="min-h-dvh flex flex-col items-center justify-center px-4 text-center max-w-md mx-auto">
          <div className="mb-4 flex justify-center">
            {expired
              ? <Hourglass size={40} className="text-reto-gold" strokeWidth={1.75} />
              : <Ban size={40} className="text-reto-red" strokeWidth={1.75} />}
          </div>
          <h1 className="text-xl font-black mb-2">Acceso solo por invitación</h1>
          <p className="text-white/60 text-sm leading-relaxed">
            {expired
              ? 'Esta invitación expiró. Pide un link nuevo a un integrante.'
              : 'Necesitas un link personal de un miembro del Reto.'}
          </p>
          <Link to="/login" className="mt-6 text-reto-pink font-semibold inline-flex items-center gap-1.5">
            Ya tengo cuenta <ArrowRight size={14} /> Login
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell background="beach">
      <div className="min-h-dvh flex flex-col px-[max(1rem,env(safe-area-inset-left))] py-8 pb-[max(2rem,env(safe-area-inset-bottom))] max-w-md mx-auto w-full">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-6">
          <RetoLogo size="lg" animate glow className="mx-auto mb-2" />
          <h1 className="text-[clamp(1.35rem,5vw,1.75rem)] font-black gradient-text">Únete al Reto</h1>
          <div className="flex items-center justify-center gap-2 mt-3 glass-btn px-3 py-1.5 rounded-full inline-flex">
            <Avatar url={inviterAvatarUrl} emoji={inviterEmoji} name={inviterName} size="xs" />
            <p className="text-xs text-white/80">Invitado por <span className="font-bold">{inviterName}</span></p>
          </div>
        </motion.div>

        {/* Progress */}
        <div className="flex items-center justify-between mb-6 px-1">
          {STEPS.map((label, i) => (
            <div key={label} className="flex flex-col items-center flex-1">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold mb-1 transition-all ${
                  i < step ? 'bg-reto-cyan text-black' : i === step ? 'bg-reto-pink text-white ring-2 ring-reto-pink/50' : 'bg-white/10 text-white/40'
                }`}
              >
                {i < step ? <Check size={14} strokeWidth={3} /> : i + 1}
              </div>
              <span className={`text-[9px] text-center leading-tight ${i === step ? 'text-white' : 'text-white/35'}`}>{label}</span>
            </div>
          ))}
        </div>

        <GlassCard strong glow="gold" className="p-6 bg-black/30 backdrop-blur-2xl flex-1">
          <AnimatePresence mode="wait">
            {step === 0 && (
              <motion.div key="s0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                <p className="text-sm font-bold flex items-center gap-2"><UserRound size={16} /> Tus datos</p>
                <div>
                  <label className="text-xs text-white/40 mb-1 block">Nombre completo</label>
                  <input value={form.displayName} onChange={(e) => set('displayName', e.target.value)} required placeholder="Ej. Juan Pérez" />
                </div>
                <div>
                  <label className="text-xs text-white/40 mb-1 block">Apodo (opcional)</label>
                  <input value={form.nickname} onChange={(e) => set('nickname', e.target.value)} placeholder="Como te conocen" />
                </div>
                <div>
                  <label className="text-xs text-white/40 mb-1 block">Género</label>
                  <select value={form.gender} onChange={(e) => set('gender', e.target.value)}>
                    <option value="M">Hombre</option>
                    <option value="F">Mujer</option>
                    <option value="OTHER">Otro</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-white/40 mb-1 block">Usuario (único)</label>
                  <input value={form.username} onChange={(e) => set('username', e.target.value)} required placeholder="min 3 caracteres" autoComplete="username" />
                </div>
                <div>
                  <label className="text-xs text-white/40 mb-1 block">Email</label>
                  <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} required autoComplete="email" />
                </div>
              </motion.div>
            )}

            {step === 1 && (
              <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4 text-center">
                <p className="text-sm font-bold flex items-center justify-center gap-2"><Camera size={16} /> Tu foto de perfil</p>
                <div className="relative inline-block mx-auto">
                  {photoPreview ? (
                    <img src={photoPreview} alt="" className="w-28 h-28 rounded-full object-cover ring-4 ring-reto-pink/40" />
                  ) : (
                    <Avatar url={null} emoji={form.avatarEmoji} name={form.displayName} size="xl" />
                  )}
                  <button type="button" onClick={() => photoRef.current?.click()} className="absolute -bottom-1 -right-1 glass-strong rounded-full p-2.5">
                    <Camera size={16} className="text-reto-cyan" />
                  </button>
                  <input ref={photoRef} type="file" accept="image/*" capture="user" className="hidden" onChange={(e) => onPickPhoto(e.target.files?.[0])} />
                </div>
                <p className="text-xs text-white/45">Sube una foto o elige un emoji</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {EMOJIS.map((e) => (
                    <button
                      key={e}
                      type="button"
                      onClick={() => { set('avatarEmoji', e); setPhotoPreview(null); setPhotoDataUrl(null); }}
                      className={`text-2xl p-2 rounded-xl ${form.avatarEmoji === e && !photoPreview ? 'glass-strong ring-2 ring-reto-pink' : 'bg-white/5'}`}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                <p className="text-sm font-bold flex items-center gap-2"><Lock size={16} /> Contraseña segura</p>
                <div>
                  <label className="text-xs text-white/40 mb-1 block">Contraseña</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    placeholder="Mínimo 10 caracteres"
                  />
                </div>
                <PasswordStrengthMeter password={password} />
                <div>
                  <label className="text-xs text-white/40 mb-1 block">Confirmar contraseña</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                    placeholder="Repite la contraseña"
                  />
                  {confirmPassword && password !== confirmPassword && (
                    <p className="text-reto-red text-xs mt-1">Las contraseñas no coinciden</p>
                  )}
                  {confirmPassword && password === confirmPassword && confirmPassword.length > 0 && (
                    <p className="text-reto-cyan text-xs mt-1 flex items-center gap-1"><CircleCheck size={12} /> Coinciden</p>
                  )}
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div key="s3" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-5 text-center py-6">
                <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ repeat: Infinity, duration: 2 }}>
                  <Sparkles size={48} className="mx-auto text-reto-gold" />
                </motion.div>
                <h2 className="text-2xl font-black gradient-text">¡Cuenta creada!</h2>
                <p className="text-sm text-white/60 leading-relaxed">
                  Ahora configura notificaciones, música y passkey en el siguiente paso.
                </p>
                <button
                  type="button"
                  onClick={() => navigate('/setup', { replace: true })}
                  className="w-full py-4 rounded-2xl font-bold inline-flex items-center justify-center gap-2"
                  style={{ background: 'linear-gradient(135deg, #ffbe0b, #ff006e)' }}
                >
                  Configurar Reto <ArrowRight size={18} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {error && <p className="text-reto-red text-sm mt-4">{error}</p>}

          {step < 3 && (
            <div className="flex gap-3 mt-6">
              {step > 0 && (
                <button type="button" onClick={back} className="flex-1 glass-btn py-3 rounded-xl font-semibold flex items-center justify-center gap-1">
                  <ChevronLeft size={18} /> Atrás
                </button>
              )}
              <button
                type="button"
                onClick={next}
                disabled={loading || (step === 2 && (!isPasswordStrongEnough(password) || password !== confirmPassword))}
                className="flex-1 py-3 rounded-xl font-bold flex items-center justify-center gap-1 disabled:opacity-40"
                style={{ background: step === 2 ? 'linear-gradient(135deg, #ffbe0b, #ff006e)' : 'linear-gradient(135deg, #8338ec, #ff006e)' }}
              >
                {loading ? <Loader2 className="animate-spin" size={18} /> : (
                  <>
                    {step === 2 ? 'Crear cuenta' : 'Continuar'}
                    {step < 2 && <ChevronRight size={18} />}
                    {step === 2 && <UserPlus size={18} />}
                  </>
                )}
              </button>
            </div>
          )}

          {step === 0 && (
            <p className="text-center text-xs text-white/35 mt-4">
              ¿Ya tienes cuenta? <Link to="/login" className="text-reto-cyan">Login</Link>
            </p>
          )}
        </GlassCard>
      </div>
    </AppShell>
  );
}
