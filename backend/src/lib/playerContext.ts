import { prisma } from './prisma.js';
import { getEventCycle, getBribeOffer } from './events.js';

export const EVENT_GAME_MAP: Record<string, string> = {
  RED_LIGHT: 'redlight',
  HONEYCOMB: 'honeycomb',
  DDAKJI: 'ddakji',
  DDAKJI_L1: 'ddakji',
  DDAKJI_L2: 'ddakji',
  DDAKJI_L3: 'ddakji',
  GLASS_BRIDGE: 'glass'
};

export async function computeStreak(userId: string): Promise<number> {
  const actions = await prisma.gameAction.findMany({
    where: { userId, type: 'CONTINUE' },
    orderBy: { createdAt: 'desc' },
    take: 90,
    select: { createdAt: true }
  });
  if (!actions.length) return 0;

  const daySet = new Set(
    actions.map((a) => {
      const d = new Date(a.createdAt);
      d.setHours(0, 0, 0, 0);
      return d.getTime();
    })
  );

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let cursor = today.getTime();
  if (!daySet.has(cursor)) cursor -= 86400000;

  let streak = 0;
  while (daySet.has(cursor)) {
    streak++;
    cursor -= 86400000;
  }
  return streak;
}

export async function getPlayerContext(userId: string) {
  const cycle = getEventCycle();
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [streak, alliance, vote, chestClaim, bribe, continueToday] = await Promise.all([
    computeStreak(userId),
    prisma.alliance.findUnique({
      where: { userId_cycleIndex: { userId, cycleIndex: cycle.cycleIndex } },
      include: { partner: { select: { id: true, displayName: true, nickname: true, avatarEmoji: true, avatarUrl: true } } }
    }),
    prisma.vote.findUnique({
      where: { voterId_cycleIndex_voteType: { voterId: userId, cycleIndex: cycle.cycleIndex, voteType: 'ELIMINATE' } }
    }),
    prisma.chestClaim.findUnique({
      where: { userId_cycleIndex: { userId, cycleIndex: cycle.cycleIndex } }
    }),
    Promise.resolve(getBribeOffer(cycle.cycleIndex)),
    Promise.resolve(!!(user.lastContinuedAt && user.lastContinuedAt >= today))
  ]);

  const canClaimChest = cycle.cycleIndex > 0 && !chestClaim;
  const featuredGame = cycle.event.game ? EVENT_GAME_MAP[cycle.event.game] ?? null : null;

  const actionCounts = await prisma.gameAction.groupBy({
    by: ['type'],
    where: { userId },
    _count: { type: true }
  });
  const counts = Object.fromEntries(actionCounts.map((a) => [a.type, a._count.type]));

  const achievements = buildAchievements(user.points, streak, counts);

  const teamRaw = await prisma.user.groupBy({
    by: ['gender'],
    where: { role: 'PLAYER', isActive: true },
    _sum: { points: true },
    _count: { id: true }
  });
  const teamStats = teamRaw.map((t) => ({
    gender: t.gender,
    totalPoints: t._sum.points ?? 0,
    players: t._count.id
  }));

  return {
    streak,
    continuedToday: continueToday,
    alliance: alliance
      ? {
          partnerId: alliance.partnerId,
          name: alliance.partner.nickname || alliance.partner.displayName,
          emoji: alliance.partner.avatarEmoji,
          avatarUrl: alliance.partner.avatarUrl
        }
      : null,
    hasVoted: !!vote,
    canClaimChest,
    bribeAccepted: user.bribeAcceptedCycle === cycle.cycleIndex,
    bribeOffer: bribe,
    featuredGame,
    achievements,
    gender: user.gender,
    teamStats
  };
}

function buildAchievements(points: number, streak: number, counts: Record<string, number>) {
  const list: { id: string; emoji: string; title: string; unlocked: boolean }[] = [
    { id: 'first_continue', emoji: '✅', title: 'Primer check-in', unlocked: (counts.CONTINUE ?? 0) >= 1 },
    { id: 'streak_3', emoji: '🔥', title: 'Racha 3 días', unlocked: streak >= 3 },
    { id: 'streak_7', emoji: '💥', title: 'Racha 7 días', unlocked: streak >= 7 },
    { id: 'betrayer', emoji: '💀', title: 'Primera traición', unlocked: (counts.BETRAY ?? 0) >= 1 },
    { id: 'arena', emoji: '🎮', title: 'Guerrero Arena', unlocked: ['RED_LIGHT', 'TRIVIA', 'DDAKJI', 'DDAKJI_L1', 'DDAKJI_L2', 'DDAKJI_L3', 'GLASS_BRIDGE', 'HONEYCOMB', 'MYSTERY_BOX', 'COIN_FLIP', 'TUG_WAR'].some((t) => (counts[t] ?? 0) > 0) },
    { id: 'bp_500', emoji: '⭐', title: '500 Puntos', unlocked: points >= 500 },
    { id: 'bp_1000', emoji: '👑', title: '1000 Puntos', unlocked: points >= 1000 },
    { id: 'confession', emoji: '🤐', title: 'Confesor', unlocked: (counts.CONFESSION ?? 0) >= 1 }
  ];
  return list;
}

export async function getTriviaQuestions() {
  const players = await prisma.user.findMany({
    where: { role: 'PLAYER', isActive: true },
    select: { displayName: true, nickname: true },
    take: 8
  });

  const base = [
    { q: '¿Mejor comida para el reto final?', options: ['Burger 🍔', 'Pizza 🍕', 'Arepas'], correct: 0 },
    { q: '¿Traicionarías por 150 Puntos?', options: ['Obvio 👀', 'Nunca', 'Depende'], correct: 0 },
    { q: '¿Reto ideal en grupo?', options: ['Comida', 'Verdad o reto', 'Deporte'], correct: 0 },
    { q: '¿Quién gana el 29 de agosto?', options: ['El más dedicado 🔥', 'El más listo', 'El de suerte'], correct: 0 }
  ];

  const dynamic = players.map((p) => ({
    q: `¿${p.nickname || p.displayName} es confiable en una alianza?`,
    options: ['100% 🤝', 'Jamás 💀', 'Solo por Puntos'],
    correct: Math.floor(Math.random() * 3)
  }));

  const pool = [...base, ...dynamic];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, 4);
}
