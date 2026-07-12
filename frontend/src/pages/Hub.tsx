import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  CircleCheck, Handshake, HeartCrack, Skull, Swords, Trophy, ShoppingBag,
  Gamepad2, DollarSign, Vote, Users, MessageSquare, MessagesSquare,
  Calendar, Package, Zap, Crosshair, Music2
} from 'lucide-react';
import { AppShell } from '../components/AppShell';
import { GlassCard } from '../components/GlassCard';
import { GlassButton } from '../components/GlassButton';
import { MainTabLayout } from '../components/MainTabLayout';
import { CountdownTimer } from '../components/CountdownTimer';
import { DramaFeed } from '../components/DramaFeed';
import { ActionInfoModal } from '../components/ActionInfoModal';
import { HubHeader } from '../components/HubHeader';
import { StoryStrip } from '../components/StoryStrip';
import { StoryViewerModal } from '../components/StoryViewerModal';
import { StoryCreateModal } from '../components/StoryCreateModal';
import { QuickChip } from '../components/QuickChip';
import { Avatar } from '../components/Avatar';
import { VotePanel } from '../components/VotePanel';
import { api } from '../lib/api';
import { HUB_ACTION_INFO, HubActionKey } from '../lib/actionInfo';
import { User as UserType, FeedItem, Player, RetoEvent, PlayerContext, StoryUserGroup } from '../types';
import { celebrateWin, celebrateBetrayal, celebrateCoin } from '../lib/celebrate';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { hydratePushFromServer } from '../hooks/usePushNotifications';
import { useLivePoll } from '../hooks/useLivePoll';
import { useNotifications } from '../components/NotificationProvider';
import { RadioSubmitModal } from '../components/RadioSubmitModal';
import { useNowPlaying } from '../components/BackgroundMusic';
import { staggerContainer, staggerItem, slideSheet, slideSheetTransition, overlayFade, overlayTransition } from '../lib/motion';
import { getStoredUser } from '../lib/user';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { useModalBackClose } from '../hooks/useModalBackClose';

export default function Hub() {
  const navigate = useNavigate();
  const push = usePushNotifications();
  const { chatUnread, showAppToast } = useNotifications();
  const reducedMotion = useReducedMotion();
  const [user, setUser] = useState<UserType | null>(getStoredUser);
  const [booting, setBooting] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
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
  const [showRadio, setShowRadio] = useState(false);
  const [storyGroups, setStoryGroups] = useState<StoryUserGroup[]>([]);
  const [storiesLoading, setStoriesLoading] = useState(true);
  const [storyViewerId, setStoryViewerId] = useState<string | null>(null);
  const [showCreateStory, setShowCreateStory] = useState(false);
  const nowPlaying = useNowPlaying();

  const load = useCallback(async () => {
    const stored = localStorage.getItem('user');
    if (!stored) { navigate('/login'); return; }

    let cached: UserType;
    try {
      cached = JSON.parse(stored) as UserType;
    } catch {
      navigate('/login');
      return;
    }

    setUser((prev) => prev ?? cached);

    try {
      const snap = await api.hubSnapshot();

      if (snap.success) {
        setLoadError(null);
        setUser(snap.user as UserType);
        localStorage.setItem('user', JSON.stringify(snap.user));
        void hydratePushFromServer(snap.user as UserType);
        setFeed((snap.feed || []) as FeedItem[]);
        setPlayers((snap.players || []) as Player[]);
        setDaysLeft(snap.daysUntilChallenge);
        setEventActive(snap.isEventActive);
        setCurrentEvent(snap.event as RetoEvent);
        if (snap.player) setPlayerCtx(snap.player);
        setVoteTally(snap.tally || []);
        setBribeOffer({ ...snap.bribe.offer, alreadyAccepted: snap.bribe.alreadyAccepted });
        setStoryGroups(snap.stories || []);
      } else {
        setLoadError((snap as { error?: string }).error || 'No se pudieron actualizar los datos');
      }
    } catch {
      setLoadError('Sin conexión — mostrando datos guardados');
    } finally {
      setStoriesLoading(false);
      setBooting(false);
    }
  }, [navigate]);

  useEffect(() => { load(); }, [load]);
  useLivePoll(load, 30000);

  const showToast = (msg: string) => showAppToast(msg);

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
          showToast(`${pts >= 0 ? '+' : ''}${pts} Puntos 🔥`);
          onSuccess?.(res);
        } else showToast(res.message || res.penalty || '¡Hecho!');
        await load();
      } else {
        const msg = res.error || 'Error';
        showToast(msg);
        showAppToast(msg);
      }
    } catch {
      const msg = 'Sin conexión — inténtalo de nuevo';
      showToast(msg);
      showAppToast(msg);
    } finally {
      setLoading(null);
    }
  };

  if (booting || !user) {
    return (
      <AppShell>
        <MainTabLayout>
          <div className="app-container space-y-4 animate-pulse pt-safe">
            <div className="h-36 rounded-3xl bg-white/5" />
            <div className="grid grid-cols-2 gap-2">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <div key={n} className="hub-tile rounded-2xl bg-white/5" />
              ))}
            </div>
            <div className="h-48 rounded-3xl bg-white/5" />
            <div className="h-32 rounded-3xl bg-white/5" />
          </div>
        </MainTabLayout>
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
    continue: 'Confirmar hoy (+10 Puntos)',
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
      <MainTabLayout>
        <div className="app-container">
        {loadError && (
          <div className="mb-3 glass-subtle rounded-2xl px-4 py-3 flex items-center justify-between gap-3">
            <p className="text-xs text-white/70">{loadError}</p>
            <button type="button" onClick={() => void load()} className="text-xs font-bold text-reto-cyan shrink-0 min-h-[44px] px-2">
              Reintentar
            </button>
          </div>
        )}
        <div className="hub-hero">
          <HubHeader
            displayName={user.displayName}
            avatarUrl={user.avatarUrl}
            avatarEmoji={user.avatarEmoji}
            points={user.points}
          />

          <StoryStrip
            currentUser={user}
            groups={storyGroups}
            loading={storiesLoading}
            onOpenCreate={() => setShowCreateStory(true)}
            onOpenViewer={(userId) => setStoryViewerId(userId)}
          />

          {eventActive && currentEvent && (
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} onClick={() => openInfo('evento-activo')} className="mb-4">
              <div className="hub-event-pill flex items-center gap-3 p-4">
                <motion.div animate={reducedMotion ? {} : { scale: [1, 1.2, 1] }} transition={reducedMotion ? undefined : { repeat: Infinity, duration: 1.5 }}>
                  <Zap className="text-reto-pink shrink-0" size={22} />
                </motion.div>
                <div className="min-w-0">
                  <p className="text-[10px] text-reto-pink font-bold uppercase tracking-wider">Evento activo</p>
                  <p className="font-bold text-white truncate">{currentEvent.emoji} {currentEvent.name}</p>
                </div>
              </div>
            </motion.div>
          )}

          <div className="hub-hero-countdown">
            <p className="hub-hero-eyebrow">Reto final · 29 Ago</p>
            <CountdownTimer />
            <motion.p
              className="hub-hero-tagline"
              animate={reducedMotion ? { opacity: 0.85 } : { opacity: [0.5, 1, 0.5] }}
              transition={reducedMotion ? undefined : { duration: 3, repeat: Infinity }}
            >
              Playa · Reto
            </motion.p>
          </div>
        </div>


        {/* Accesos rápidos — scroll horizontal en móvil */}
        <div className="hub-quick-strip mb-4">
          <QuickChip
            icon={Package}
            label="Cofre"
            sublabel={playerCtx?.canClaimChest ? '¡Listo!' : `${daysLeft} días`}
            accent="gold"
            highlight={!!playerCtx?.canClaimChest}
            onClick={() => openInfo('cofre')}
          />
          <QuickChip
            icon={Music2}
            label="DJ Reto"
            sublabel={nowPlaying ? nowPlaying.title.slice(0, 18) : '+75 Puntos'}
            accent="pink"
            onClick={() => setShowRadio(true)}
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
          <GlassCard glow="cyan" interactive className="p-4 mb-4 flex items-center gap-3" onClick={() => navigate(`/arena?game=${playerCtx.featuredGame}`)}>
            <motion.span animate={reducedMotion ? {} : { scale: [1, 1.2, 1] }} transition={reducedMotion ? undefined : { repeat: Infinity, duration: 1.2 }} className="text-2xl">🎮</motion.span>
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

        <p className="text-xs uppercase tracking-[0.2em] text-white/55 mb-3 px-0.5">Acciones</p>
        <div className="hub-actions-wrap mb-4">
          <motion.div
            className="action-grid"
            variants={reducedMotion ? undefined : staggerContainer}
            initial={reducedMotion ? false : 'hidden'}
            animate={reducedMotion ? undefined : 'show'}
          >
          <motion.div variants={reducedMotion ? undefined : staggerItem} className="hub-tile-cell"><GlassButton icon={CircleCheck} label="Continuar" sublabel={playerCtx?.continuedToday ? 'Hecho hoy ✓' : '+10 Puntos'} variant="success" loading={loading === 'continue'} showInfoHint badge={playerCtx ? !playerCtx.continuedToday : undefined} onClick={() => openInfo('continue')} /></motion.div>
          <motion.div variants={reducedMotion ? undefined : staggerItem} className="hub-tile-cell"><GlassButton icon={HeartCrack} label="Clemencia" sublabel="1×/10 días" variant="gold" loading={loading === 'clemency'} showInfoHint onClick={() => openInfo('clemency')} /></motion.div>
          <motion.div variants={reducedMotion ? undefined : staggerItem} className="hub-tile-cell"><GlassButton icon={Handshake} label="Renegociar" showInfoHint onClick={() => openInfo('renegotiate')} /></motion.div>
          <motion.div variants={reducedMotion ? undefined : staggerItem} className="hub-tile-cell"><GlassButton icon={Skull} label="Traicionar" sublabel="+150 Puntos" variant="danger" showInfoHint pulse onClick={() => openInfo('betray')} /></motion.div>
          <motion.div variants={reducedMotion ? undefined : staggerItem} className="hub-tile-cell"><GlassButton icon={DollarSign} label="Soborno" sublabel={bribeOffer ? `${bribeOffer.points} Puntos` : '...'} variant="gold" showInfoHint badge={playerCtx && !playerCtx.bribeAccepted && !bribeOffer?.alreadyAccepted ? true : undefined} onClick={() => openInfo('bribe')} /></motion.div>
          <motion.div variants={reducedMotion ? undefined : staggerItem} className="hub-tile-cell"><GlassButton icon={Vote} label="Votar" sublabel="Eliminar" showInfoHint badge={playerCtx ? !playerCtx.hasVoted : undefined} onClick={() => openInfo('vote')} /></motion.div>
          <motion.div variants={reducedMotion ? undefined : staggerItem} className="hub-tile-cell"><GlassButton icon={Users} label="Alianza" sublabel={playerCtx?.alliance ? playerCtx.alliance.name : 'Secreto'} showInfoHint onClick={() => openInfo('alliance')} /></motion.div>
          <motion.div variants={reducedMotion ? undefined : staggerItem} className="hub-tile-cell"><GlassButton icon={Crosshair} label="Desafío 1v1" showInfoHint onClick={() => openInfo('challenge')} /></motion.div>
          <motion.div variants={reducedMotion ? undefined : staggerItem} className="hub-tile-cell"><GlassButton icon={Gamepad2} label="Arena" variant="gold" showInfoHint pulse={!!playerCtx?.featuredGame} badge={playerCtx?.featuredGame ? '🎮' : undefined} onClick={() => openInfo('arena')} /></motion.div>
          <motion.div variants={reducedMotion ? undefined : staggerItem} className="hub-tile-cell"><GlassButton icon={ShoppingBag} label="Tienda" showInfoHint onClick={() => openInfo('tienda')} /></motion.div>
          <motion.div variants={reducedMotion ? undefined : staggerItem} className="hub-tile-cell"><GlassButton icon={MessageSquare} label="Confesión" showInfoHint onClick={() => openInfo('confesion')} /></motion.div>
          <motion.div variants={reducedMotion ? undefined : staggerItem} className="hub-tile-cell"><GlassButton icon={MessagesSquare} label="Chat" sublabel="Grupo" variant="gold" showInfoHint pulse badge={chatUnread > 0 ? chatUnread : undefined} onClick={() => openInfo('chat')} /></motion.div>
          <motion.div variants={reducedMotion ? undefined : staggerItem} className="hub-tile-cell"><GlassButton icon={Calendar} label="Eventos" showInfoHint onClick={() => openInfo('eventos')} /></motion.div>
          </motion.div>
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
              <span className="text-xs font-bold text-reto-gold">{p.points} Puntos</span>
            </motion.div>
          ))}
        </GlassCard>

        <GlassCard className="p-4 mb-4">
          <div className="flex items-center gap-2 mb-3"><Swords size={16} className="text-reto-pink" /><span className="text-sm font-bold">Feed del Drama</span></div>
          <DramaFeed items={feed} />
        </GlassCard>
        </div>
      </MainTabLayout>

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
        {showCreateStory && (
          <StoryCreateModal
            onClose={() => setShowCreateStory(false)}
            onPublished={(groups, openViewer) => {
              setStoryGroups(groups);
              if (openViewer && user) setStoryViewerId(user.id);
            }}
          />
        )}
        {storyViewerId && storyGroups.some((g) => g.userId === storyViewerId && g.stories.length > 0) && (
          <StoryViewerModal
            key={storyViewerId}
            groups={storyGroups.filter((g) => g.stories.length > 0)}
            initialUserId={storyViewerId}
            onClose={() => setStoryViewerId(null)}
            onGroupsChange={setStoryGroups}
            onAddStory={() => {
              setStoryViewerId(null);
              setShowCreateStory(true);
            }}
          />
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
            <p className="text-sm text-white/60 mb-4">Anónimo · +150 Puntos</p>
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
            <p className="text-sm text-white/60 mb-4">Pacto de este ciclo (+25 Puntos)</p>
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
                <motion.p animate={{ scale: [1, 1.05, 1] }} transition={{ repeat: Infinity, duration: 2 }} className="text-4xl font-black text-glow-gold text-center my-4">+{bribeOffer.points} Puntos</motion.p>
                <p className="text-sm text-reto-red text-center mb-4">Penalización: {bribeOffer.penalty}</p>
                <button className="w-full py-4 rounded-2xl font-bold btn-primary btn-primary-gold"
                  onClick={async () => { await action('bribe', api.acceptBribe); setShowBribe(false); }}>Aceptar soborno</button>
              </>
            )}
          </Modal>
        )}
      </AnimatePresence>

      <RadioSubmitModal
        open={showRadio}
        onClose={() => setShowRadio(false)}
        currentDj={nowPlaying?.submittedBy}
        currentTitle={nowPlaying?.title}
        onSuccess={(msg) => {
          showToast(msg);
          void load();
        }}
      />
    </AppShell>
  );
}

function Modal({ children, onClose, title }: { children: React.ReactNode; onClose: () => void; title: string }) {
  useModalBackClose(true, onClose);
  return (
    <motion.div initial={overlayFade.initial} animate={overlayFade.animate} exit={overlayFade.exit} transition={overlayTransition}
      className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-4 modal-overlay" onClick={onClose}>
      <motion.div initial={slideSheet.initial} animate={slideSheet.animate} exit={slideSheet.exit} transition={slideSheetTransition} className="glass-strong glass-aurora-top w-full max-w-md rounded-3xl p-6 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-bold mb-4">{title}</h3>
        {children}
      </motion.div>
    </motion.div>
  );
}
