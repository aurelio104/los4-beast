import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, Zap } from 'lucide-react';
import { AppShell } from '../components/AppShell';
import { PageContainer } from '../components/PageContainer';
import { PageTopBar } from '../components/PageTopBar';
import { GlassCard } from '../components/GlassCard';
import { api } from '../lib/api';
import { RetoEvent } from '../types';

const EVENT_GAME: Record<string, string> = {
  RED_LIGHT: 'redlight',
  HONEYCOMB: 'honeycomb',
  DDAKJI: 'ddakji',
  GLASS_BRIDGE: 'glass'
};

export default function Eventos() {
  const navigate = useNavigate();
  const [events, setEvents] = useState<RetoEvent[]>([]);
  const [current, setCurrent] = useState<{ cycleIndex: number; isEventActive: boolean; hoursUntilNext: number; event: RetoEvent } | null>(null);

  useEffect(() => {
    api.events().then((r) => {
      if (r.success) {
        setEvents(r.events as RetoEvent[]);
        setCurrent(r.current as typeof current);
      }
    });
  }, []);

  return (
    <AppShell>
      <PageContainer>
        <PageTopBar onBack={() => navigate('/')} />

        <h2 className="text-2xl font-black gradient-text mb-2">Calendario</h2>
        <p className="text-white/40 text-sm mb-6">Eventos cada 10 días hasta el 29 de agosto</p>

        {current?.isEventActive && (
          <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }}>
            <GlassCard glow="pink" className="p-5 mb-6 flex items-center gap-4">
              <motion.div animate={{ rotate: [0, 10, -10, 0] }} transition={{ repeat: Infinity, duration: 2 }}>
                <Zap className="text-reto-pink" size={32} />
              </motion.div>
              <div>
                <p className="font-bold text-reto-pink">⚡ EVENTO ACTIVO</p>
                <p className="text-sm text-white/70">{current.event.emoji} {current.event.name}</p>
                <p className="text-xs text-white/40">{Math.round(current.hoursUntilNext)}h restantes</p>
              </div>
            </GlassCard>
          </motion.div>
        )}

        {current?.isEventActive && current.event?.game && EVENT_GAME[current.event.game] && (
          <motion.button type="button" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            onClick={() => navigate(`/arena?game=${EVENT_GAME[current.event.game!]}`)}
            className="w-full py-4 rounded-2xl font-black mb-6"
            style={{ background: 'linear-gradient(135deg, #06d6a0, #8338ec)' }}>
            🎮 Jugar {current.event.name} ahora
          </motion.button>
        )}

        <div className="space-y-3">
          {events.map((ev, i) => {
            const isCurrent = current?.cycleIndex === ev.cycleIndex;
            const isPast = (current?.cycleIndex ?? 0) > ev.cycleIndex;
            return (
              <motion.div key={ev.cycleIndex} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }}>
                <GlassCard glow={isCurrent ? 'gold' : undefined} className={`p-5 ${isPast ? 'opacity-50' : ''}`}>
                  <div className="flex items-center gap-4">
                    <span className="text-3xl">{ev.emoji}</span>
                    <div className="flex-1">
                      <p className="font-bold">{ev.name}</p>
                      <p className="text-xs text-white/50">{ev.desc}</p>
                    </div>
                    {isCurrent && ev.game && EVENT_GAME[ev.game] && (
                      <button type="button" onClick={() => navigate(`/arena?game=${EVENT_GAME[ev.game!]}`)}
                        className="text-[10px] bg-reto-cyan/30 px-2 py-1 rounded-full font-bold">JUGAR</button>
                    )}
                    {isCurrent && (!ev.game || !EVENT_GAME[ev.game]) && (
                      <span className="text-xs bg-reto-pink/30 px-2 py-1 rounded-full">AHORA</span>
                    )}
                    {isPast && <span className="text-xs text-white/30">✓</span>}
                  </div>
                </GlassCard>
              </motion.div>
            );
          })}
        </div>

        <GlassCard className="p-5 mt-6 flex items-start gap-3">
          <Calendar size={20} className="text-reto-cyan shrink-0 mt-0.5" />
          <p className="text-sm text-white/60">
            Cada evento dura ~10 días. Completa mini-juegos, abre el cofre y acumula Puntos para el gran reto del <strong className="text-white">29 de agosto</strong>.
          </p>
        </GlassCard></PageContainer>
    </AppShell>
  );
}
