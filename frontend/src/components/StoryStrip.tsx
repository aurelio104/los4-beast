import { Loader2 } from 'lucide-react';
import { Player, StoryUserGroup, User } from '../types';
import { StoryBubble } from './StoryBubble';

type StoryStripProps = {
  currentUser: User;
  groups: StoryUserGroup[];
  /** Jugadores del hub: aparecen con anillo vacío aunque aún no publiquen */
  players?: Player[];
  loading?: boolean;
  onOpenCreate: () => void;
  onOpenViewer: (userId: string) => void;
  /** Abre ficha de perfil (foto → perfil) */
  onOpenProfile?: (userId: string) => void;
};

function mergeOthers(
  currentUserId: string,
  groups: StoryUserGroup[],
  players: Player[]
): StoryUserGroup[] {
  const byId = new Map(players.map((p) => [p.id, p]));
  const withStories = groups
    .filter((g) => !g.isOwn)
    .map((g) => {
      const p = byId.get(g.userId);
      if (!p) return g;
      return {
        ...g,
        displayName: g.displayName || p.nickname || p.displayName,
        avatarUrl: g.avatarUrl || p.avatarUrl,
        avatarEmoji: g.avatarEmoji || p.avatarEmoji
      };
    });
  const seen = new Set(withStories.map((g) => g.userId));
  const empty: StoryUserGroup[] = [];

  for (const p of players) {
    if (p.id === currentUserId || seen.has(p.id)) continue;
    empty.push({
      userId: p.id,
      displayName: p.nickname || p.displayName,
      avatarUrl: p.avatarUrl,
      avatarEmoji: p.avatarEmoji,
      previewUrl: null,
      hasUnseen: false,
      isOwn: false,
      stories: []
    });
  }

  return [...withStories, ...empty];
}

export function StoryStrip({
  currentUser,
  groups,
  players = [],
  loading,
  onOpenCreate,
  onOpenViewer,
  onOpenProfile
}: StoryStripProps) {
  const ownGroup = groups.find((g) => g.isOwn);
  const others = mergeOthers(currentUser.id, groups, players);

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
            hasStory={group.stories.length > 0}
            hasUnseen={group.hasUnseen}
            onClick={() => {
              if (onOpenProfile) onOpenProfile(group.userId);
              else if (group.stories.length > 0) onOpenViewer(group.userId);
            }}
          />
        ))}
      </div>
    </div>
  );
}
