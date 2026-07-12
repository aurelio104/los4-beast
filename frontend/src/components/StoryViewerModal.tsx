import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X, MoreHorizontal, Eye } from 'lucide-react';
import { StoryUserGroup, StoryViewer } from '../types';
import { Avatar } from './Avatar';
import { api } from '../lib/api';
import { STORY_REACTIONS, storyReactionGlyph } from '../lib/storyReactions';

const STORY_DURATION_MS = 5000;
const HOLD_PAUSE_MS = 180;

function igTimeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${Math.max(1, m)}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

function viewerTimeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) {
    const m = Math.max(1, Math.floor(diff / 60000));
    return `${m}m`;
  }
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

type StoryViewerModalProps = {
  groups: StoryUserGroup[];
  initialUserId: string;
  onClose: () => void;
  onGroupsChange: (groups: StoryUserGroup[]) => void;
  onAddStory?: () => void;
};

export function StoryViewerModal({
  groups,
  initialUserId,
  onClose,
  onGroupsChange,
  onAddStory
}: StoryViewerModalProps) {
  const [userIndex, setUserIndex] = useState(() =>
    Math.max(0, groups.findIndex((g) => g.userId === initialUserId))
  );
  const [storyIndex, setStoryIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [deleting, setDeleting] = useState(false);
  const [showViewers, setShowViewers] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [viewers, setViewers] = useState<StoryViewer[]>([]);
  const [viewersLoading, setViewersLoading] = useState(false);
  const [myReaction, setMyReaction] = useState<string | null>(null);
  const [reacting, setReacting] = useState(false);
  const [held, setHeld] = useState(false);
  const [floatEmoji, setFloatEmoji] = useState<string | null>(null);
  const [sentToast, setSentToast] = useState<string | null>(null);
  const sentToastTimer = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);
  const holdRef = useRef<number | null>(null);
  const viewedRef = useRef<Set<string>>(new Set());
  const touchStartY = useRef<number | null>(null);

  const group = groups[userIndex];
  const story = group?.stories[storyIndex];
  const paused = showViewers || deleting || reacting || held || menuOpen;
  const firstName = group?.displayName.split(' ')[0] ?? group?.displayName ?? '';

  const clearTimer = () => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const clearHold = () => {
    if (holdRef.current) {
      window.clearTimeout(holdRef.current);
      holdRef.current = null;
    }
    setHeld(false);
  };

  const loadViewers = useCallback(async (storyId: string) => {
    setViewersLoading(true);
    const res = await api.storyViewers(storyId);
    if (res.success) setViewers(res.viewers || []);
    else setViewers([]);
    setViewersLoading(false);
  }, []);

  const markViewed = useCallback(async (storyId: string) => {
    if (viewedRef.current.has(storyId)) return;
    viewedRef.current.add(storyId);
    await api.viewStory(storyId);
    onGroupsChange(
      groups.map((g) => ({
        ...g,
        stories: g.stories.map((s) => (s.id === storyId ? { ...s, viewed: true } : s)),
        hasUnseen: g.isOwn ? false : g.stories.some((s) => (s.id === storyId ? false : !s.viewed))
      }))
    );
  }, [groups, onGroupsChange]);

  const goNext = useCallback(() => {
    if (!group) return;
    setShowViewers(false);
    setMenuOpen(false);
    if (storyIndex < group.stories.length - 1) {
      setStoryIndex((i) => i + 1);
      setProgress(0);
      return;
    }
    if (userIndex < groups.length - 1) {
      setUserIndex((i) => i + 1);
      setStoryIndex(0);
      setProgress(0);
      return;
    }
    onClose();
  }, [group, storyIndex, userIndex, groups.length, onClose]);

  const goPrev = useCallback(() => {
    setShowViewers(false);
    setMenuOpen(false);
    if (storyIndex > 0) {
      setStoryIndex((i) => i - 1);
      setProgress(0);
      return;
    }
    if (userIndex > 0) {
      const prev = groups[userIndex - 1];
      setUserIndex((i) => i - 1);
      setStoryIndex(Math.max(0, prev.stories.length - 1));
      setProgress(0);
    }
  }, [storyIndex, userIndex, groups]);

  useEffect(() => {
    if (!story || paused) return;
    if (!group.isOwn) markViewed(story.id);
    setProgress(0);
    clearTimer();
    const started = Date.now();
    timerRef.current = window.setInterval(() => {
      const elapsed = Date.now() - started;
      const pct = Math.min(100, (elapsed / STORY_DURATION_MS) * 100);
      setProgress(pct);
      if (elapsed >= STORY_DURATION_MS) goNext();
    }, 50);
    return clearTimer;
  }, [story?.id, group?.isOwn, markViewed, goNext, paused]);

  useEffect(() => {
    setUserIndex(Math.max(0, groups.findIndex((g) => g.userId === initialUserId)));
    setStoryIndex(0);
    setProgress(0);
    setShowViewers(false);
    setMenuOpen(false);
  }, [initialUserId, groups]);

  useEffect(() => {
    setShowViewers(false);
    setMenuOpen(false);
    if (group?.isOwn && story?.id) {
      void loadViewers(story.id);
      const id = window.setInterval(() => void loadViewers(story.id), 5000);
      return () => window.clearInterval(id);
    }
    setViewers([]);
  }, [story?.id, group?.isOwn, loadViewers]);

  useEffect(() => {
    if (!story?.id || group?.isOwn) {
      setMyReaction(null);
      return;
    }
    void api.storyReaction(story.id).then((res) => {
      if (res.success) setMyReaction(res.reaction);
    });
  }, [story?.id, group?.isOwn]);

  useEffect(() => {
    document.body.classList.add('story-viewer-open');
    return () => {
      document.body.classList.remove('story-viewer-open');
      if (sentToastTimer.current) window.clearTimeout(sentToastTimer.current);
    };
  }, []);

  if (!group || !story) return null;

  const handleDelete = async () => {
    if (!group.isOwn || deleting) return;
    setMenuOpen(false);
    setDeleting(true);
    clearTimer();
    const res = await api.deleteStory(story.id);
    setDeleting(false);
    if (res.success && res.users) {
      onGroupsChange(res.users);
      const own = res.users.find((g) => g.userId === group.userId);
      if (!own?.stories.length) {
        onClose();
        return;
      }
      setStoryIndex(Math.min(storyIndex, own.stories.length - 1));
      setProgress(0);
    }
  };

  const openViewers = () => {
    if (!group.isOwn) return;
    setShowViewers(true);
    void loadViewers(story.id);
  };

  const showFloatReaction = (glyph: string) => {
    setFloatEmoji(glyph);
    window.setTimeout(() => setFloatEmoji(null), 900);
  };

  const showSentToast = (glyph: string) => {
    const msg = `${glyph} Enviado a ${firstName}`;
    setSentToast(msg);
    if (sentToastTimer.current) window.clearTimeout(sentToastTimer.current);
    sentToastTimer.current = window.setTimeout(() => setSentToast(null), 2200);
  };

  const handleReact = async (emoji: string) => {
    if (group.isOwn || reacting) return;
    const glyph = STORY_REACTIONS.find((r) => r.id === emoji)?.glyph;
    setReacting(true);
    clearTimer();
    const res = await api.reactStory(story.id, emoji);
    if (res.success && res.reaction) {
      setMyReaction(res.reaction);
      if (glyph) {
        showFloatReaction(glyph);
        showSentToast(glyph);
      }
      if (!viewedRef.current.has(story.id)) {
        viewedRef.current.add(story.id);
        onGroupsChange(
          groups.map((g) => ({
            ...g,
            stories: g.stories.map((s) => (s.id === story.id ? { ...s, viewed: true } : s)),
            hasUnseen: g.isOwn ? false : g.stories.some((s) => (s.id === story.id ? false : !s.viewed))
          }))
        );
      }
    }
    window.setTimeout(() => setReacting(false), 350);
  };

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0]?.clientY ?? null;
    clearHold();
    holdRef.current = window.setTimeout(() => setHeld(true), HOLD_PAUSE_MS);
  };

  const onTouchMove = () => {
    clearHold();
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    clearHold();
    if (touchStartY.current == null) return;
    const endY = e.changedTouches[0]?.clientY ?? touchStartY.current;
    const dy = endY - touchStartY.current;
    if (dy > 72) onClose();
    else if (dy < -56 && group.isOwn) openViewers();
    touchStartY.current = null;
  };

  const onPointerDown = () => {
    clearHold();
    holdRef.current = window.setTimeout(() => setHeld(true), HOLD_PAUSE_MS);
  };

  const onPointerUp = () => clearHold();

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="story-viewer"
      role="dialog"
      aria-modal="true"
    >
      <div className="story-viewer__veil" aria-hidden />
      <div
        className="story-viewer__stage absolute inset-0"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <AnimatePresence mode="wait">
          <motion.img
            key={story.id}
            src={story.mediaUrl}
            alt=""
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="story-viewer__img absolute inset-0 select-none"
            draggable={false}
          />
        </AnimatePresence>
      </div>

      {!showViewers && !menuOpen && (
        <>
          <button type="button" className="story-viewer__tap story-viewer__tap--left" onClick={goPrev} aria-label="Anterior" />
          <button type="button" className="story-viewer__tap story-viewer__tap--right" onClick={goNext} aria-label="Siguiente" />
        </>
      )}

      <AnimatePresence>
        {floatEmoji && (
          <motion.span
            key={floatEmoji}
            initial={{ opacity: 0, scale: 0.4, y: 0 }}
            animate={{ opacity: 1, scale: 1.2, y: -120 }}
            exit={{ opacity: 0, scale: 0.8, y: -180 }}
            transition={{ duration: 0.85, ease: 'easeOut' }}
            className="story-viewer__float-emoji pointer-events-none"
            aria-hidden
          >
            {floatEmoji}
          </motion.span>
        )}
      </AnimatePresence>

      <div className="story-viewer__chrome absolute inset-0 flex flex-col pointer-events-none">
        <div className="story-viewer__top pointer-events-auto shrink-0">
          <div className="story-viewer__progress px-2 flex gap-[3px]">
            {group.stories.map((s, i) => (
              <div key={s.id} className="story-viewer__progress-track flex-1">
                <div
                  className="story-viewer__progress-fill"
                  style={{
                    width: i < storyIndex ? '100%' : i === storyIndex ? `${progress}%` : '0%'
                  }}
                />
              </div>
            ))}
          </div>

          <div className="story-viewer__header px-3 pb-2 flex items-center gap-2">
            <Avatar
              url={group.avatarUrl}
              emoji={group.avatarEmoji}
              name={group.displayName}
              size="xs"
              expandable={false}
              className="!w-8 !h-8 !ring-[1.5px] !ring-white/30"
            />
            <div className="story-viewer__user flex-1 min-w-0 flex items-center gap-1">
              <span className="text-[13px] font-semibold truncate">{group.displayName}</span>
              <span className="text-[13px] text-white/55 shrink-0">·</span>
              <span className="text-[13px] text-white/55 shrink-0">{igTimeAgo(story.createdAt)}</span>
            </div>

            <div className="story-viewer__actions flex items-center shrink-0">
              {group.isOwn && (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setMenuOpen((o) => !o)}
                    className="story-viewer__icon-btn"
                    aria-label="Opciones"
                    aria-expanded={menuOpen}
                  >
                    <MoreHorizontal size={24} strokeWidth={1.75} />
                  </button>
                  <AnimatePresence>
                    {menuOpen && (
                      <>
                        <button
                          type="button"
                          className="fixed inset-0 z-[88] cursor-default"
                          onClick={() => setMenuOpen(false)}
                          aria-label="Cerrar menú"
                        />
                        <motion.div
                          initial={{ opacity: 0, scale: 0.92, y: -4 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.92, y: -4 }}
                          transition={{ duration: 0.12 }}
                          className="story-viewer__menu absolute right-0 top-full mt-1 z-[89]"
                        >
                          {onAddStory && (
                            <button type="button" onClick={() => { setMenuOpen(false); onAddStory(); }}>
                              Añadir a tu historia
                            </button>
                          )}
                          <button type="button" onClick={() => void handleDelete()} disabled={deleting} className="story-viewer__menu-danger">
                            Eliminar
                          </button>
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>
              )}
              <button type="button" onClick={onClose} className="story-viewer__icon-btn" aria-label="Cerrar">
                <X size={26} strokeWidth={1.75} />
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 min-h-0" aria-hidden />
      </div>

      {!showViewers && story.caption && (
        <p className="story-viewer__caption story-viewer__caption--float px-3 text-[15px] text-white leading-snug pointer-events-none">
          {story.caption}
        </p>
      )}

      {!showViewers && (
        <div className="story-viewer__dock px-3">
          <div className="story-viewer__dock-bar">
            {group.isOwn ? (
              <button type="button" onClick={openViewers} className="story-viewer__views-pill">
                <Eye size={15} strokeWidth={2} />
                <span>{viewersLoading && !viewers.length ? '…' : viewers.length}</span>
              </button>
            ) : (
              <div className="story-viewer__send-input" aria-hidden>
                Enviar mensaje a {firstName}…
              </div>
            )}

            <div
              className="story-viewer__reactions-row"
              role={group.isOwn ? undefined : 'group'}
              aria-label={group.isOwn ? 'Reacciones en tu historia' : 'Reacciones'}
            >
              {STORY_REACTIONS.map((r) => {
                const count = group.isOwn ? viewers.filter((v) => v.reaction === r.id).length : 0;
                if (group.isOwn) {
                  return (
                    <div
                      key={r.id}
                      className={`story-viewer__showcase-emoji ${count > 0 ? 'story-viewer__showcase-emoji--has' : ''}`}
                    >
                      <span className="story-viewer__emoji-glyph">{r.glyph}</span>
                      {count > 0 && <span className="story-viewer__showcase-count">{count}</span>}
                    </div>
                  );
                }
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => void handleReact(r.id)}
                    disabled={reacting}
                    aria-label={r.label}
                    aria-pressed={myReaction === r.id}
                    className={`story-viewer__quick-emoji ${myReaction === r.id ? 'story-viewer__quick-emoji--active' : ''}`}
                  >
                    <span className="story-viewer__emoji-glyph" aria-hidden>
                      {r.glyph}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <AnimatePresence>
        {sentToast && (
          <motion.p
            initial={{ opacity: 0, y: 12, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.2 }}
            className="story-viewer__sent-toast"
            role="status"
          >
            {sentToast}
          </motion.p>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {group.isOwn && showViewers && (
          <>
            <motion.button
              type="button"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[86] bg-black/40"
              onClick={() => setShowViewers(false)}
              aria-label="Cerrar vistas"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 380, damping: 36 }}
              className="story-viewers-sheet fixed inset-x-0 bottom-0 z-[87] flex flex-col"
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.35 }}
              onDragEnd={(_, info) => {
                if (info.offset.y > 80 || info.velocity.y > 400) setShowViewers(false);
              }}
            >
              <div className="story-viewers-sheet__handle" aria-hidden />
              <p className="story-viewers-sheet__title">
                Vistas · {viewersLoading ? '…' : viewers.length}
              </p>

              <div className="story-viewers-sheet__list flex-1 overflow-y-auto overscroll-contain">
                {viewersLoading && !viewers.length ? (
                  <p className="story-viewers-sheet__empty">Cargando…</p>
                ) : viewers.length === 0 ? (
                  <p className="story-viewers-sheet__empty">Nadie ha visto esta historia todavía</p>
                ) : (
                  <ul>
                    {viewers.map((v) => (
                      <li key={v.userId} className="story-viewers-sheet__row">
                        <Avatar url={v.avatarUrl} emoji={v.avatarEmoji} name={v.displayName} size="sm" expandable={false} className="!w-9 !h-9" />
                        <span className="story-viewers-sheet__name">{v.displayName}</span>
                        {v.reaction ? (
                          <span className="story-viewer-reaction shrink-0" title="Reacción">
                            {storyReactionGlyph(v.reaction)}
                          </span>
                        ) : null}
                        <span className="story-viewers-sheet__time">{viewerTimeAgo(v.viewedAt)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>,
    document.body
  );
}
