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

export async function sendPushToUser(
  userId: string,
  payload: { title: string; body: string; url?: string; tag?: string }
) {
  let pushSent = 0;
  if (isPushConfigured()) {
    const sub = await prisma.pushSubscription.findUnique({ where: { userId } });
    if (sub) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify({
            ...payload,
            url: payload.url || '/',
            tag: payload.tag || 'reto',
            badgeCount: 1
          }),
          { TTL: 86400, urgency: 'high' as webpush.Urgency }
        );
        pushSent = 1;
      } catch (e) {
        const err = e as { statusCode?: number };
        if (err.statusCode === 410 || err.statusCode === 404) {
          await prisma.pushSubscription.delete({ where: { userId } }).catch(() => {});
        }
      }
    }
  }

  const { buildChangeAlertMessage, notifyUserWhatsApp } = await import('./whatsapp.js');
  const wa = await notifyUserWhatsApp(userId, buildChangeAlertMessage(payload.title, payload.body, payload.url));

  return { sent: pushSent, whatsapp: wa };
}

export async function broadcastPush(payload: { title: string; body: string; url?: string; tag?: string }) {
  const { buildChangeAlertMessage, sendWhatsAppMessage } = await import('./whatsapp.js');
  const msg = buildChangeAlertMessage(payload.title, payload.body, payload.url);

  const subs = await prisma.pushSubscription.findMany();
  const notifiedWa = new Set<string>();
  let sent = 0;
  let waSent = 0;

  for (const sub of subs) {
    const r = await sendPushToUser(sub.userId, payload);
    sent += r.sent;
    if (r.whatsapp?.sent) {
      waSent++;
      notifiedWa.add(sub.userId);
    }
  }

  const waOnly = await prisma.user.findMany({
    where: {
      whatsappOptIn: true,
      phone: { not: null },
      isActive: true,
      ...(notifiedWa.size ? { id: { notIn: [...notifiedWa] } } : {})
    },
    select: { phone: true }
  });

  for (const u of waOnly) {
    if (!u.phone) continue;
    const r = await sendWhatsAppMessage(u.phone, msg);
    if (r.sent) waSent++;
  }

  return { sent, total: subs.length, whatsappSent: waSent };
}

export async function notifyEventReminder() {
  return broadcastPush({
    title: '🔥 Evento activo',
    body: 'Tienes 48h para jugar y ganar Puntos. ¡Entra ya!',
    url: '/eventos'
  });
}

export async function notifyDailyContinue() {
  return broadcastPush({
    title: '¿Sigues en el juego?',
    body: 'Toca Continuar y gana +10 Puntos hoy',
    url: '/'
  });
}
