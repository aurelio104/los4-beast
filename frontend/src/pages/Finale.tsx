import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Trophy, Users } from 'lucide-react';
import { AppShell } from '../components/AppShell';
import { GlassCard } from '../components/GlassCard';
import { CountdownTimer } from '../components/CountdownTimer';
import { api } from '../lib/api';
import { Player, PlayerContext } from '../types';

const GENDER_LABEL: Record<string, string> = {
  MALE: 'Hombres 👨',
  FEMALE: 'Mujeres 👩',
  OTHER: 'Equipo 🌈'
};

export default function Finale() {
  const navigate = useNavigate();
  const [players, setPlayers] = useState<Player[]>([]);
  const [ctx, setCtx] = useState<PlayerContext | null>(null);

  const load = useCallback(async () => {
    const [playersRes, status] = await Promise.all([api.players(), api.gameStatus()]);
    if (playersRes.success) setPlayers((playersRes.players || []) as Player[]);
    if (status.player) setCtx(status.player);
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <AppShell background="beach">
      <div className="max-w-lg mx-auto px-4 py-6 pb-24">
        <button type="button" onClick={() => navigate('/')} className="flex items-center gap-2 text-white/50 mb-6">
          <ArrowLeft size={18} /> Hub
        </button>

        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center mb-8">
          <Trophy className="mx-auto text-reto-gold mb-3" size={48} />
          <h1 className="text-3xl font-black gradient-text text-glow">Gran Final</h1>
          <p className="text-white/50 text-sm mt-2">29 de agosto · retos en vivo</p>
        </motion.div>

        <GlassCard strong glow="gold" className="p-6 mb-6">
          <p className="text-center text-xs uppercase tracking-[0.3em] text-white/60 mb-4">Cuenta atrás</p>
          <CountdownTimer />
        </GlassCard>

        {ctx?.teamStats && ctx.teamStats.length > 0 && (
          <GlassCard glow="pink" className="p-5 mb-6">
            <p className="text-xs uppercase tracking-widest text-white/40 mb-3 flex items-center gap-2"><Users size={14} /> Batalla por equipos</p>
            <div className="space-y-3">
              {ctx.teamStats.map((t) => (
                <div key={t.gender} className="flex items-center justify-between">
                  <span className="text-sm font-semibold">{GENDER_LABEL[t.gender] || t.gender}</span>
                  <span className="text-reto-gold font-black tabular-nums">{t.totalPoints} BP</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-white/40 mt-4">El equipo con menos BP elige el castigo del otro 🍕🍔</p>
          </GlassCard>
        )}

        <GlassCard className="p-5 mb-6">
          <p className="text-xs uppercase tracking-widest text-white/40 mb-3">Ranking pre-final</p>
          {players.slice(0, 8).map((p, i) => (
            <div key={p.id} className="flex items-center gap-3 py-1.5">
              <span className="w-6">{i === 0 ? '👑' : `${i + 1}.`}</span>
              <span className="flex-1 text-sm truncate">{p.nickname || p.displayName}</span>
              <span className="text-xs font-bold text-reto-gold">{p.points} BP</span>
            </div>
          ))}
        </GlassCard>

        <GlassCard className="p-5">
          <p className="text-sm text-white/70 leading-relaxed">
            El gran día se juega <strong className="text-white">en persona</strong>. Los premios canjeados en la Tienda se entregan ese día.
            Traiciones, confesiones y votos se revelan en vivo. 🔥
          </p>
        </GlassCard>
      </div>
    </AppShell>
  );
}
