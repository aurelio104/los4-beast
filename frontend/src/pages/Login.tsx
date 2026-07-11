import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Fingerprint, KeyRound, Loader2, Flame } from 'lucide-react';
import { startAuthentication, startRegistration } from '@simplewebauthn/browser';
import { AppShell } from '../components/AppShell';
import { GlassCard } from '../components/GlassCard';
import { api } from '../lib/api';
import { User } from '../types';

export default function Login() {
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [passkeyLoading, setPasskeyLoading] = useState(false);

  const finishLogin = (token: string, user: User, needsPasskey?: boolean) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    if (needsPasskey) {
      setupPasskey(token);
    } else {
      navigate('/', { replace: true });
    }
  };

  const setupPasskey = async (token: string) => {
    try {
      const options = await api.passkeyRegisterOptions();
      if (!options.challenge) { navigate('/', { replace: true }); return; }
      const credential = await startRegistration({ optionsJSON: options });
      await api.passkeyRegister(credential);
    } catch {
      /* skip */
    }
    navigate('/', { replace: true });
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
      finishLogin(res.token, res.user as User, res.needsPasskey);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell background="beach">
      <div className="min-h-dvh flex flex-col items-center justify-center px-4 py-12">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200 }}
          className="mb-8 text-center"
        >
          <motion.div
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ duration: 4, repeat: Infinity }}
          >
            <Flame size={48} className="mx-auto text-beast-pink mb-3" />
          </motion.div>
          <h1 className="text-4xl font-black gradient-text text-glow">LOS 4</h1>
          <p className="text-white/40 text-sm mt-1 tracking-widest uppercase">Beast Protocol</p>
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
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            {error && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-beast-red text-sm">
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

          <p className="text-center text-sm text-white/40 mt-6">
            ¿Nuevo?{' '}
            <Link to="/join/BEAST2026" className="text-beast-pink font-semibold hover:underline">
              Unirse al reto
            </Link>
          </p>
        </GlassCard>
      </div>
    </AppShell>
  );
}
