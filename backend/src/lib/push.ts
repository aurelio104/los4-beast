import webpush from 'web-push';
import { prisma } from './prisma.js';

const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY;
const VAPID_MAILTO = process.env.VAPID_MAILTO || 'mailto:admin@los4.local';

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails(VAPID_MAILTO, VAPID_PUBLIC, VAPID_PRIVATE);
}

export function isPushConfigured() {
  return !!(VAPID_PUBLIC && VAPID_PRIVATE);
}

export function getVapidPublicKey() {
  return VAPID_PUBLIC || null;
}

export async function sendPushToUser(userId: string, payload: { title: string; body: string; url?: string }) {
  if (!isPushConfigured()) return { sent: 0 };
  const sub = await prisma.pushSubscription.findUnique({ where: { userId } });
  if (!sub) return { sent: 0 };

  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify(payload)
    );
    return { sent: 1 };
  } catch (e) {
    const err = e as { statusCode?: number };
    if (err.statusCode === 410 || err.statusCode === 404) {
      await prisma.pushSubscription.delete({ where: { userId } }).catch(() => {});
    }
    return { sent: 0, error: String(e) };
  }
}

export async function broadcastPush(payload: { title: string; body: string; url?: string }) {
  if (!isPushConfigured()) return { sent: 0, total: 0 };
  const subs = await prisma.pushSubscription.findMany();
  let sent = 0;
  for (const sub of subs) {
    const r = await sendPushToUser(sub.userId, payload);
    sent += r.sent;
  }
  return { sent, total: subs.length };
}

export async function notifyEventReminder() {
  return broadcastPush({
    title: '🔥 Evento Beast activo',
    body: 'Tienes 48h para jugar y ganar BP. ¡Entra ya!',
    url: '/eventos'
  });
}

export async function notifyDailyContinue() {
  return broadcastPush({
    title: '¿Sigues en el juego?',
    body: 'Toca Continuar y gana +10 BP hoy',
    url: '/'
  });
}
