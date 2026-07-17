import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Send } from 'lucide-react';
import { AppShell } from '../components/AppShell';
import { PageContainer } from '../components/PageContainer';
import { PageTopBar } from '../components/PageTopBar';
import { GlassCard } from '../components/GlassCard';
import { Avatar } from '../components/Avatar';
import { PlayerProfileSheet } from '../components/PlayerProfileSheet';
import { api } from '../lib/api';
import { useLivePoll } from '../hooks/useLivePoll';
import { useNotifications } from '../components/NotificationProvider';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import type { Player } from '../types';
import { getStoredUser } from '../lib/user';

interface ChatMsg {
  id: string;
  body: string;
  createdAt: string;
  isOwn: boolean;
  user: { id: string; name: string; emoji: string; avatarUrl?: string | null };
}

function playerFromChatUser(
  user: ChatMsg['user'],
  catalog: Player[]
): Player {
  const found = catalog.find((p) => p.id === user.id);
  if (found) return found;
  return {
    id: user.id,
    displayName: user.name,
    gender: 'OTHER',
    points: 0,
    avatarEmoji: user.emoji,
    avatarUrl: user.avatarUrl,
    bio: null
  };
}

export default function Chat() {
  const navigate = useNavigate();
  const { showAppToast } = useNotifications();
  const online = useOnlineStatus();
  const me = getStoredUser();
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [profilePlayer, setProfilePlayer] = useState<Player | null>(null);
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

  const loadPlayers = async () => {
    const res = await api.players();
    if (res.success) setPlayers((res.players || []) as Player[]);
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
    void load();
    void loadPlayers();
  }, []);
  useLivePoll(pollNew, 8000);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const send = async () => {
    const body = text.trim();
    if (!body || sending) return;
    if (!online) {
      showAppToast('Sin conexión — no se puede enviar');
      return;
    }
    setSending(true);
    const draft = body;
    setText('');
    try {
      const res = await api.chatSend(draft);
      if (res.success && res.message) {
        const msg = res.message as ChatMsg;
        setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
        lastAt.current = msg.createdAt;
      } else {
        setText(draft);
        showAppToast(res.error || 'No se envió el mensaje');
      }
    } catch {
      setText(draft);
      showAppToast('Error de conexión');
    } finally {
      setSending(false);
    }
  };

  const openProfile = (msgUser: ChatMsg['user']) => {
    setProfilePlayer(playerFromChatUser(msgUser, players));
    if (players.some((p) => p.id === msgUser.id)) return;
    void api.players().then((res) => {
      if (!res.success) return;
      const list = (res.players || []) as Player[];
      setPlayers(list);
      setProfilePlayer(playerFromChatUser(msgUser, list));
    });
  };

  const profileRank = profilePlayer
    ? players.findIndex((p) => p.id === profilePlayer.id) + 1
    : undefined;

  return (
    <AppShell>
      <div className="chat-screen">
      <PageContainer variant="chat" className="flex-1 min-h-0 flex flex-col">
        <PageTopBar onBack={() => navigate('/')} />

        <h2 className="text-page-title font-black gradient-text mb-1 shrink-0">Chat del grupo</h2>
        <p className="text-white/40 text-sm mb-4">Toca la foto para ver su perfil</p>

        <GlassCard strong className="flex-1 min-h-0 p-3 mb-2 overflow-hidden flex flex-col">
          <div className="flex-1 min-h-0 overflow-y-auto space-y-3 pr-1 overscroll-contain">
            {messages.map((m) => (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex items-end gap-2 ${m.isOwn ? 'justify-end' : 'justify-start'}`}
              >
                {!m.isOwn && (
                  <button
                    type="button"
                    onClick={() => openProfile(m.user)}
                    className="shrink-0 mb-0.5 rounded-full active:scale-95 transition-transform"
                    aria-label={`Ver perfil de ${m.user.name}`}
                  >
                    <Avatar
                      url={m.user.avatarUrl}
                      emoji={m.user.emoji}
                      name={m.user.name}
                      size="sm"
                      expandable={false}
                    />
                  </button>
                )}
                <div
                  className={`max-w-[78%] rounded-2xl px-3 py-2 ${
                    m.isOwn
                      ? 'bg-gradient-to-br from-reto-pink/40 to-reto-purple/30 border border-white/15'
                      : 'bg-white/8 border border-white/10'
                  }`}
                >
                  {!m.isOwn && (
                    <button
                      type="button"
                      onClick={() => openProfile(m.user)}
                      className="text-[11px] font-semibold text-reto-cyan/90 mb-1 hover:text-reto-cyan transition-colors"
                    >
                      {m.user.name}
                    </button>
                  )}
                  <p className="text-sm text-white/95 whitespace-pre-wrap break-words">{m.body}</p>
                  <p className="text-[10px] text-white/35 mt-1 text-right">
                    {new Date(m.createdAt).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </motion.div>
            ))}
            {!messages.length && (
              <p className="text-center text-white/30 py-12 text-sm">Sé el primero en escribir</p>
            )}
            <div ref={bottomRef} />
          </div>
        </GlassCard>

        <div className="shrink-0 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="flex gap-2">
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
              enterKeyHint="send"
              autoComplete="off"
              className="flex-1 glass-btn rounded-2xl px-4 py-3 text-base outline-none"
            />
            <motion.button
              type="button"
              whileTap={{ scale: 0.94 }}
              disabled={sending || !text.trim() || !online}
              onClick={send}
              className="rounded-2xl px-4 py-3 font-bold disabled:opacity-40 btn-primary min-w-[48px] min-h-[48px] flex items-center justify-center"
              aria-label="Enviar mensaje"
            >
              <Send size={18} />
            </motion.button>
          </div>
        </div>
      </PageContainer>
      </div>

      <AnimatePresence>
        {profilePlayer && (
          <PlayerProfileSheet
            key={profilePlayer.id}
            player={profilePlayer}
            rank={profileRank && profileRank > 0 ? profileRank : undefined}
            isOwn={profilePlayer.id === me?.id}
            onClose={() => setProfilePlayer(null)}
            onEditProfile={
              profilePlayer.id === me?.id
                ? () => {
                    setProfilePlayer(null);
                    navigate('/perfil');
                  }
                : undefined
            }
          />
        )}
      </AnimatePresence>
    </AppShell>
  );
}
