import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { authMiddleware } from '../middleware/auth.js';
import { CHEST_CLUES, EVENTS, getBribeOffer, getEventCycle } from '../lib/events.js';
import { awardPoints, playedMiniGameToday } from '../lib/points.js';
import { getPlayerContext, getTriviaQuestions } from '../lib/playerContext.js';

export const gameRouter = Router();

function userId(req: Request) {
  return (req as Request & { user: { userId: string } }).user.userId;
}

gameRouter.get('/status', authMiddleware, async (req, res) => {
  const uid = userId(req);
  const cycle = getEventCycle();
  const player = await getPlayerContext(uid);
  res.json({ success: true, ...cycle, player });
});

gameRouter.get('/trivia/questions', authMiddleware, async (_req, res) => {
  const questions = await getTriviaQuestions();
  res.json({ success: true, questions });
});

gameRouter.get('/events', authMiddleware, async (_req, res) => {
  const cycle = getEventCycle();
  res.json({ success: true, events: EVENTS, current: cycle });
});

gameRouter.get('/feed', authMiddleware, async (_req, res) => {
  const actions = await prisma.gameAction.findMany({
    take: 40,
    orderBy: { createdAt: 'desc' },
    include: { user: { select: { displayName: true, nickname: true } } }
  });
  res.json({
    success: true,
    feed: actions.map((a) => ({
      id: a.id,
      type: a.type,
      pointsDelta: a.pointsDelta,
      isAnonymous: a.isAnonymous,
      displayName: a.isAnonymous ? 'Alguien 👀' : (a.user.nickname || a.user.displayName),
      metadata: a.metadata,
      createdAt: a.createdAt
    }))
  });
});

gameRouter.post('/continue', authMiddleware, async (req, res) => {
  const uid = userId(req);
  const user = await prisma.user.findUnique({ where: { id: uid } });
  if (!user) return res.status(404).json({ success: false, error: 'No encontrado' });

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (user.lastContinuedAt && user.lastContinuedAt >= today) {
    return res.json({ success: true, alreadyDone: true, beastPoints: user.beastPoints });
  }

  await prisma.user.update({ where: { id: uid }, data: { lastContinuedAt: new Date() } });
  const result = await awardPoints(uid, 'CONTINUE', 10);
  res.json({ success: true, ...result, gained: 10 });
});

gameRouter.post('/clemency', authMiddleware, async (req, res) => {
  const uid = userId(req);
  const user = await prisma.user.findUnique({ where: { id: uid } });
  if (!user) return res.status(404).json({ success: false, error: 'No encontrado' });

  const { currentEventStart } = getEventCycle();
  if (user.clemencyUsedAt && user.clemencyUsedAt >= currentEventStart) {
    return res.status(400).json({ success: false, error: 'Ya usaste clemencia en este ciclo' });
  }

  await prisma.user.update({ where: { id: uid }, data: { clemencyUsedAt: new Date() } });
  const result = await awardPoints(uid, 'CLEMENCY', -50);
  res.json({ success: true, ...result });
});

gameRouter.post('/betray', authMiddleware, async (req, res) => {
  const uid = userId(req);
  const { targetId } = req.body as { targetId?: string };
  if (!targetId || targetId === uid) return res.status(400).json({ success: false, error: 'Objetivo inválido' });

  if (await playedMiniGameToday(uid, 'BETRAY')) {
    return res.status(400).json({ success: false, error: 'Solo 1 traición por día' });
  }

  await awardPoints(targetId, 'BETRAY_VICTIM', -30, { by: uid }, true);
  const result = await awardPoints(uid, 'BETRAY', 150, { targetId }, true);
  res.json({ success: true, ...result, gained: 150 });
});

gameRouter.post('/renegotiate', authMiddleware, async (req, res) => {
  const uid = userId(req);
  const { proposal } = req.body as { proposal?: string };
  if (!proposal?.trim()) return res.status(400).json({ success: false, error: 'Propuesta requerida' });

  await prisma.gameAction.create({
    data: { userId: uid, type: 'RENEGOTIATE', pointsDelta: 0, metadata: JSON.stringify({ proposal: proposal.trim() }) }
  });
  res.json({ success: true, message: 'Propuesta enviada al grupo' });
});

gameRouter.get('/bribe', authMiddleware, async (req, res) => {
  const uid = userId(req);
  const user = await prisma.user.findUnique({ where: { id: uid } });
  const { cycleIndex } = getEventCycle();
  const offer = getBribeOffer(cycleIndex);
  const alreadyAccepted = user?.bribeAcceptedCycle === cycleIndex;
  res.json({ success: true, offer, alreadyAccepted });
});

gameRouter.post('/bribe/accept', authMiddleware, async (req, res) => {
  const uid = userId(req);
  const { cycleIndex } = getEventCycle();
  const user = await prisma.user.findUnique({ where: { id: uid } });
  if (user?.bribeAcceptedCycle === cycleIndex) {
    return res.status(400).json({ success: false, error: 'Ya aceptaste el soborno de este ciclo' });
  }
  const offer = getBribeOffer(cycleIndex);
  await prisma.user.update({ where: { id: uid }, data: { bribeAcceptedCycle: cycleIndex } });
  const result = await awardPoints(uid, 'BRIBE', offer.points, { penalty: offer.penalty });
  res.json({ success: true, ...result, gained: offer.points, penalty: offer.penalty });
});

gameRouter.post('/vote', authMiddleware, async (req, res) => {
  const uid = userId(req);
  const { targetId, voteType = 'ELIMINATE' } = req.body as { targetId?: string; voteType?: string };
  if (!targetId) return res.status(400).json({ success: false, error: 'targetId requerido' });
  const { cycleIndex } = getEventCycle();

  await prisma.vote.upsert({
    where: { voterId_cycleIndex_voteType: { voterId: uid, cycleIndex, voteType } },
    update: { targetId },
    create: { voterId: uid, targetId, cycleIndex, voteType }
  });

  await prisma.gameAction.create({
    data: { userId: uid, type: 'VOTE', pointsDelta: 5, metadata: JSON.stringify({ targetId, voteType }) }
  });
  await prisma.user.update({ where: { id: uid }, data: { beastPoints: { increment: 5 } } });
  res.json({ success: true, beastPoints: (await prisma.user.findUnique({ where: { id: uid } }))!.beastPoints });
});

gameRouter.get('/votes', authMiddleware, async (_req, res) => {
  const { cycleIndex } = getEventCycle();
  const votes = await prisma.vote.findMany({
    where: { cycleIndex },
    include: {
      voter: { select: { displayName: true, nickname: true } },
      target: { select: { displayName: true, nickname: true } }
    }
  });

  const tally: Record<string, { count: number; name: string }> = {};
  for (const v of votes) {
    if (!tally[v.targetId]) tally[v.targetId] = { count: 0, name: v.target.nickname || v.target.displayName };
    tally[v.targetId].count++;
  }

  res.json({ success: true, votes, tally: Object.entries(tally).map(([id, t]) => ({ targetId: id, ...t })) });
});

gameRouter.post('/alliance', authMiddleware, async (req, res) => {
  const uid = userId(req);
  const { partnerId } = req.body as { partnerId?: string };
  if (!partnerId || partnerId === uid) return res.status(400).json({ success: false, error: 'Partner inválido' });
  const { cycleIndex } = getEventCycle();

  await prisma.alliance.upsert({
    where: { userId_cycleIndex: { userId: uid, cycleIndex } },
    update: { partnerId },
    create: { userId: uid, partnerId, cycleIndex }
  });

  const result = await awardPoints(uid, 'ALLIANCE', 25, { partnerId });
  res.json({ success: true, ...result });
});

gameRouter.get('/alliance', authMiddleware, async (req, res) => {
  const uid = userId(req);
  const { cycleIndex } = getEventCycle();
  const alliance = await prisma.alliance.findUnique({
    where: { userId_cycleIndex: { userId: uid, cycleIndex } },
    include: { partner: { select: { id: true, displayName: true, nickname: true } } }
  });
  res.json({ success: true, alliance });
});

gameRouter.post('/confession', authMiddleware, async (req, res) => {
  const uid = userId(req);
  const { message } = req.body as { message?: string };
  if (!message?.trim() || message.length > 500) {
    return res.status(400).json({ success: false, error: 'Mensaje inválido (max 500)' });
  }
  await prisma.confession.create({ data: { userId: uid, message: message.trim() } });
  await awardPoints(uid, 'CONFESSION', 20);
  res.json({ success: true, message: 'Confesión guardada — se revela el 29 ago' });
});

gameRouter.get('/confessions', authMiddleware, async (req, res) => {
  const uid = userId(req);
  const user = await prisma.user.findUnique({ where: { id: uid } });
  const isMaster = user?.role === 'MASTER';
  const confessions = await prisma.confession.findMany({
    where: isMaster ? {} : { OR: [{ revealed: true }, { userId: uid }] },
    orderBy: { createdAt: 'desc' },
    include: { user: { select: { displayName: true, nickname: true } } }
  });
  res.json({
    success: true,
    confessions: confessions.map((c) => ({
      id: c.id,
      message: c.message,
      revealed: c.revealed,
      isOwn: c.userId === uid,
      author: c.revealed ? (c.user.nickname || c.user.displayName) : 'Anónimo 👤',
      createdAt: c.createdAt
    }))
  });
});

gameRouter.get('/chest', authMiddleware, async (req, res) => {
  const uid = userId(req);
  const cycle = getEventCycle();
  const claims = await prisma.chestClaim.findMany({ where: { userId: uid }, orderBy: { cycleIndex: 'asc' } });
  const canClaim = cycle.cycleIndex > 0 && !claims.find((c) => c.cycleIndex === cycle.cycleIndex);
  res.json({
    success: true,
    clues: claims.map((c) => ({ cycleIndex: c.cycleIndex, clue: c.clue })),
    allClues: CHEST_CLUES,
    canClaim,
    cycleIndex: cycle.cycleIndex,
    daysUntilChallenge: cycle.daysUntilChallenge
  });
});

gameRouter.post('/chest/claim', authMiddleware, async (req, res) => {
  const uid = userId(req);
  const cycle = getEventCycle();
  if (cycle.cycleIndex === 0) return res.status(400).json({ success: false, error: 'Aún no hay cofre' });

  const existing = await prisma.chestClaim.findUnique({
    where: { userId_cycleIndex: { userId: uid, cycleIndex: cycle.cycleIndex } }
  });
  if (existing) return res.status(400).json({ success: false, error: 'Ya abriste el cofre de este ciclo' });

  const clue = CHEST_CLUES[Math.min(cycle.cycleIndex - 1, CHEST_CLUES.length - 1)];
  await prisma.chestClaim.create({ data: { userId: uid, cycleIndex: cycle.cycleIndex, clue } });
  const result = await awardPoints(uid, 'CHEST', 100, { clue });
  res.json({ success: true, clue, ...result, gained: 100 });
});

async function miniGame(
  req: Request,
  res: Response,
  type: string,
  points: number,
  metadata?: Record<string, unknown>
) {
  const uid = userId(req);
  if (await playedMiniGameToday(uid, type)) {
    return res.status(400).json({ success: false, error: 'Ya jugaste esto hoy' });
  }
  const result = await awardPoints(uid, type, points, metadata);
  res.json({ success: true, ...result });
}

gameRouter.post('/minigame/red-light', authMiddleware, async (req, res) => {
  const { survived } = req.body as { survived?: boolean };
  return miniGame(req, res, 'RED_LIGHT', survived ? 80 : -20, { survived });
});

gameRouter.post('/minigame/trivia', authMiddleware, async (req, res) => {
  const { correct } = req.body as { correct?: boolean };
  return miniGame(req, res, 'TRIVIA', correct ? 100 : 10, { correct });
});

gameRouter.post('/minigame/ddakji', authMiddleware, async (req, res) => {
  const { won } = req.body as { won?: boolean };
  return miniGame(req, res, 'DDAKJI', won ? 90 : 15, { won });
});

gameRouter.post('/minigame/glass-bridge', authMiddleware, async (req, res) => {
  const { steps } = req.body as { steps?: number };
  const pts = Math.min(200, (steps || 0) * 25);
  return miniGame(req, res, 'GLASS_BRIDGE', pts, { steps });
});

gameRouter.post('/minigame/honeycomb', authMiddleware, async (req, res) => {
  const { precision } = req.body as { precision?: number };
  const p = Math.max(0, Math.min(100, precision || 0));
  const pts = Math.round(p * 1.2);
  return miniGame(req, res, 'HONEYCOMB', pts, { precision: p });
});

gameRouter.post('/minigame/mystery-box', authMiddleware, async (req, res) => {
  const { boxIndex } = req.body as { boxIndex?: number };
  const winBox = Math.floor(Math.random() * 3);
  const won = boxIndex === winBox;
  return miniGame(req, res, 'MYSTERY_BOX', won ? 120 : 5, { boxIndex, winBox, won });
});

gameRouter.post('/minigame/coin-flip', authMiddleware, async (req, res) => {
  const uid = userId(req);
  const { choice, bet = 50 } = req.body as { choice?: string; bet?: number };
  if (!choice || !['heads', 'tails'].includes(choice)) {
    return res.status(400).json({ success: false, error: 'Elige heads o tails' });
  }
  const user = await prisma.user.findUnique({ where: { id: uid } });
  if (!user || user.beastPoints < bet) {
    return res.status(400).json({ success: false, error: 'Puntos insuficientes para apostar' });
  }
  if (await playedMiniGameToday(uid, 'COIN_FLIP')) {
    return res.status(400).json({ success: false, error: 'Ya jugaste hoy' });
  }
  const result = Math.random() > 0.5 ? 'heads' : 'tails';
  const won = result === choice;
  const delta = won ? bet : -bet;
  const awarded = await awardPoints(uid, 'COIN_FLIP', delta, { choice, result, bet });
  res.json({ success: true, ...awarded, won, result });
});

gameRouter.post('/minigame/tug-war', authMiddleware, async (req, res) => {
  const { taps } = req.body as { taps?: number };
  const t = Math.max(0, taps || 0);
  const pts = Math.min(150, Math.floor(t / 3));
  return miniGame(req, res, 'TUG_WAR', pts, { taps: t });
});

gameRouter.post('/minigame/challenge', authMiddleware, async (req, res) => {
  const uid = userId(req);
  const { opponentId, won } = req.body as { opponentId?: string; won?: boolean };
  if (!opponentId) return res.status(400).json({ success: false, error: 'opponentId requerido' });
  if (await playedMiniGameToday(uid, 'CHALLENGE_1V1')) {
    return res.status(400).json({ success: false, error: 'Ya desafiaste hoy' });
  }
  const pts = won ? 75 : 10;
  if (won) await awardPoints(opponentId, 'CHALLENGE_LOSS', -15, { by: uid });
  const result = await awardPoints(uid, 'CHALLENGE_1V1', pts, { opponentId, won });
  res.json({ success: true, ...result });
});

gameRouter.post('/redeem', authMiddleware, async (req, res) => {
  const uid = userId(req);
  const { rewardId, cost } = req.body as { rewardId?: string; cost?: number };
  if (!rewardId || !cost) return res.status(400).json({ success: false, error: 'Premio inválido' });

  const user = await prisma.user.findUnique({ where: { id: uid } });
  if (!user || user.beastPoints < cost) {
    return res.status(400).json({ success: false, error: 'Puntos insuficientes' });
  }

  await prisma.redemption.create({ data: { userId: uid, rewardId, cost } });
  const result = await awardPoints(uid, 'REDEEM', -cost, { rewardId });
  res.json({ success: true, ...result });
});

gameRouter.patch('/profile', authMiddleware, async (req, res) => {
  const uid = userId(req);
  const { nickname, avatarEmoji } = req.body as { nickname?: string; avatarEmoji?: string };
  const user = await prisma.user.update({
    where: { id: uid },
    data: {
      ...(nickname !== undefined ? { nickname } : {}),
      ...(avatarEmoji !== undefined ? { avatarEmoji } : {})
    }
  });
  res.json({
    success: true,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      displayName: user.displayName,
      nickname: user.nickname,
      gender: user.gender,
      beastPoints: user.beastPoints,
      avatarEmoji: user.avatarEmoji,
      hasPasskey: user.passkeyRegistered
    }
  });
});
