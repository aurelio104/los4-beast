import { motion } from 'framer-motion';
import { GlassCard } from './GlassCard';

interface VoteEntry {
  targetId: string;
  count: number;
  name: string;
}

export function VotePanel({ tally }: { tally: VoteEntry[] }) {
  if (!tally.length) {
    return (
      <GlassCard className="p-4 mb-4">
        <p className="text-xs uppercase tracking-widest text-white/40 mb-2">Votación del ciclo</p>
        <p className="text-sm text-white/40 text-center py-2">Nadie ha votado aún 🗳️</p>
      </GlassCard>
    );
  }

  const max = Math.max(...tally.map((t) => t.count));

  return (
    <GlassCard glow="purple" className="p-4 mb-4">
      <p className="text-xs uppercase tracking-widest text-white/40 mb-3">Votación · reto más duro</p>
      <div className="space-y-2">
        {tally.slice(0, 5).map((t, i) => (
          <div key={t.targetId} className="relative">
            <div className="flex items-center justify-between text-sm mb-1 relative z-10">
              <span className="truncate">{i === 0 ? '👹 ' : ''}{t.name}</span>
              <span className="text-reto-pink font-bold tabular-nums">{t.count}</span>
            </div>
            <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-reto-pink to-reto-purple"
                initial={{ width: 0 }}
                animate={{ width: `${(t.count / max) * 100}%` }}
                transition={{ delay: i * 0.08, duration: 0.5 }}
              />
            </div>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}
