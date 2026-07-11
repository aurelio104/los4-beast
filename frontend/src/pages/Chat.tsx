import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Send } from 'lucide-react';
import { AppShell } from '../components/AppShell';
import { PageContainer } from '../components/PageContainer';
import { GlassCard } from '../components/GlassCard';
import { Avatar } from '../components/Avatar';
import { api } from '../lib/api';
import { useLivePoll } from '../hooks/useLivePoll';

interface ChatMsg {
  id: string;
  body: string;
  createdAt: string;
  isOwn: boolean;
  user: { id: string; name: string; emoji: string; avatarUrl?: string | null };
}

export default function Chat() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastAt = useRef<string | null>(null);

  const load = async () => {
    const res = await api.chatMessages();
    if (!res.success) return;
    const list = (res.messages || []) as ChatMsg[];
    setMessages(list);
    if (list.length) lastAt.current = list[list.length - 1].createdAt;
  };

  const pollNew = async () => {
    if (!lastAt.current) {
      await load();
      return;
    }
    const res = await api.chatMessages(lastAt.current);
    if (!res.success || !res.messages?.length) return;
    const incoming = (res.messages as ChatMsg[]).filter((m) => m.createdAt > (lastAt.current || ''));
    if (!incoming.length) return;
    setMessages((prev) => {
      const ids = new Set(prev.map((m) => m.id));
      const merged = [...prev, ...incoming.filter((m) => !ids.has(m.id))];
      if (merged.length) lastAt.current = merged[merged.length - 1].createdAt;
      return merged;
    });
  };

  useEffect(() => {
    load();
  }, []);
  useLivePoll(pollNew, 4000);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const send = async () => {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    setText('');
    try {
      const res = await api.chatSend(body);
      if (res.success && res.message) {
        const msg = res.message as ChatMsg;
        setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
        lastAt.current = msg.createdAt;
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <AppShell>
      <PageContainer variant="chat">
        <button type="button" onClick={() => navigate('/')} className="flex items-center gap-2 text-white/50 mb-4 shrink-0">
          <ArrowLeft size={18} /> Hub
        </button>

        <h2 className="text-page-title font-black gradient-text mb-1 shrink-0">Chat del grupo</h2>
        <p className="text-white/40 text-sm mb-4">Habla con los miembros del Reto · se actualiza solo</p>

        <GlassCard strong className="flex-1 p-3 mb-4 overflow-hidden flex flex-col min-h-[50dvh]">
          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {messages.map((m) => (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${m.isOwn ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3 py-2 ${
                    m.isOwn
                      ? 'bg-gradient-to-br from-reto-pink/40 to-reto-purple/30 border border-white/15'
                      : 'bg-white/8 border border-white/10'
                  }`}
                >
                  {!m.isOwn && (
                    <p className="text-[11px] text-white/50 mb-1 flex items-center gap-1.5">
                      <Avatar url={m.user.avatarUrl} emoji={m.user.emoji} name={m.user.name} size="xs" className="!w-5 !h-5 !text-[10px]" />
                      {m.user.name}
                    </p>
                  )}
                  <p className="text-sm text-white/95 whitespace-pre-wrap break-words">{m.body}</p>
                  <p className="text-[10px] text-white/35 mt-1 text-right">
                    {new Date(m.createdAt).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </motion.div>
            ))}
            {!messages.length && (
              <p className="text-center text-white/30 py-12 text-sm">Sé el primero en escribir 👋</p>
            )}
            <div ref={bottomRef} />
          </div>
        </GlassCard>

        <div className="fixed bottom-0 inset-x-0 z-50 p-3 sm:p-4 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="app-container !py-0 flex gap-2">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              maxLength={500}
              placeholder="Escribe al grupo..."
              className="flex-1 glass-btn rounded-2xl px-4 py-3 text-sm outline-none"
            />
            <motion.button
              type="button"
              whileTap={{ scale: 0.94 }}
              disabled={sending || !text.trim()}
              onClick={send}
              className="rounded-2xl px-4 py-3 font-bold disabled:opacity-40"
              style={{ background: 'linear-gradient(135deg, #8338ec, #ff006e)' }}
            >
              <Send size={18} />
            </motion.button>
          </div>
        </div>
      </PageContainer>
    </AppShell>
  );
}
