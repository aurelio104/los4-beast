import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  CircleCheck, Handshake, HeartCrack, Skull, Gift, Swords, Trophy, ShoppingBag,
  Settings, Gamepad2, DollarSign, Vote, Users, MessageSquare, MessagesSquare,
  Calendar, Package, User, Zap, Bell, Crosshair, Share2
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { AppShell, HeroSection } from '../components/AppShell';
import { GlassCard } from '../components/GlassCard';
import { GlassButton } from '../components/GlassButton';
import { CountdownTimer } from '../components/CountdownTimer';
import { DramaFeed } from '../components/DramaFeed';
import { ActionInfoModal } from '../components/ActionInfoModal';
import { HubHeader } from '../components/HubHeader';
import { QuickChip } from '../components/QuickChip';
import { RetoLogo } from '../components/RetoLogo';
import { Avatar } from '../components/Avatar';
import { VotePanel } from '../components/VotePanel';
import { api } from '../lib/api';
import { HUB_ACTION_INFO, HubActionKey } from '../lib/actionInfo';
import { User as UserType, FeedItem, Player, RetoEvent, PlayerContext } from '../types';
import { celebrateWin, celebrateBetrayal, celebrateCoin } from '../lib/celebrate';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { useLivePoll } from '../hooks/useLivePoll';
import { shareMemberInvite } from '../lib/inviteShare';

export default function Hub() {
  const navigate = useNavigate();
  const location = useLocation();
  const push = usePushNotifications();
  const [user, setUser] = useState<UserType | null>(null);
  const [booting, setBooting] = useState(true);
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [toast, setToast] = useState('');
  const [loading, setLoading] = useState<string | null>(null);
  const [showRenegotiate, setShowRenegotiate] = useState(false);
  const [proposal, setProposal] = useState('');
  const [showBetray, setShowBetray] = useState(false);
  const [showVote, setShowVote] = useState(false);
  const [showAlliance, setShowAlliance] = useState(false);
  const [showChallenge, setShowChallenge] = useState(false);
  const [showBribe, setShowBribe] = useState(false);
  const [bribeOffer, setBribeOffer] = useState<{ points: number; penalty: string; alreadyAccepted?: boolean } | null>(null);
  const [daysLeft, setDaysLeft] = useState(49);
  const [eventActive, setEventActive] = useState(false);
  const [currentEvent, setCurrentEvent] = useState<RetoEvent | null>(null);
  const [infoKey, setInfoKey] = useState<HubActionKey | null>(null);
  const [playerCtx, setPlayerCtx] = useState<PlayerContext | null>(null);
  const [voteTally, setVoteTally] = useState<{ targetId: string; count: number; name: string }[]>([]);

  const load = useCallback(async () => {
    const stored = localStorage.getItem('user');
    if (!stored) { navigate('/login'); return; }

    const [me, feedRes, playersRes, status, votesRes, bribe] = await Promise.all([
      api.me(), api.feed(), api.players(), api.gameStatus(), api.votes(), api.bribe()
    ]);

    if (me.success) {
      setUser(me.user as UserType);
      localStorage.setItem('user', JSON.stringify(me.user));
    } else {
      setUser(JSON.parse(stored));
    }
    setFeed((feedRes.feed || []) as FeedItem[]);
    setPlayers((playersRes.players || []) as Player[]);
    setDaysLeft(status.daysUntilChallenge);
    setEventActive(status.isEventActive);
    setCurrentEvent(status.event as RetoEvent);
    if (status.player) setPlayerCtx(status.player);
    if (votesRes.success) setVoteTally(votesRes.tally || []);
    if (bribe.success) setBribeOffer({ ...bribe.offer, alreadyAccepted: bribe.alreadyAccepted });
    setBooting(false);
  }, [navigate]);

  useEffect(() => { load(); }, [load]);
  useLivePoll(load, 30000);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const action = async (
    key: string,
    fn: () => Promise<{ success: boolean; points?: number; gained?: number; alreadyDone?: boolean; error?: string; message?: string; penalty?: string }>,
    onSuccess?: (res: { gained?: number; points?: number }) => void
  ) => {
    setLoading(key);
    try {
      const res = await fn();
      if (res.success) {
        if (res.alreadyDone) showToast('Ya confirmaste hoy ✅');
        else if (res.gained != null || res.points != null) {
          const pts = res.gained ?? res.points ?? 0;
          if (key === 'betray') celebrateBetrayal();
          else if (key === 'bribe') celebrateCoin();
          else celebrateWin(pts);
          showToast(`${pts >= 0 ? '+' : ''}${pts} BP 🔥`);
          onSuccess?.(res);
        } else showToast(res.message || res.penalty || '¡Hecho!');
        await load();
      } else showToast(res.error || 'Error');
    } finally {
      setLoading(null);
    }
  };

  if (booting || !user) {
    return (
      <AppShell>
        <div className="min-h-dvh flex items-center justify-center">
          <RetoLogo size="lg" animate glow />
        </div>
      </AppShell>
    );
  }

  const openInfo = (key: HubActionKey) => setInfoKey(key);

  const confirmInfo = () => {
    if (!infoKey) return;
    const key = infoKey;
    setInfoKey(null);
    switch (key) {
      case 'continue':
        action('continue', api.continue);
        break;
      case 'clemency':
        action('clemency', api.clemency);
        break;
      case 'renegotiate':
        setShowRenegotiate(true);
        break;
      case 'betray':
        setShowBetray(true);
        break;
      case 'bribe':
        setShowBribe(true);
        break;
      case 'vote':
        setShowVote(true);
        break;
      case 'alliance':
        setShowAlliance(true);
        break;
      case 'challenge':
        setShowChallenge(true);
        break;
      case 'arena':
        navigate(playerCtx?.featuredGame ? `/arena?game=${playerCtx.featuredGame}` : '/arena');
        break;
      case 'tienda':
        navigate('/tienda');
        break;
      case 'confesion':
        navigate('/confesion');
        break;
      case 'chat':
        navigate('/chat');
        break;
      case 'eventos':
      case 'evento-activo':
        navigate('/eventos');
        break;
      case 'cofre':
        navigate('/cofre');
        break;
      case 'notificaciones':
        push.subscribe();
        break;
    }
  };

  const infoConfirmLabels: Partial<Record<HubActionKey, string>> = {
    continue: 'Confirmar hoy (+10 BP)',
    clemency: 'Pedir clemencia',
    renegotiate: 'Escribir propuesta',
    betray: 'Elegir objetivo',
    bribe: 'Ver oferta',
    vote: 'Elegir jugador',
    alliance: 'Elegir aliado',
    challenge: 'Elegir rival',
    arena: 'Ir a Arena',
    tienda: 'Ir a Tienda',
    confesion: 'Ir a Confesión',
    chat: 'Abrir chat',
    eventos: 'Ver calendario',
    'evento-activo': 'Ver evento',
    cofre: 'Abrir cofre',
    notificaciones: 'Activar alertas'
  };

  return (
    <AppShell>
      <div className="app-container pb-[max(7rem,calc(5.5rem+env(safe-area-inset-bottom)))]">
        <HeroSection className="pt-[max(0.75rem,env(safe-area-inset-top))]">
          <HubHeader
            displayName={user.displayName}
            avatarUrl={user.avatarUrl}
            avatarEmoji={user.avatarEmoji}
            points={user.points}
            showNotifications={!push.subscribed && push.supported}
            onNotifications={() => openInfo('notificaciones')}
          />

          {eventActive && currentEvent && (
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} onClick={() => openInfo('evento-activo')} className="mb-4">
              <GlassCard glow="pink" className="p-4 cursor-pointer flex items-center gap-3 bg-black/20">
                <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1.5 }}>
                  <Zap className="text-reto-pink" />
                </motion.div>
                <div>
                  <p className="text-xs text-reto-pink font-bold uppercase">Evento activo</p>
                  <p className="font-bold">{currentEvent.emoji} {currentEvent.name}</p>
                </div>
              </GlassCard>
            </motion.div>
          )}

          <GlassCard strong glow="pink" className="p-6 bg-black/25 backdrop-blur-2xl">
            <p className="text-center text-xs uppercase tracking-[0.3em] text-white/60 mb-4">Reto final · 29 Ago</p>
            <CountdownTimer />
            <motion.p
              className="text-center text-sm text-white/70 mt-5 italic"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              Playa · Reto
            </motion.p>
          </GlassCard>
        </HeroSection>


        {/* Accesos rápidos — scroll horizontal en móvil */}
        <div className="hub-quick-strip mb-4">
          {!push.subscribed && push.supported && (
            <QuickChip
              icon={Bell}
              label="Alertas"
              sublabel="Activar push"
              accent="gold"
              highlight
              onClick={() => openInfo('notificaciones')}
            />
          )}
          <QuickChip
            icon={Package}
            label="Cofre"
            sublabel={playerCtx?.canClaimChest ? '¡Listo!' : `${daysLeft} días`}
            accent="gold"
            highlight={!!playerCtx?.canClaimChest}
            onClick={() => openInfo('cofre')}
          />
          <QuickChip
            icon={Share2}
            label="Invitar"
            sublabel="Link personal"
            accent="cyan"
            onClick={async () => {
              try {
                const { shared } = await shareMemberInvite();
                showToast(shared ? 'Invitación compartida' : 'Link copiado');
              } catch (e) {
                showToast((e as Error).message || 'Error al invitar');
              }
            }}
          />
          {daysLeft <= 14 && (
            <QuickChip
              icon={Trophy}
              label="Gran Final"
              sublabel="Ver equipos"
              accent="pink"
              onClick={() => navigate('/finale')}
            />
          )}
        </div>

        {playerCtx?.featuredGame && eventActive && (
          <GlassCard glow="cyan" className="p-4 mb-4 cursor-pointer flex items-center gap-3" onClick={() => navigate(`/arena?game=${playerCtx.featuredGame}`)}>
            <motion.span animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1.2 }} className="text-2xl">🎮</motion.span>
            <div className="flex-1">
              <p className="text-xs text-reto-cyan font-bold uppercase">Juego del evento</p>
              <p className="font-bold text-sm">Jugar ahora en Arena →</p>
            </div>
          </GlassCard>
        )}

        {playerCtx?.alliance && (
          <GlassCard glow="purple" className="p-3 mb-4 flex items-center gap-3">
            <span className="text-2xl">{playerCtx.alliance.emoji}</span>
            <div>
              <p className="text-xs text-white/40 uppercase">Alianza secreta</p>
              <p className="text-sm font-bold">🤝 {playerCtx.alliance.name}</p>
            </div>
          </GlassCard>
        )}

        {playerCtx && playerCtx.streak > 0 && (
          <GlassCard className="p-3 mb-4 flex items-center justify-between">
            <span className="text-sm font-bold">🔥 Racha diaria</span>
            <span className="text-lg font-black text-reto-gold tabular-nums">{playerCtx.streak} días</span>
          </GlassCard>
        )}

        <p className="text-xs uppercase tracking-[0.2em] text-white/40 mb-3 px-0.5">Acciones</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3 mb-4">
          <GlassButton icon={CircleCheck} label="Continuar" sublabel={playerCtx?.continuedToday ? 'Hecho hoy ✓' : '+10 BP'} variant="success" loading={loading === 'continue'} showInfoHint badge={playerCtx ? !playerCtx.continuedToday : undefined} onClick={() => openInfo('continue')} />
          <GlassButton icon={HeartCrack} label="Clemencia" sublabel="1×/10 días" variant="gold" loading={loading === 'clemency'} showInfoHint onClick={() => openInfo('clemency')} />
          <GlassButton icon={Handshake} label="Renegociar" showInfoHint onClick={() => openInfo('renegotiate')} />
          <GlassButton icon={Skull} label="Traicionar" sublabel="+150 BP" variant="danger" showInfoHint pulse onClick={() => openInfo('betray')} />
          <GlassButton icon={DollarSign} label="Soborno" sublabel={bribeOffer ? `${bribeOffer.points} BP` : '...'} variant="gold" showInfoHint badge={playerCtx && !playerCtx.bribeAccepted && !bribeOffer?.alreadyAccepted ? true : undefined} onClick={() => openInfo('bribe')} />
          <GlassButton icon={Vote} label="Votar" sublabel="Eliminar" showInfoHint badge={playerCtx ? !playerCtx.hasVoted : undefined} onClick={() => openInfo('vote')} />
          <GlassButton icon={Users} label="Alianza" sublabel={playerCtx?.alliance ? playerCtx.alliance.name : 'Secreto'} showInfoHint onClick={() => openInfo('alliance')} />
          <GlassButton icon={Crosshair} label="Desafío 1v1" showInfoHint onClick={() => openInfo('challenge')} />
          <GlassButton icon={Gamepad2} label="Arena" variant="gold" showInfoHint pulse={!!playerCtx?.featuredGame} badge={playerCtx?.featuredGame ? '🎮' : undefined} onClick={() => openInfo('arena')} />
          <GlassButton icon={ShoppingBag} label="Tienda" showInfoHint onClick={() => openInfo('tienda')} />
          <GlassButton icon={MessageSquare} label="Confesión" showInfoHint onClick={() => openInfo('confesion')} />
          <GlassButton icon={MessagesSquare} label="Chat" sublabel="Grupo" variant="gold" showInfoHint pulse onClick={() => openInfo('chat')} />
          <GlassButton icon={Calendar} label="Eventos" showInfoHint onClick={() => openInfo('eventos')} />
        </div>

        <VotePanel tally={voteTally} />

        {playerCtx?.achievements && (
          <GlassCard className="p-4 mb-4">
            <p className="text-xs uppercase tracking-widest text-white/40 mb-3">Logros</p>
            <div className="flex flex-wrap gap-2">
              {playerCtx.achievements.map((a) => (
                <span key={a.id} title={a.title} className={`text-xl p-2 rounded-xl ${a.unlocked ? 'bg-white/10' : 'bg-white/5 opacity-30 grayscale'}`}>{a.emoji}</span>
              ))}
            </div>
          </GlassCard>
        )}

        <GlassCard className="p-4 mb-4">
          <div className="flex items-center gap-2 mb-3"><Trophy size={16} className="text-reto-gold" /><span className="text-sm font-bold">Ranking</span></div>
          {players.slice(0, 6).map((p, i) => (
            <motion.div key={p.id} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }} className="flex items-center gap-3 py-1.5">
              <span className="w-6 text-center shrink-0">{i === 0 ? '👑' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}</span>
              <Avatar url={p.avatarUrl} emoji={p.avatarEmoji} name={p.displayName} size="xs" />
              <span className="flex-1 text-sm truncate">{p.nickname || p.displayName}</span>
              <span className="text-xs font-bold text-reto-gold">{p.points} BP</span>
            </motion.div>
          ))}
        </GlassCard>

        <GlassCard className="p-4 mb-4">
          <div className="flex items-center gap-2 mb-3"><Swords size={16} className="text-reto-pink" /><span className="text-sm font-bold">Feed del Drama</span></div>
          <DramaFeed items={feed} />
        </GlassCard>

        <div className="fixed bottom-0 inset-x-0 z-50 p-3 sm:p-4 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="app-container !px-0 max-w-lg mx-auto glass-strong rounded-3xl p-1.5 sm:p-2 flex justify-around">
            {([
              { path: '/', active: true, logo: true as const },
              { icon: Gamepad2, path: '/arena' },
              { icon: Package, path: '/cofre' },
              { icon: Gift, path: '/tienda' },
              { icon: User, path: '/perfil' },
              ...(user.role === 'MASTER' ? [{ icon: Settings, path: '/admin' }] : [])
            ] as Array<{ path: string; active?: boolean; logo: true } | { path: string; active?: boolean; icon: LucideIcon }>).map((item) => {
              const active = location.pathname === item.path || ('active' in item && item.active);
              return (
                <button key={item.path} onClick={() => navigate(item.path)} className={`p-2.5 sm:p-3 rounded-2xl ${active ? 'bg-white/10' : ''}`}>
                  {'logo' in item ? (
                    <RetoLogo size="xs" className={active ? '' : 'opacity-50'} />
                  ) : (
                    (() => { const Icon = item.icon; return <Icon size={20} className={item.path === '/admin' ? 'text-reto-gold' : active ? 'text-white' : 'text-white/50'} />; })()
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {infoKey && (
          <ActionInfoModal
            info={HUB_ACTION_INFO[infoKey]}
            onClose={() => setInfoKey(null)}
            onConfirm={confirmInfo}
            confirmLabel={infoConfirmLabels[infoKey]}
            loading={infoKey === 'continue' ? loading === 'continue' : infoKey === 'clemency' ? loading === 'clemency' : false}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[60] glass-strong px-6 py-3 rounded-2xl text-sm font-semibold">{toast}</motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showRenegotiate && (
          <Modal onClose={() => setShowRenegotiate(false)} title="🤝 Renegociar">
            <textarea rows={3} placeholder="Propón cambiar reglas..." value={proposal} onChange={(e) => setProposal(e.target.value)} />
            <button className="mt-4 w-full glass-btn py-4 rounded-2xl font-bold" onClick={async () => {
              await action('reneg', () => api.renegotiate(proposal)); setShowRenegotiate(false); setProposal('');
            }}>Enviar</button>
          </Modal>
        )}
        {showBetray && (
          <Modal onClose={() => setShowBetray(false)} title="💀 Traicionar">
            <p className="text-sm text-white/60 mb-4">Anónimo · +150 BP</p>
            {players.filter((p) => p.id !== user.id).map((p) => (
              <button key={p.id} className="w-full glass-btn py-3 rounded-xl text-sm font-semibold mb-2 flex items-center gap-3 px-4" onClick={async () => {
                await action('betray', () => api.betray(p.id)); setShowBetray(false);
              }}>
                <Avatar url={p.avatarUrl} emoji={p.avatarEmoji} name={p.displayName} size="xs" />
                {p.nickname || p.displayName}
              </button>
            ))}
          </Modal>
        )}
        {showVote && (
          <Modal onClose={() => setShowVote(false)} title="🗳️ Votar eliminar">
            <p className="text-sm text-white/60 mb-4">¿Quién hace el reto más duro?</p>
            {players.filter((p) => p.id !== user.id).map((p) => (
              <button key={p.id} className="w-full glass-btn py-3 rounded-xl text-sm font-semibold mb-2 flex items-center gap-3 px-4" onClick={async () => {
                await action('vote', () => api.vote(p.id)); setShowVote(false);
              }}>
                <Avatar url={p.avatarUrl} emoji={p.avatarEmoji} name={p.displayName} size="xs" />
                {p.nickname || p.displayName}
              </button>
            ))}
          </Modal>
        )}
        {showAlliance && (
          <Modal onClose={() => setShowAlliance(false)} title="🤝 Alianza secreta">
            <p className="text-sm text-white/60 mb-4">Pacto de este ciclo (+25 BP)</p>
            {players.filter((p) => p.id !== user.id).map((p) => (
              <button key={p.id} className="w-full glass-btn py-3 rounded-xl text-sm font-semibold mb-2 flex items-center gap-3 px-4" onClick={async () => {
                await action('ally', () => api.alliance(p.id)); setShowAlliance(false);
              }}>
                <Avatar url={p.avatarUrl} emoji={p.avatarEmoji} name={p.displayName} size="xs" />
                {p.nickname || p.displayName}
              </button>
            ))}
          </Modal>
        )}
        {showChallenge && (
          <Modal onClose={() => setShowChallenge(false)} title="⚔️ Desafío 1v1">
            <p className="text-sm text-white/60 mb-4">Simula duelo — ¿ganaste?</p>
            {players.filter((p) => p.id !== user.id).map((p) => (
              <div key={p.id} className="flex gap-2 mb-2">
                <button className="flex-1 glass-btn py-3 rounded-xl text-sm" onClick={async () => {
                  await action('ch', () => api.challenge1v1(p.id, true)); setShowChallenge(false);
                }}>✅ vs {p.nickname || p.displayName}</button>
                <button className="glass-btn px-4 rounded-xl text-sm text-white/50" onClick={async () => {
                  await action('ch', () => api.challenge1v1(p.id, false)); setShowChallenge(false);
                }}>❌</button>
              </div>
            ))}
          </Modal>
        )}
        {showBribe && bribeOffer && (
          <Modal onClose={() => setShowBribe(false)} title="💰 Soborno del día">
            {bribeOffer.alreadyAccepted ? (
              <p className="text-white/60">Ya aceptaste el soborno de este ciclo.</p>
            ) : (
              <>
                <motion.p animate={{ scale: [1, 1.05, 1] }} transition={{ repeat: Infinity, duration: 2 }} className="text-4xl font-black text-glow-gold text-center my-4">+{bribeOffer.points} BP</motion.p>
                <p className="text-sm text-reto-red text-center mb-4">Penalización: {bribeOffer.penalty}</p>
                <button className="w-full py-4 rounded-2xl font-bold" style={{ background: 'linear-gradient(135deg,#ffbe0b,#ff006e)' }}
                  onClick={async () => { await action('bribe', api.acceptBribe); setShowBribe(false); }}>Aceptar soborno</button>
              </>
            )}
          </Modal>
        )}
      </AnimatePresence>
    </AppShell>
  );
}

function Modal({ children, onClose, title }: { children: React.ReactNode; onClose: () => void; title: string }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <motion.div initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }} className="glass-strong w-full max-w-md rounded-3xl p-6 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-bold mb-4">{title}</h3>
        {children}
      </motion.div>
    </motion.div>
  );
}
