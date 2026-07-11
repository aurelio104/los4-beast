import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Trash2 } from 'lucide-react';
import { StoryUserGroup } from '../types';
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
  const timerRef = useRef<number | null>(null);
  const viewedRef = useRef<Set<string>>(new Set());

  const group = groups[userIndex];
  const story = group?.stories[storyIndex];

  const clearTimer = () => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

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
    if (!story) return;
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
  }, [story?.id, group?.isOwn, markViewed, goNext]);

  useEffect(() => {
    setUserIndex(Math.max(0, groups.findIndex((g) => g.userId === initialUserId)));
    setStoryIndex(0);
    setProgress(0);
  }, [initialUserId]);

  if (!group || !story) return null;

  const handleDelete = async () => {
    if (!group.isOwn || deleting) return;
    setDeleting(true);
    clearTimer();
    const res = await api.deleteStory(story.id);
    setDeleting(false);
    if (res.success && res.users) {
      onGroupsChange(res.users);
      const nextGroups = res.users;
      const own = nextGroups.find((g) => g.userId === group.userId);
      if (!own?.stories.length) {
        onClose();
        return;
      }
      const newIdx = Math.min(storyIndex, own.stories.length - 1);
      setStoryIndex(newIdx);
      setProgress(0);
    }
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
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="p-2 text-white/50"
            aria-label="Eliminar historia"
          >
            <Trash2 size={18} />
          </button>
        )}
        <button type="button" onClick={onClose} className="p-2 text-white/70" aria-label="Cerrar">
          <X size={22} />
        </button>
      </div>

      <div className="story-viewer__media flex-1 relative min-h-0">
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

        <button type="button" className="story-viewer__tap story-viewer__tap--left" onClick={goPrev} aria-label="Anterior" />
        <button type="button" className="story-viewer__tap story-viewer__tap--right" onClick={goNext} aria-label="Siguiente" />
      </div>

      {story.caption && (
        <div className="px-4 py-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <p className="text-sm text-white/90 text-center">{story.caption}</p>
        </div>
      )}
    </motion.div>
  );
}
