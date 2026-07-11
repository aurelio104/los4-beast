import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { authMiddleware, requireMaster } from '../middleware/auth.js';
import { broadcastPush } from '../lib/push.js';

export const adminRouter = Router();

adminRouter.use(authMiddleware, requireMaster);

adminRouter.get('/dashboard', async (_req, res) => {
  const [players, actions, redemptions, confessions, votes, pushSubs] = await Promise.all([
    prisma.user.count({ where: { role: 'PLAYER' } }),
    prisma.gameAction.count(),
    prisma.redemption.count(),
    prisma.confession.count({ where: { revealed: false } }),
    prisma.vote.count(),
    prisma.pushSubscription.count()
  ]);

  const redemptionsList = await prisma.redemption.findMany({
    take: 20,
    orderBy: { createdAt: 'desc' }
  });

  const users = await prisma.user.findMany({
    select: { id: true, displayName: true, nickname: true }
  });
  const userMap = Object.fromEntries(users.map((u) => [u.id, u.nickname || u.displayName]));

  res.json({
    success: true,
    stats: { players, actions, redemptions, confessions, votes, pushSubs },
    inviteCode: process.env.INVITE_CODE || 'BEAST2026',
    challengeDate: process.env.CHALLENGE_DATE || '2026-08-29T20:00:00-04:00',
    redemptions: redemptionsList.map((r) => ({
      ...r,
      userName: userMap[r.userId] || r.userId
    }))
  });
});

adminRouter.post('/reveal-confessions', async (_req, res) => {
  await prisma.confession.updateMany({ where: { revealed: false }, data: { revealed: true } });
  await broadcastPush({
    title: '💀 Confesiones reveladas',
    body: 'Las confesiones anónimas ya están visibles. Entra a ver el drama.',
    url: '/confesion'
  });
  res.json({ success: true });
});

adminRouter.patch('/redemptions/:id', async (req: Request, res: Response) => {
  const { status } = req.body as { status?: string };
  const id = String(req.params.id);
  if (!status) return res.status(400).json({ success: false, error: 'status requerido' });
  await prisma.redemption.update({ where: { id }, data: { status } });
  res.json({ success: true });
});

adminRouter.post('/notify-event', async (_req, res) => {
  const result = await broadcastPush({
    title: '⚡ Evento Beast activo',
    body: 'Nuevo ciclo de 10 días — entra y compite por BP',
    url: '/eventos'
  });
  res.json({ success: true, ...result });
});
