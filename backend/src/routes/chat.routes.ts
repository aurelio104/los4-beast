import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authMiddleware } from '../middleware/auth.js';
import { resolvePublicName } from '../lib/user-display.js';

export const chatRouter = Router();

function uid(req: Request) {
  return (req as Request & { user: { userId: string } }).user.userId;
}

chatRouter.use(authMiddleware);

chatRouter.get('/messages', async (req: Request, res: Response) => {
  const after = typeof req.query.after === 'string' ? req.query.after : undefined;
  const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit || '50'), 10) || 50));
  const me = uid(req);

  const messages = await prisma.chatMessage.findMany({
    where: after ? { createdAt: { gt: new Date(after) } } : undefined,
    orderBy: { createdAt: after ? 'asc' : 'desc' },
    take: limit,
    include: {
      user: {
        select: { id: true, displayName: true, nickname: true, username: true, avatarEmoji: true, avatarUrl: true }
      }
    }
  });

  const ordered = after ? messages : messages.reverse();

  res.json({
    success: true,
    messages: ordered.map((m) => ({
      id: m.id,
      body: m.body,
      createdAt: m.createdAt,
      isOwn: m.userId === me,
      user: {
        id: m.user.id,
        name: resolvePublicName(m.user),
        emoji: m.user.avatarEmoji,
        avatarUrl: m.user.avatarUrl
      }
    }))
  });
});

const sendSchema = z.object({
  body: z.string().trim().min(1).max(500)
});

chatRouter.post('/messages', async (req: Request, res: Response) => {
  try {
    const { body } = sendSchema.parse(req.body);
    const userId = uid(req);

    const msg = await prisma.chatMessage.create({
      data: { userId, body },
      include: {
        user: {
          select: { id: true, displayName: true, nickname: true, username: true, avatarEmoji: true, avatarUrl: true }
        }
      }
    });

    res.json({
      success: true,
      message: {
        id: msg.id,
        body: msg.body,
        createdAt: msg.createdAt,
        isOwn: true,
        user: {
          id: msg.user.id,
          name: resolvePublicName(msg.user),
          emoji: msg.user.avatarEmoji,
          avatarUrl: msg.user.avatarUrl
        }
      }
    });

    const senderName = resolvePublicName(msg.user);
    void (async () => {
      const { sendPushToUser } = await import('../lib/push.js');
      const recipients = await prisma.pushSubscription.findMany({
        where: { userId: { not: userId } },
        select: { userId: true },
        distinct: ['userId']
      });
      await Promise.all(
        recipients.map((s) =>
          sendPushToUser(s.userId, {
            title: senderName,
            body: body.slice(0, 120),
            url: '/chat',
            tag: 'chat'
          }).catch(() => {})
        )
      );
    })();
  } catch (e) {
    if (e instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: 'Mensaje inválido (máx. 500)' });
    }
    console.error(e);
    res.status(500).json({ success: false, error: 'Error al enviar' });
  }
});
