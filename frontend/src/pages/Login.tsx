import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Fingerprint, KeyRound, Loader2 } from 'lucide-react';
import { RetoLogo } from '../components/RetoLogo';
import { startAuthentication } from '@simplewebauthn/browser';
import { AppShell } from '../components/AppShell';
import { GlassCard } from '../components/GlassCard';
import { PasswordInput } from '../components/PasswordInput';
import { api } from '../lib/api';
import { User } from '../types';
import { isSetupDone } from '../lib/setup';

export default function Login() {
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [passkeyLoading, setPasskeyLoading] = useState(false);

  const finishLogin = (token: string, user: User) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    navigate(isSetupDone(user.id) ? '/' : '/setup', { replace: true });
  };

  const handlePasskey = async () => {
    setPasskeyLoading(true);
    setError('');
    try {
      const options = await api.passkeyChallenge();
      const credential = await startAuthentication({ optionsJSON: options });
      const res = await api.passkeyVerify(credential);
      if (!res.success || !res.token) throw new Error(res.error || 'Passkey fallida');
      finishLogin(res.token, res.user as User);
    } catch (e) {
      setError((e as Error).message || 'Error con Passkey');
    } finally {
      setPasskeyLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await api.login(identifier, password);
      if (!res.success || !res.token) throw new Error(res.error || 'Login fallido');
      finishLogin(res.token, res.user as User);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell background="beach">
      <div className="min-h-dvh flex flex-col items-center justify-center px-[max(1rem,env(safe-area-inset-left))] py-12 pb-[max(3rem,env(safe-area-inset-bottom))]">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200 }}
          className="mb-8 text-center"
        >
          <RetoLogo size="hero" animate glow className="mx-auto mb-3" />
          <h1 className="text-[clamp(1.75rem,6vw,2.5rem)] font-black gradient-text text-glow">Reto</h1>
          <p className="text-white/40 text-sm mt-1 tracking-widest uppercase">29 agosto 2026</p>
        </motion.div>

        <GlassCard strong glow="purple" className="w-full max-w-md p-8 bg-black/30 backdrop-blur-2xl">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handlePasskey}
            disabled={passkeyLoading}
            className="w-full glass-btn py-5 rounded-2xl flex items-center justify-center gap-3 mb-6 font-bold text-lg"
          >
            {passkeyLoading ? <Loader2 className="animate-spin" /> : <Fingerprint size={24} />}
            Usar Passkey
          </motion.button>

          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-xs text-white/30 uppercase">o</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-xs text-white/40 mb-1 block">Usuario o email</label>
              <input value={identifier} onChange={(e) => setIdentifier(e.target.value)} required />
            </div>
            <div>
              <label className="text-xs text-white/40 mb-1 block">Contraseña</label>
              <PasswordInput value={password} onChange={setPassword} required autoComplete="current-password" />
            </div>
            {error && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-reto-red text-sm">
                {error}
              </motion.p>
            )}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg, #ff006e, #8338ec)' }}
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : <KeyRound size={20} />}
              Entrar
            </motion.button>
          </form>

          <p className="text-center text-sm text-white/40 mt-6 leading-relaxed">
            ¿Nuevo en el grupo?{' '}
            <span className="text-white/50">Solo puedes registrarte con un link de invitación de un integrante.</span>
          </p>
          <p className="text-center text-xs text-white/35 mt-3">
            ¿Olvidaste tu contraseña? Contacta a <strong className="text-white/50">Aurelio</strong> (admin) para restablecerla.
          </p>
        </GlassCard>
      </div>
    </AppShell>
  );
}
