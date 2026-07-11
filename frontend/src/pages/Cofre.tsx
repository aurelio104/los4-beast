import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, Unlock } from 'lucide-react';
import { AppShell } from '../components/AppShell';
import { PageContainer } from '../components/PageContainer';
import { PageTopBar } from '../components/PageTopBar';
import { GlassCard } from '../components/GlassCard';
import { api } from '../lib/api';
import { celebrateChest } from '../lib/celebrate';

export default function Cofre() {
  const navigate = useNavigate();
  const [clues, setClues] = useState<{ cycleIndex: number; clue: string }[]>([]);
  const [canClaim, setCanClaim] = useState(false);
  const [daysLeft, setDaysLeft] = useState(49);
  const [toast, setToast] = useState('');
  const [opening, setOpening] = useState(false);

  const load = () => api.chest().then((r) => {
    if (r.success) {
      setClues(r.clues);
      setCanClaim(r.canClaim);
      setDaysLeft(r.daysUntilChallenge);
    }
  });

  useEffect(() => { load(); }, []);

  const claim = async () => {
    setOpening(true);
    const res = await api.claimChest();
    if (res.success) {
      celebrateChest();
      setToast(`📦 ${res.clue} · +${res.points ?? 100} Puntos`);
      await load();
    } else {
      setToast(res.error || 'Error');
    }
    setOpening(false);
    setTimeout(() => setToast(''), 4000);
  };

  const progress = Math.min(100, ((49 - daysLeft) / 49) * 100);

  return (
    <AppShell>
      <PageContainer>
        <PageTopBar onBack={() => navigate('/')} />

        <motion.div animate={{ rotate: [0, -3, 3, 0], scale: [1, 1.05, 1] }} transition={{ duration: 4, repeat: Infinity }} className="text-center mb-8">
          <span className="text-8xl block mb-4">{daysLeft <= 1 ? '🔓' : '📦'}</span>
          <h2 className="text-2xl font-black gradient-text">Cofre</h2>
          <p className="text-white/40 text-sm mt-1">{daysLeft} días para la gran revelación</p>
        </motion.div>

        <GlassCard strong glow="gold" className="p-6 mb-6">
          <div className="h-2 rounded-full bg-white/10 mb-2 overflow-hidden">
            <motion.div className="h-full shimmer-bar" animate={{ width: `${progress}%` }} />
          </div>
          <p className="text-xs text-white/40 text-center">{Math.round(progress)}% descubierto</p>
        </GlassCard>

        {canClaim && (
          <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={claim} disabled={opening}
            className="w-full py-5 rounded-2xl font-black text-lg mb-6 flex items-center justify-center gap-2"
            style={{ background: 'linear-gradient(135deg, #ffbe0b, #ff006e)' }}>
            <Unlock size={22} /> {opening ? 'Abriendo...' : '¡Abrir cofre del ciclo!'}
          </motion.button>
        )}

        <p className="text-xs uppercase tracking-widest text-white/40 mb-3">Pistas desbloqueadas</p>
        <div className="space-y-3">
          {clues.length === 0 ? (
            <GlassCard className="p-6 text-center text-white/30">
              <Lock className="mx-auto mb-2 opacity-50" />
              Completa un ciclo de 10 días para la primera pista
            </GlassCard>
          ) : clues.map((c, i) => (
            <motion.div key={c.cycleIndex} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
              <GlassCard glow="purple" className="p-4">
                <p className="text-xs text-reto-gold mb-1">Ciclo {c.cycleIndex}</p>
                <p className="text-sm">{c.clue}</p>
              </GlassCard>
            </motion.div>
          ))}
        </div>

        {toast && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 glass-strong px-6 py-3 rounded-2xl font-semibold z-50 max-w-xs text-center">
            {toast}
          </motion.div>
        )}</PageContainer>
    </AppShell>
  );
}
