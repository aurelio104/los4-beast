import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, MessageSquare } from 'lucide-react';
import { AppShell } from '../components/AppShell';
import { GlassCard } from '../components/GlassCard';
import { api } from '../lib/api';
import { celebrateWin } from '../lib/celebrate';

interface ConfessionItem {
  id: string;
  message: string;
  revealed: boolean;
  isOwn: boolean;
  author: string;
  createdAt: string;
}

export default function Confesion() {
  const navigate = useNavigate();
  const [list, setList] = useState<ConfessionItem[]>([]);
  const [message, setMessage] = useState('');
  const [toast, setToast] = useState('');

  const load = () => api.confessions().then((r) => {
    if (r.success) setList(r.confessions as ConfessionItem[]);
  });

  useEffect(() => { load(); }, []);

  const submit = async () => {
    if (!message.trim()) return;
    const res = await api.confession(message.trim());
    if (res.success) {
      celebrateWin(20);
      setToast('Confesión guardada — se revela el 29 ago 🤐');
      setMessage('');
      load();
    } else {
      setToast(res.error || 'Error');
    }
    setTimeout(() => setToast(''), 3000);
  };

  return (
    <AppShell>
      <div className="max-w-lg mx-auto px-4 py-6 pb-24">
        <button onClick={() => navigate('/')} className="flex items-center gap-2 text-white/50 mb-6">
          <ArrowLeft size={18} /> Hub
        </button>

        <h2 className="text-2xl font-black gradient-text mb-2">Confession Booth</h2>
        <p className="text-white/40 text-sm mb-6">Anónimo hasta el gran día · +20 Puntos</p>

        <GlassCard strong glow="pink" className="p-5 mb-6">
          <textarea rows={4} placeholder="Algo que quieras decir al grupo..." value={message} onChange={(e) => setMessage(e.target.value)} maxLength={500} />
          <motion.button whileTap={{ scale: 0.98 }} onClick={submit}
            className="w-full mt-4 py-3 rounded-xl font-bold flex items-center justify-center gap-2"
            style={{ background: 'linear-gradient(135deg, #8338ec, #ff006e)' }}>
            <MessageSquare size={18} /> Confesar (+20 Puntos)
          </motion.button>
        </GlassCard>

        <p className="text-xs uppercase tracking-widest text-white/40 mb-3">Confesiones</p>
        <div className="space-y-3">
          {list.map((c, i) => (
            <motion.div key={c.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }}>
              <GlassCard className={`p-4 ${c.isOwn ? 'border-reto-cyan/30' : ''}`}>
                <p className="text-xs text-white/40 mb-2">{c.revealed ? c.author : '🔒 Anónimo'}{c.isOwn ? ' (tuya)' : ''}</p>
                <p className="text-sm text-white/90">{c.revealed ? c.message : '••••••••••••••••'}</p>
              </GlassCard>
            </motion.div>
          ))}
          {!list.length && <p className="text-center text-white/30 py-8">Nadie ha confesado aún...</p>}
        </div>

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
