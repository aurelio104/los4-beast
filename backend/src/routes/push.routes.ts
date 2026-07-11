import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { authMiddleware, requireMaster } from '../middleware/auth.js';
import { getVapidPublicKey, isPushConfigured, broadcastPush, sendPushToUser } from '../lib/push.js';

export const pushRouter = Router();

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
    const userId = (req as Request & { user: { userId: string } }).user.userId;
    const { endpoint, keys } = req.body as { endpoint: string; keys: { p256dh: string; auth: string } };
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return res.status(400).json({ success: false, error: 'Suscripción inválida' });
    }
    await prisma.pushSubscription.upsert({
      where: { userId },
      update: { endpoint, p256dh: keys.p256dh, auth: keys.auth },
      create: { userId, endpoint, p256dh: keys.p256dh, auth: keys.auth }
    });
    res.json({ success: true });
  } catch {
    res.status(500).json({ success: false, error: 'Error al suscribir' });
  }
});

pushRouter.post('/unsubscribe', authMiddleware, async (req: Request, res: Response) => {
  const userId = (req as Request & { user: { userId: string } }).user.userId;
  await prisma.pushSubscription.deleteMany({ where: { userId } });
  res.json({ success: true });
});

pushRouter.post('/broadcast', authMiddleware, requireMaster, async (req: Request, res: Response) => {
  const { title, body, url } = req.body as { title?: string; body?: string; url?: string };
  if (!title || !body) return res.status(400).json({ success: false, error: 'title y body requeridos' });
  const result = await broadcastPush({ title, body, url: url || '/' });
  res.json({ success: true, ...result });
});

pushRouter.post('/test', authMiddleware, async (req: Request, res: Response) => {
  const userId = (req as Request & { user: { userId: string } }).user.userId;
  const result = await sendPushToUser(userId, {
    title: '🔥 Reto',
    body: '¡Notificaciones activadas! Te avisaremos de cada evento.',
    url: '/',
    tag: 'reto'
  });
  res.json({ success: true, ...result });
});
