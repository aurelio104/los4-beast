import { useRef } from 'react';
import { Loader2 } from 'lucide-react';
import { StoryUserGroup, User } from '../types';
import { StoryBubble } from './StoryBubble';

type StoryStripProps = {
  currentUser: User;
  groups: StoryUserGroup[];
  loading?: boolean;
  onOpenCreate: () => void;
  onOpenViewer: (userId: string) => void;
};

export function StoryStrip({
  currentUser,
  groups,
  loading,
  onOpenCreate,
  onOpenViewer
}: StoryStripProps) {
  const ownGroup = groups.find((g) => g.isOwn);
  const others = groups.filter((g) => !g.isOwn);

  const handleOwnClick = () => {
    if (ownGroup?.stories.length) onOpenViewer(ownGroup.userId);
    else onOpenCreate();
  };

  return (
    <div className="story-strip mb-3">
      <div className="story-strip__scroll">
        <StoryBubble
          displayName={currentUser.displayName}
          avatarUrl={currentUser.avatarUrl}
          avatarEmoji={currentUser.avatarEmoji}
          previewUrl={ownGroup?.previewUrl ?? ownGroup?.stories.at(-1)?.mediaUrl}
          hasStory={!!ownGroup?.stories.length}
          hasUnseen={false}
          isOwn
          onClick={handleOwnClick}
        />

        {loading && !others.length && (
          <div className="story-bubble shrink-0 flex items-center justify-center w-[4.5rem] h-[4.5rem]">
            <Loader2 size={20} className="animate-spin text-white/40" />
          </div>
        )}

        {others.map((group) => (
          <StoryBubble
            key={group.userId}
            displayName={group.displayName}
            avatarUrl={group.avatarUrl}
            avatarEmoji={group.avatarEmoji}
            previewUrl={group.previewUrl ?? group.stories.at(-1)?.mediaUrl}
            hasStory={group.stories.length > 0}
            hasUnseen={group.hasUnseen}
            onClick={() => onOpenViewer(group.userId)}
          />
        ))}
      </div>
    </div>
  );
}
