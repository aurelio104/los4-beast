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

async function deliverToSubscription(
  sub: { id: string; endpoint: string; p256dh: string; auth: string },
  payload: { title: string; body: string; url?: string; tag?: string }
): Promise<boolean> {
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify({
        ...payload,
        url: payload.url || '/',
        tag: payload.tag || 'reto'
      }),
      { TTL: 86400, urgency: 'high' as webpush.Urgency }
    );
    return true;
  } catch (e) {
    const err = e as { statusCode?: number };
    if (err.statusCode === 410 || err.statusCode === 404) {
      await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
    }
    return false;
  }
}

export async function sendPushToUser(
  userId: string,
  payload: { title: string; body: string; url?: string; tag?: string },
  options?: { skipWhatsApp?: boolean }
) {
  let pushSent = 0;
  if (isPushConfigured()) {
    const subs = await prisma.pushSubscription.findMany({ where: { userId } });
    for (const sub of subs) {
      if (await deliverToSubscription(sub, payload)) pushSent++;
    }
  }

  if (options?.skipWhatsApp) {
    return { sent: pushSent, whatsapp: { sent: false } };
  }

  const { buildChangeAlertMessage, notifyUserWhatsApp } = await import('./whatsapp.js');
  const wa = await notifyUserWhatsApp(userId, buildChangeAlertMessage(payload.title, payload.body, payload.url));

  return { sent: pushSent, whatsapp: wa };
}

/** Usuarios activos con opt-in o al menos una suscripción (excluye opcional). */
async function recipientUserIds(excludeUserId?: string): Promise<string[]> {
  const users = await prisma.user.findMany({
    where: {
      isActive: true,
      ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
      OR: [{ pushOptIn: true }, { pushSubscriptions: { some: {} } }]
    },
    select: { id: true }
  });
  return users.map((u) => u.id);
}

/** Avisa a todos (menos el autor) que hay historia nueva — solo push, sin WhatsApp. */
export async function notifyNewStory(authorId: string, authorName: string) {
  if (!isPushConfigured()) return { sent: 0, total: 0 };

  const ids = await recipientUserIds(authorId);
  const payload = {
    title: `📸 ${authorName}`,
    body: 'Publicó una nueva historia',
    url: '/',
    tag: 'stories'
  };

  let sent = 0;
  for (const id of ids) {
    const r = await sendPushToUser(id, payload, { skipWhatsApp: true });
    sent += r.sent;
  }

  return { sent, total: ids.length };
}

const STORY_REACTION_GLYPHS: Record<string, string> = {
  heart: '❤️',
  fire: '🔥',
  devil: '😈'
};

/** Avisa a todos (menos quien reaccionó) que hubo reacción en una historia — solo push. */
export async function notifyStoryReaction(
  reactorId: string,
  reactorName: string,
  storyOwnerName: string,
  emoji: string
) {
  if (!isPushConfigured()) return { sent: 0, total: 0 };

  const glyph = STORY_REACTION_GLYPHS[emoji] || '✨';
  const payload = {
    title: `${glyph} ${reactorName}`,
    body: `Reaccionó a la historia de ${storyOwnerName}`,
    url: '/',
    tag: 'story-reaction'
  };

  const ids = await recipientUserIds(reactorId);
  let sent = 0;
  for (const id of ids) {
    const r = await sendPushToUser(id, payload, { skipWhatsApp: true });
    sent += r.sent;
  }

  return { sent, total: ids.length };
}

export async function broadcastPush(payload: { title: string; body: string; url?: string; tag?: string }) {
  const { buildChangeAlertMessage, sendWhatsAppMessage } = await import('./whatsapp.js');
  const msg = buildChangeAlertMessage(payload.title, payload.body, payload.url);

  const ids = await recipientUserIds();
  const notifiedWa = new Set<string>();
  let sent = 0;
  let waSent = 0;

  for (const id of ids) {
    const r = await sendPushToUser(id, payload);
    sent += r.sent;
    if (r.whatsapp?.sent) {
      waSent++;
      notifiedWa.add(id);
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

  return { sent, total: ids.length, whatsappSent: waSent };
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
