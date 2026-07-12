import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Trash2, ChevronUp } from 'lucide-react';
import { StoryUserGroup, StoryViewer } from '../types';
import { Avatar } from './Avatar';
import { api } from '../lib/api';

const STORY_DURATION_MS = 5000;

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) {
    const m = Math.max(1, Math.floor(diff / 60000));
    return `hace ${m} min`;
  }
  if (h < 24) return `hace ${h} h`;
  return 'hace 1 día';
}

function viewersSummary(viewers: StoryViewer[]) {
  if (!viewers.length) return null;
  const first = viewers[0].displayName.split(' ')[0];
  if (viewers.length === 1) return first;
  const second = viewers[1].displayName.split(' ')[0];
  if (viewers.length === 2) return `${first} y ${second}`;
  return `${first}, ${second} y ${viewers.length - 2} más`;
}

function ViewerAvatarStack({ viewers }: { viewers: StoryViewer[] }) {
  const shown = viewers.slice(0, 3);
  if (!shown.length) return null;

  return (
    <div className="story-viewer-stack" aria-hidden>
      {shown.map((v, i) => (
        <span key={v.userId} className="story-viewer-stack__item" style={{ zIndex: shown.length - i }}>
          <Avatar url={v.avatarUrl} emoji={v.avatarEmoji} name={v.displayName} size="xs" expandable={false} className="!w-7 !h-7 !ring-2 !ring-black" />
        </span>
      ))}
    </div>
  );
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
  const [viewers, setViewers] = useState<StoryViewer[]>([]);
  const [viewersLoading, setViewersLoading] = useState(false);
  const timerRef = useRef<number | null>(null);
  const viewedRef = useRef<Set<string>>(new Set());
  const touchStartY = useRef<number | null>(null);

  const group = groups[userIndex];
  const story = group?.stories[storyIndex];
  const paused = showViewers || deleting;
  const summary = viewersSummary(viewers);

  const clearTimer = () => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
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
  }, [initialUserId, groups]);

  useEffect(() => {
    setShowViewers(false);
    if (group?.isOwn && story?.id) {
      void loadViewers(story.id);
      const id = window.setInterval(() => void loadViewers(story.id), 5000);
      return () => window.clearInterval(id);
    }
    setViewers([]);
  }, [story?.id, group?.isOwn, loadViewers]);

  if (!group || !story) return null;

  const handleDelete = async () => {
    if (!group.isOwn || deleting) return;
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

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0]?.clientY ?? null;
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (!group.isOwn || touchStartY.current == null) return;
    const endY = e.changedTouches[0]?.clientY ?? touchStartY.current;
    if (touchStartY.current - endY > 48) openViewers();
    touchStartY.current = null;
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="story-viewer fixed inset-0 z-[85] bg-black flex flex-col"
      role="dialog"
      aria-modal="true"
    >
      <div className="story-viewer__progress px-3 pt-[max(0.5rem,env(safe-area-inset-top))] flex gap-1">
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

      <div className="story-viewer__header px-4 py-2 flex items-center gap-3">
        <Avatar url={group.avatarUrl} emoji={group.avatarEmoji} name={group.displayName} size="xs" expandable={false} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold truncate">{group.displayName}</p>
          <p className="text-[11px] text-white/50">{timeAgo(story.createdAt)}</p>
        </div>
        {group.isOwn && onAddStory && (
          <button type="button" onClick={onAddStory} className="text-xs font-semibold text-reto-cyan px-2 py-1">
            + Añadir
          </button>
        )}
        {group.isOwn && (
          <button type="button" onClick={handleDelete} disabled={deleting} className="p-2 text-white/50" aria-label="Eliminar">
            <Trash2 size={18} />
          </button>
        )}
        <button type="button" onClick={onClose} className="p-2 text-white/70" aria-label="Cerrar">
          <X size={22} />
        </button>
      </div>

      <div
        className="story-viewer__media flex-1 relative min-h-0"
        onTouchStart={group.isOwn ? onTouchStart : undefined}
        onTouchEnd={group.isOwn ? onTouchEnd : undefined}
      >
        <AnimatePresence mode="wait">
          <motion.img
            key={story.id}
            src={story.mediaUrl}
            alt=""
            initial={{ opacity: 0, scale: 1.02 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 w-full h-full object-contain bg-black select-none"
            draggable={false}
          />
        </AnimatePresence>

        {!showViewers && (
          <>
            <button type="button" className="story-viewer__tap story-viewer__tap--left" onClick={goPrev} aria-label="Anterior" />
            <button type="button" className="story-viewer__tap story-viewer__tap--right" onClick={goNext} aria-label="Siguiente" />
          </>
        )}
      </div>

      {story.caption && !showViewers && (
        <div className="px-4 py-2">
          <p className="text-sm text-white/90 text-center">{story.caption}</p>
        </div>
      )}

      {group.isOwn && !showViewers && (
        <button
          type="button"
          onClick={openViewers}
          className="story-viewers-bar mx-3 mb-[max(0.5rem,env(safe-area-inset-bottom))] flex items-center gap-3 px-4 py-3 rounded-2xl glass-strong text-left w-[calc(100%-1.5rem)]"
        >
          <ViewerAvatarStack viewers={viewers} />
          <div className="flex-1 min-w-0">
            <p className="text-[11px] uppercase tracking-wider text-white/45 font-semibold">Visto por</p>
            <p className="text-sm font-bold truncate text-white/95">
              {viewersLoading && !viewers.length
                ? 'Cargando…'
                : summary || 'Nadie aún — desliza arriba para ver'}
            </p>
          </div>
          <ChevronUp size={18} className="text-white/40 shrink-0" />
        </button>
      )}

      <AnimatePresence>
        {group.isOwn && showViewers && (
          <>
            <motion.button
              type="button"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[86] bg-black/55"
              onClick={() => setShowViewers(false)}
              aria-label="Cerrar vistas"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 340, damping: 32 }}
              className="story-viewers-sheet fixed inset-x-0 bottom-0 z-[87] rounded-t-3xl bg-[#12121a] border-t border-white/10 max-h-[min(70dvh,32rem)] flex flex-col pb-[max(0.75rem,env(safe-area-inset-bottom))]"
            >
              <div className="shrink-0 pt-3 pb-2 px-4 border-b border-white/8">
                <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mb-3" />
                <p className="text-center text-sm font-black uppercase tracking-[0.2em] text-white/70">
                  Visto por · {viewersLoading ? '…' : viewers.length}
                </p>
              </div>

              <div className="flex-1 overflow-y-auto overscroll-contain">
                {viewersLoading && !viewers.length ? (
                  <p className="text-center text-sm text-white/45 py-10">Cargando…</p>
                ) : viewers.length === 0 ? (
                  <p className="text-center text-sm text-white/45 py-10">Nadie ha visto esta historia todavía</p>
                ) : (
                  <ul>
                    {viewers.map((v) => (
                      <li key={v.userId} className="flex items-center gap-3 px-4 py-3.5 border-b border-white/5 last:border-0">
                        <Avatar url={v.avatarUrl} emoji={v.avatarEmoji} name={v.displayName} size="sm" expandable={false} />
                        <div className="flex-1 min-w-0">
                          <p className="text-[15px] font-bold truncate">{v.displayName}</p>
                        </div>
                        <span className="text-xs text-white/40 shrink-0">{timeAgo(v.viewedAt)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
