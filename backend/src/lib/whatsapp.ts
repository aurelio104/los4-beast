import { prisma } from './prisma.js';
import { normalizePhone } from './phone.js';

const APP_URL = process.env.APP_PUBLIC_URL || 'https://los4-beast.vercel.app';

export type WhatsAppSendResult = {
  sent: boolean;
  via: 'twilio' | 'link' | 'skipped';
  waMeUrl?: string;
  error?: string;
};

function twilioConfigured() {
  return !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_WHATSAPP_FROM);
}

export function buildWaMeUrl(phone: string, text: string): string {
  const normalized = normalizePhone(phone);
  if (!normalized) return '';
  const digits = normalized.replace(/\D/g, '');
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

async function sendViaTwilio(to: string, body: string): Promise<{ ok: boolean; error?: string }> {
  const sid = process.env.TWILIO_ACCOUNT_SID!;
  const token = process.env.TWILIO_AUTH_TOKEN!;
  const from = process.env.TWILIO_WHATSAPP_FROM!;

  const toWa = to.startsWith('whatsapp:') ? to : `whatsapp:${normalizePhone(to) || to}`;
  const fromWa = from.startsWith('whatsapp:') ? from : `whatsapp:${from}`;

  const params = new URLSearchParams({ From: fromWa, To: toWa, Body: body });
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: params.toString()
  });

  if (!res.ok) {
    const err = await res.text();
    return { ok: false, error: err.slice(0, 200) };
  }
  return { ok: true };
}

export async function sendWhatsAppMessage(phone: string, body: string): Promise<WhatsAppSendResult> {
  const normalized = normalizePhone(phone);
  if (!normalized) return { sent: false, via: 'skipped', error: 'Teléfono inválido' };

  if (twilioConfigured()) {
    const r = await sendViaTwilio(normalized, body);
    if (r.ok) return { sent: true, via: 'twilio' };
    return {
      sent: false,
      via: 'link',
      waMeUrl: buildWaMeUrl(normalized, body),
      error: r.error
    };
  }

  return { sent: false, via: 'link', waMeUrl: buildWaMeUrl(normalized, body) };
}

export async function notifyUserWhatsApp(userId: string, body: string): Promise<WhatsAppSendResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { phone: true, whatsappOptIn: true }
  });
  if (!user?.whatsappOptIn || !user.phone) {
    return { sent: false, via: 'skipped', error: 'WhatsApp no activado' };
  }
  return sendWhatsAppMessage(user.phone, body);
}

export function buildJoinCredentialsMessage(opts: {
  displayName: string;
  username: string;
  password: string;
  appUrl?: string;
}) {
  const url = opts.appUrl || APP_URL;
  return (
    `🔥 *Reto* — ¡Bienvenido/a ${opts.displayName}!*\n\n` +
    `Tu cuenta está lista:\n` +
    `👤 Usuario: *${opts.username}*\n` +
    `🔑 Contraseña: *${opts.password}*\n` +
    `🔗 Entrar: ${url}/login\n\n` +
    `Recibirás aquí cambios de contraseña y alertas del reto.\n` +
    `Guárdalo en un lugar seguro.`
  );
}

export function buildWelcomeMessage(opts: { displayName: string; username: string; appUrl?: string }) {
  const url = opts.appUrl || APP_URL;
  return (
    `🔥 *Reto* — Bienvenido/a ${opts.displayName}\n\n` +
    `Tu cuenta está activa.\n` +
    `👤 Usuario: *${opts.username}*\n` +
    `🔗 App: ${url}\n\n` +
    `Recibirás aquí alertas del reto, cambios de contraseña y notificaciones importantes.\n` +
    `29 de agosto · ¡Nos vemos!`
  );
}

export function buildPasswordResetMessage(opts: {
  displayName: string;
  username: string;
  newPassword: string;
  appUrl?: string;
}) {
  const url = opts.appUrl || APP_URL;
  return (
    `🔐 *Reto* — Contraseña restablecida\n\n` +
    `Hola ${opts.displayName}, el admin actualizó tu acceso.\n\n` +
    `👤 Usuario: *${opts.username}*\n` +
    `🔑 Nueva contraseña: *${opts.newPassword}*\n` +
    `🔗 Entrar: ${url}/login\n\n` +
    `Cámbiala en Perfil cuando entres. No compartas este mensaje.`
  );
}

export function buildChangeAlertMessage(title: string, body: string, url?: string) {
  const link = url ? (url.startsWith('http') ? url : `${APP_URL}${url}`) : APP_URL;
  return `📢 *Reto* — ${title}\n\n${body}\n\n🔗 ${link}`;
}

export function isWhatsAppAutoSendEnabled() {
  return twilioConfigured();
}
