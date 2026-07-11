import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma.js';
import { authMiddleware, requireMaster } from '../middleware/auth.js';
import { broadcastPush } from '../lib/push.js';
import { createMemberInvite } from '../lib/invites.js';
import { resetGameToZero } from '../lib/resetGame.js';
import {
  buildPasswordResetMessage,
  sendWhatsAppMessage,
  notifyUserWhatsApp
} from '../lib/whatsapp.js';
import { getRetoPersistenceReport } from '../lib/deploy-persistence.js';
import { sendWhatsAppInviteLink } from '../lib/admin-invite.js';
import { isAcceptableUserPassword } from '../lib/user-credentials.js';
import {
  adminDeleteUser,
  adminResetUserPasskey,
  adminSetUserActive
} from '../lib/user-admin.js';

export const adminRouter = Router();

adminRouter.use(authMiddleware, requireMaster);

adminRouter.get('/persistence-health', async (_req, res) => {
  try {
    const report = await getRetoPersistenceReport();
    res.setHeader('Cache-Control', 'private, no-store');
    res.json({ success: true, ...report });
  } catch (e) {
    res.status(500).json({ success: false, error: (e as Error).message });
  }
});

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
    challengeDate: process.env.CHALLENGE_DATE || '2026-08-29T20:00:00-04:00',
    redemptions: redemptionsList.map((r) => ({
      ...r,
      userName: userMap[r.userId] || r.userId
    }))
  });
});

adminRouter.get('/users', async (req: Request, res: Response) => {
  const includeInactive = req.query.includeInactive === '1';
  const users = await prisma.user.findMany({
    where: includeInactive ? {} : { isActive: true },
    select: {
      id: true,
      username: true,
      email: true,
      displayName: true,
      nickname: true,
      role: true,
      phone: true,
      whatsappOptIn: true,
      passkeyRegistered: true,
      points: true,
      isActive: true,
      createdAt: true
    },
    orderBy: [{ role: 'asc' }, { displayName: 'asc' }]
  });
  res.json({ success: true, users });
});

adminRouter.post('/users/:userId/reset-password', async (req: Request, res: Response) => {
  const userId = String(req.params.userId);
  const { newPassword } = req.body as { newPassword?: string };

  if (!newPassword || !isAcceptableUserPassword(newPassword)) {
    return res.status(400).json({
      success: false,
      error: 'Usa un PIN de 4–6 dígitos o una contraseña de al menos 8 caracteres'
    });
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.isActive) {
    return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });

  const waMessage = buildPasswordResetMessage({
    displayName: user.displayName,
    username: user.username,
    newPassword
  });

  let whatsapp = await notifyUserWhatsApp(userId, waMessage, { bypassBotPause: true });
  if (!whatsapp.sent && user.phone) {
    whatsapp = await sendWhatsAppMessage(user.phone, waMessage, { bypassBotPause: true });
  }

  res.json({
    success: true,
    user: {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      phone: user.phone,
      whatsappOptIn: user.whatsappOptIn
    },
    whatsapp
  });
});

adminRouter.post('/users/:userId/reset-passkey', async (req: Request, res: Response) => {
  const userId = String(req.params.userId);
  try {
    const result = await adminResetUserPasskey(userId);
    res.json({ success: true, ...result });
  } catch (e) {
    res.status(400).json({ success: false, error: (e as Error).message });
  }
});

adminRouter.patch('/users/:userId', async (req: Request, res: Response) => {
  const userId = String(req.params.userId);
  const { isActive } = req.body as { isActive?: boolean };
  if (typeof isActive !== 'boolean') {
    return res.status(400).json({ success: false, error: 'isActive requerido' });
  }
  try {
    const result = await adminSetUserActive(userId, isActive);
    res.json({ success: true, ...result });
  } catch (e) {
    res.status(400).json({ success: false, error: (e as Error).message });
  }
});

adminRouter.delete('/users/:userId', async (req: Request, res: Response) => {
  const userId = String(req.params.userId);
  const adminId = (req as Request & { user: { userId: string } }).user.userId;
  try {
    await adminDeleteUser(userId, adminId);
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ success: false, error: (e as Error).message });
  }
});

adminRouter.post('/invites', async (req: Request, res: Response) => {
  try {
    const userId = (req as Request & { user: { userId: string } }).user.userId;
    const invite = await createMemberInvite(userId);
    res.status(201).json({ success: true, invite });
  } catch (e) {
    res.status(400).json({ success: false, error: (e as Error).message });
  }
});

adminRouter.post('/invites/whatsapp', async (req: Request, res: Response) => {
  try {
    const adminId = (req as Request & { user: { userId: string } }).user.userId;
    const { displayName, phone } = req.body as {
      displayName?: string;
      phone?: string;
    };

    if (!phone?.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Indica el número de WhatsApp del invitado'
      });
    }

    const result = await sendWhatsAppInviteLink({
      inviterId: adminId,
      phone: phone.trim(),
      guestName: displayName?.trim()
    });

    res.status(201).json({
      success: true,
      invite: {
        code: result.invite.code,
        expiresAt: result.invite.expiresAt,
        inviterName: result.invite.inviterName
      },
      joinUrl: result.joinUrl,
      whatsapp: result.whatsapp
    });
  } catch (e) {
    res.status(400).json({ success: false, error: (e as Error).message });
  }
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

adminRouter.post('/reset-all', async (req: Request, res: Response) => {
  const { confirm } = req.body as { confirm?: string };
  if (confirm !== 'RETO_ZERO') {
    return res.status(400).json({
      success: false,
      error: 'Confirma con { "confirm": "RETO_ZERO" }'
    });
  }

  try {
    const summary = await resetGameToZero();
    res.json({ success: true, message: 'Producción reseteada a cero', summary });
  } catch (e) {
    res.status(500).json({ success: false, error: (e as Error).message });
  }
});

adminRouter.post('/notify-event', async (_req, res) => {
  const result = await broadcastPush({
    title: '⚡ Evento activo',
    body: 'Nuevo ciclo de 10 días — entra y compite por BP',
    url: '/eventos'
  });
  res.json({ success: true, ...result });
});
