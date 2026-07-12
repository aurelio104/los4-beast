import { prisma } from './prisma.js';
import { deleteStoryFiles, saveStoryDataUrl } from './uploads.js';
import { resolvePublicName } from './user-display.js';

const STORY_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_STORIES_PER_DAY = 10;
export const STORY_REACTION_IDS = ['heart', 'fire', 'devil'] as const;
export type StoryReactionId = (typeof STORY_REACTION_IDS)[number];

export function isStoryReactionId(value: string): value is StoryReactionId {
  return (STORY_REACTION_IDS as readonly string[]).includes(value);
}

export async function purgeExpiredStories() {
  const expired = await prisma.story.findMany({
    where: { expiresAt: { lte: new Date() } },
    select: { id: true }
  });
  if (!expired.length) return;
  for (const s of expired) deleteStoryFiles(s.id);
  await prisma.story.deleteMany({ where: { id: { in: expired.map((s) => s.id) } } });
}

export async function listStoryGroups(viewerId: string) {
  await purgeExpiredStories();

  const now = new Date();
  const stories = await prisma.story.findMany({
    where: { expiresAt: { gt: now }, user: { isActive: true } },
    orderBy: { createdAt: 'asc' },
    include: {
      user: {
        select: { id: true, displayName: true, nickname: true, username: true, avatarUrl: true, avatarEmoji: true }
      },
      views: { where: { viewerId }, select: { id: true } }
    }
  });

  const byUser = new Map<string, typeof stories>();
  for (const story of stories) {
    const list = byUser.get(story.userId) || [];
    list.push(story);
    byUser.set(story.userId, list);
  }

  const groups = [...byUser.entries()].map(([userId, userStories]) => {
    const u = userStories[0].user;
    const items = userStories.map((s) => ({
      id: s.id,
      mediaUrl: s.mediaUrl,
      caption: s.caption,
      createdAt: s.createdAt.toISOString(),
      expiresAt: s.expiresAt.toISOString(),
      viewed: s.views.length > 0 || userId === viewerId
    }));
    const hasUnseen = userId !== viewerId && items.some((i) => !i.viewed);
    const latest = items[items.length - 1];
    return {
      userId,
      displayName: resolvePublicName(u),
      avatarUrl: u.avatarUrl,
      avatarEmoji: u.avatarEmoji,
      previewUrl: latest?.mediaUrl ?? null,
      hasUnseen,
      isOwn: userId === viewerId,
      stories: items
    };
  });

  groups.sort((a, b) => {
    if (a.isOwn) return -1;
    if (b.isOwn) return 1;
    if (a.hasUnseen !== b.hasUnseen) return a.hasUnseen ? -1 : 1;
    const aLatest = a.stories[a.stories.length - 1]?.createdAt || '';
    const bLatest = b.stories[b.stories.length - 1]?.createdAt || '';
    return bLatest.localeCompare(aLatest);
  });

  return groups;
}

export async function createStory(userId: string, dataUrl: string, caption?: string) {
  const since = new Date(Date.now() - STORY_TTL_MS);
  const recentCount = await prisma.story.count({
    where: { userId, createdAt: { gte: since } }
  });
  if (recentCount >= MAX_STORIES_PER_DAY) {
    throw new Error(`Máximo ${MAX_STORIES_PER_DAY} historias por día`);
  }

  const author = await prisma.user.findUnique({
    where: { id: userId },
    select: { displayName: true, nickname: true, username: true }
  });
  if (!author) throw new Error('Usuario no encontrado');

  const cap = caption?.trim().slice(0, 200) || null;
  const expiresAt = new Date(Date.now() + STORY_TTL_MS);

  const story = await prisma.story.create({
    data: { userId, mediaUrl: '', caption: cap, expiresAt }
  });

  try {
    const mediaUrl = saveStoryDataUrl(story.id, dataUrl);
    const updated = await prisma.story.update({
      where: { id: story.id },
      data: { mediaUrl }
    });

    const authorName = resolvePublicName(author);
    void import('./push.js').then(({ notifyNewStory }) => notifyNewStory(userId, authorName));

    return updated;
  } catch (e) {
    await prisma.story.delete({ where: { id: story.id } });
    deleteStoryFiles(story.id);
    throw e;
  }
}

export async function markStoryViewed(storyId: string, viewerId: string) {
  const story = await prisma.story.findUnique({ where: { id: storyId } });
  if (!story || story.expiresAt <= new Date()) return false;
  if (story.userId === viewerId) return true;

  await prisma.storyView.upsert({
    where: { storyId_viewerId: { storyId, viewerId } },
    create: { storyId, viewerId },
    update: {}
  });
  return true;
}

export async function deleteStory(storyId: string, userId: string) {
  const story = await prisma.story.findUnique({ where: { id: storyId } });
  if (!story) throw new Error('Historia no encontrada');
  if (story.userId !== userId) throw new Error('No puedes borrar esta historia');
  deleteStoryFiles(storyId);
  await prisma.story.delete({ where: { id: storyId } });
}

export async function getStoryViewers(storyId: string, requestUserId: string) {
  const story = await prisma.story.findUnique({
    where: { id: storyId },
    include: {
      views: {
        orderBy: { viewedAt: 'desc' },
        include: {
          viewer: {
            select: {
              id: true,
              displayName: true,
              nickname: true,
              username: true,
              avatarUrl: true,
              avatarEmoji: true
            }
          }
        }
      },
      reactions: {
        include: {
          user: {
            select: {
              id: true,
              displayName: true,
              nickname: true,
              username: true,
              avatarUrl: true,
              avatarEmoji: true
            }
          }
        }
      }
    }
  });

  if (!story) throw new Error('Historia no encontrada');
  if (story.userId !== requestUserId) throw new Error('No autorizado');

  const reactionByUser = new Map(story.reactions.map((r) => [r.userId, r.emoji]));

  return story.views.map((v) => ({
    userId: v.viewer.id,
    displayName: resolvePublicName(v.viewer),
    avatarUrl: v.viewer.avatarUrl,
    avatarEmoji: v.viewer.avatarEmoji,
    viewedAt: v.viewedAt.toISOString(),
    reaction: reactionByUser.get(v.viewer.id) ?? null
  }));
}

export async function getStoryReaction(storyId: string, userId: string) {
  const reaction = await prisma.storyReaction.findUnique({
    where: { storyId_userId: { storyId, userId } }
  });
  return reaction?.emoji ?? null;
}

export async function reactToStory(storyId: string, userId: string, emoji: string) {
  if (!isStoryReactionId(emoji)) throw new Error('Reacción inválida');

  const story = await prisma.story.findUnique({ where: { id: storyId } });
  if (!story || story.expiresAt <= new Date()) throw new Error('Historia no disponible');
  if (story.userId === userId) throw new Error('No puedes reaccionar a tu historia');

  await markStoryViewed(storyId, userId);

  const [existing, reactor, owner] = await Promise.all([
    prisma.storyReaction.findUnique({ where: { storyId_userId: { storyId, userId } } }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { displayName: true, nickname: true, username: true }
    }),
    prisma.user.findUnique({
      where: { id: story.userId },
      select: { displayName: true, nickname: true, username: true }
    })
  ]);

  await prisma.storyReaction.upsert({
    where: { storyId_userId: { storyId, userId } },
    create: { storyId, userId, emoji },
    update: { emoji }
  });

  if ((!existing || existing.emoji !== emoji) && reactor && owner) {
    const reactorName = resolvePublicName(reactor);
    const ownerName = resolvePublicName(owner);
    void import('./push.js').then(({ notifyStoryReaction }) =>
      notifyStoryReaction(userId, reactorName, ownerName, emoji).catch(() => {})
    );
  }

  return emoji;
}
