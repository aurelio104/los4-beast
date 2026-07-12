import { prisma } from './prisma.js';
import { getBribeOffer, getEventCycle } from './events.js';
import { getPlayerContext } from './playerContext.js';
import { listStoryGroups } from './stories.js';
import { resolvePublicName } from './user-display.js';

function hubUser(user: {
  id: string;
  username: string;
  email: string;
  role: string;
  displayName: string;
  nickname: string | null;
  gender: string;
  points: number;
  passkeyRegistered: boolean;
  avatarEmoji: string;
  avatarUrl: string | null;
  bio: string | null;
  bgMode: string;
  bgUrl: string | null;
  phone: string | null;
  whatsappOptIn: boolean;
  pushOptIn: boolean;
}) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    displayName: user.displayName,
    nickname: user.nickname,
    gender: user.gender,
    points: user.points,
    avatarEmoji: user.avatarEmoji,
    avatarUrl: user.avatarUrl,
    bio: user.bio,
    bgMode: user.bgMode || 'beach',
    bgUrl: user.bgUrl,
    phone: user.phone,
    whatsappOptIn: user.whatsappOptIn,
    pushOptIn: user.pushOptIn,
    hasPasskey: user.passkeyRegistered
  };
}

export async function buildHubSnapshot(uid: string) {
  const cycle = getEventCycle();

  const [user, actions, players, playerCtx, votes, stories] = await Promise.all([
    prisma.user.findUnique({ where: { id: uid } }),
    prisma.gameAction.findMany({
      take: 40,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { displayName: true, nickname: true, username: true, avatarEmoji: true, avatarUrl: true } }
      }
    }),
    prisma.user.findMany({
      where: { role: 'PLAYER', isActive: true },
      select: {
        id: true,
        username: true,
        displayName: true,
        nickname: true,
        gender: true,
        points: true,
        avatarEmoji: true,
        avatarUrl: true,
        bio: true,
        passkeyRegistered: true
      },
      orderBy: { points: 'desc' }
    }),
    getPlayerContext(uid),
    prisma.vote.findMany({
      where: { cycleIndex: cycle.cycleIndex },
      include: { target: { select: { displayName: true, nickname: true, username: true } } }
    }),
    listStoryGroups(uid)
  ]);

  if (!user) throw new Error('No encontrado');

  const tally: Record<string, { count: number; name: string }> = {};
  for (const v of votes) {
    if (!tally[v.targetId]) tally[v.targetId] = { count: 0, name: resolvePublicName(v.target) };
    tally[v.targetId].count++;
  }

  const offer = getBribeOffer(cycle.cycleIndex);

  return {
    user: hubUser(user),
    feed: actions.map((a) => ({
      id: a.id,
      type: a.type,
      pointsDelta: a.pointsDelta,
      isAnonymous: a.isAnonymous,
      displayName: a.isAnonymous ? 'Alguien 👀' : resolvePublicName(a.user),
      avatarEmoji: a.isAnonymous ? '👀' : a.user.avatarEmoji,
      avatarUrl: a.isAnonymous ? null : a.user.avatarUrl,
      metadata: a.metadata,
      createdAt: a.createdAt
    })),
    players: players.map((p) => ({ ...p, displayName: resolvePublicName(p) })),
    ...cycle,
    player: playerCtx,
    tally: Object.entries(tally).map(([targetId, t]) => ({ targetId, ...t })),
    bribe: { offer, alreadyAccepted: user.bribeAcceptedCycle === cycle.cycleIndex },
    stories
  };
}
