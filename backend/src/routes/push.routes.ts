import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { authMiddleware, requireMaster } from '../middleware/auth.js';
import { getVapidPublicKey, isPushConfigured, broadcastPush, sendPushToUser } from '../lib/push.js';

export const pushRouter = Router();

function uid(req: Request) {
  return (req as Request & { user: { userId: string } }).user.userId;
}

pushRouter.get('/vapid-public', (_req, res) => {
  const key = getVapidPublicKey();
  if (!key) {
    return res.json({ success: false, error: 'Push no configurado en el servidor' });
  }
  res.json({ success: true, publicKey: key });
});

pushRouter.post('/subscribe', authMiddleware, async (req: Request, res: Response) => {
  try {
    if (!isPushConfigured()) return res.status(503).json({ success: false, error: 'Push no configurado' });
    const userId = uid(req);
    const { endpoint, keys, userAgent } = req.body as {
      endpoint: string;
      keys: { p256dh: string; auth: string };
      userAgent?: string;
    };
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return res.status(400).json({ success: false, error: 'Suscripción inválida' });
    }

    await prisma.$transaction([
      prisma.pushSubscription.upsert({
        where: { endpoint },
        update: {
          userId,
          p256dh: keys.p256dh,
          auth: keys.auth,
          userAgent: userAgent?.slice(0, 240) || undefined
        },
        create: {
          userId,
          endpoint,
          p256dh: keys.p256dh,
          auth: keys.auth,
          userAgent: userAgent?.slice(0, 240) || undefined
        }
      }),
      prisma.user.update({ where: { id: userId }, data: { pushOptIn: true } })
    ]);

    const devices = await prisma.pushSubscription.count({ where: { userId } });
    res.json({ success: true, devices });
  } catch {
    res.status(500).json({ success: false, error: 'Error al suscribir' });
  }
});

pushRouter.post('/unsubscribe', authMiddleware, async (req: Request, res: Response) => {
  const userId = uid(req);
  const { endpoint, all } = req.body as { endpoint?: string; all?: boolean };

  if (all || !endpoint) {
    await prisma.$transaction([
      prisma.pushSubscription.deleteMany({ where: { userId } }),
      prisma.user.update({ where: { id: userId }, data: { pushOptIn: false } })
    ]);
    return res.json({ success: true, devices: 0 });
  }

  await prisma.pushSubscription.deleteMany({ where: { userId, endpoint } });
  const devices = await prisma.pushSubscription.count({ where: { userId } });
  if (devices === 0) {
    await prisma.user.update({ where: { id: userId }, data: { pushOptIn: false } });
  }
  res.json({ success: true, devices });
});

pushRouter.get('/status', authMiddleware, async (req: Request, res: Response) => {
  const userId = uid(req);
  const [devices, user] = await Promise.all([
    prisma.pushSubscription.count({ where: { userId } }),
    prisma.user.findUnique({ where: { id: userId }, select: { pushOptIn: true } })
  ]);
  const pushOptIn = user?.pushOptIn === true || devices > 0;
  if (devices > 0 && user && !user.pushOptIn) {
    await prisma.user.update({ where: { id: userId }, data: { pushOptIn: true } });
  }
  res.json({
    success: true,
    serverSubscribed: devices > 0,
    devices,
    pushOptIn
  });
});

pushRouter.post('/broadcast', authMiddleware, requireMaster, async (req: Request, res: Response) => {
  const { title, body, url } = req.body as { title?: string; body?: string; url?: string };
  if (!title || !body) return res.status(400).json({ success: false, error: 'title y body requeridos' });
  const result = await broadcastPush({ title, body, url: url || '/' });
  res.json({ success: true, ...result });
});

pushRouter.post('/test', authMiddleware, async (req: Request, res: Response) => {
  const userId = uid(req);
  const result = await sendPushToUser(userId, {
    title: 'Reto',
    body: '¡Notificaciones activadas! Te avisaremos en todos tus dispositivos.',
    url: '/',
    tag: 'reto'
  });
  res.json({ success: true, ...result });
});
