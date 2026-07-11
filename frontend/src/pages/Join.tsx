import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { UserPlus, Loader2, Flame } from 'lucide-react';
import { AppShell } from '../components/AppShell';
import { GlassCard } from '../components/GlassCard';
import { api } from '../lib/api';
import { User } from '../types';

export default function Join() {
  const { code = 'RETO2026' } = useParams();
  const navigate = useNavigate();
  const [valid, setValid] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    displayName: '',
    nickname: '',
    gender: 'OTHER'
  });

  useEffect(() => {
    api.invite(code!).then((r) => setValid(r.valid));
  }, [code]);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await api.join({ ...form, inviteCode: code! });
      if (!res.success || !res.token) throw new Error(res.error || 'Error al registrarse');
      localStorage.setItem('token', res.token);
      localStorage.setItem('user', JSON.stringify(res.user));
      navigate('/', { replace: true });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
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
        <div className="min-h-dvh flex flex-col items-center justify-center px-4 text-center">
          <p className="text-2xl mb-4">🚫</p>
          <p className="text-white/60">Código de invitación inválido</p>
          <Link to="/login" className="mt-4 text-reto-pink">Ir al login</Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell background="beach">
      <div className="min-h-dvh flex flex-col items-center justify-center px-4 py-12">
        <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="text-center mb-8">
          <Flame size={40} className="mx-auto text-reto-gold mb-2" />
          <h1 className="text-3xl font-black gradient-text">Únete al Reto</h1>
          <p className="text-white/40 text-sm mt-1">Código: {code}</p>
        </motion.div>

        <GlassCard strong glow="gold" className="w-full max-w-md p-8 bg-black/30 backdrop-blur-2xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs text-white/40 mb-1 block">Nombre</label>
              <input value={form.displayName} onChange={(e) => set('displayName', e.target.value)} required placeholder="Tu nombre" />
            </div>
            <div>
              <label className="text-xs text-white/40 mb-1 block">Apodo (opcional)</label>
              <input value={form.nickname} onChange={(e) => set('nickname', e.target.value)} placeholder="Como te conocen" />
            </div>
            <div>
              <label className="text-xs text-white/40 mb-1 block">Género (para retos de grupo)</label>
              <select value={form.gender} onChange={(e) => set('gender', e.target.value)}>
                <option value="M">Hombre</option>
                <option value="F">Mujer</option>
                <option value="OTHER">Otro / Prefiero no decir</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-white/40 mb-1 block">Usuario</label>
              <input value={form.username} onChange={(e) => set('username', e.target.value)} required placeholder="min 3 caracteres" />
            </div>
            <div>
              <label className="text-xs text-white/40 mb-1 block">Email</label>
              <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} required />
            </div>
            <div>
              <label className="text-xs text-white/40 mb-1 block">Contraseña</label>
              <input type="password" value={form.password} onChange={(e) => set('password', e.target.value)} required minLength={8} />
            </div>
            {error && <p className="text-reto-red text-sm">{error}</p>}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg, #ffbe0b, #ff006e)' }}
            >
              {loading ? <Loader2 className="animate-spin" /> : <UserPlus size={20} />}
              Entrar al Reto
            </motion.button>
          </form>
          <p className="text-center text-sm text-white/40 mt-4">
            ¿Ya tienes cuenta? <Link to="/login" className="text-reto-cyan">Login</Link>
          </p>
        </GlassCard>
      </div>
    </AppShell>
  );
}
