import { Plus } from 'lucide-react';
import { Avatar } from './Avatar';

type StoryBubbleProps = {
  displayName: string;
  avatarUrl?: string | null;
  avatarEmoji?: string | null;
  previewUrl?: string | null;
  hasStory: boolean;
  hasUnseen: boolean;
  isOwn?: boolean;
  onClick: () => void;
};

export function StoryBubble({
  displayName,
  avatarUrl,
  avatarEmoji,
  previewUrl,
  hasStory,
  hasUnseen,
  isOwn,
  onClick
}: StoryBubbleProps) {
  const ringClass = hasStory
    ? hasUnseen || isOwn
      ? 'story-ring story-ring--active'
      : 'story-ring story-ring--seen'
    : 'story-ring story-ring--empty';

  const showStoryPreview = hasStory && !!previewUrl;

  return (
    <button type="button" onClick={onClick} className="story-bubble shrink-0 snap-start">
      <div className={`story-bubble__ring ${ringClass}`}>
        <div className="story-bubble__avatar">
          {showStoryPreview ? (
            <img
              src={previewUrl}
              alt=""
              className="story-bubble__preview"
              loading="lazy"
              decoding="async"
            />
          ) : (
            <Avatar
              url={avatarUrl}
              emoji={avatarEmoji}
              name={displayName}
              size="sm"
              expandable={false}
              className="!w-full !h-full !ring-0"
            />
          )}
        </div>
        {isOwn && (
          <span className="story-bubble__add" aria-hidden>
            <Plus size={14} strokeWidth={3} />
          </span>
        )}
      </div>
      <span className="story-bubble__label">
        {isOwn ? 'Tu historia' : displayName.split(' ')[0]}
      </span>
    </button>
  );
}
