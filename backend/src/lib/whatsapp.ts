import { prisma } from './prisma.js';
import { normalizePhone } from './phone.js';
import {
  getConnectionStatus,
  initWhatsApp,
  initWhatsAppIfPersisted,
  flushWhatsAppAuthSnapshotForShutdown,
  sendWhatsAppMessage as sendViaBaileys,
  disconnectWhatsApp,
  getQRCode,
  cleanWhatsAppCredentials,
  isPhoneOnWhatsApp,
  type SendWhatsAppOptions
} from './whatsapp-baileys.js';

export {
  getConnectionStatus,
  initWhatsApp,
  initWhatsAppIfPersisted,
  flushWhatsAppAuthSnapshotForShutdown,
  disconnectWhatsApp,
  getQRCode,
  cleanWhatsAppCredentials,
  isPhoneOnWhatsApp
};

const APP_URL = process.env.APP_PUBLIC_URL || process.env.FRONTEND_URL || 'http://localhost:3011';

export type WhatsAppSendResult = {
  sent: boolean;
  via: 'baileys' | 'link' | 'skipped';
  waMeUrl?: string;
  error?: string;
  messageId?: string;
  skipped?: boolean;
};

export function buildWaMeUrl(phone: string, text: string): string {
  const normalized = normalizePhone(phone);
  if (!normalized) return '';
  const digits = normalized.replace(/\D/g, '');
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

function toResult(
  phone: string,
  body: string,
  r: { success: boolean; messageId?: string; error?: string; skipped?: boolean }
): WhatsAppSendResult {
  if (r.success) {
    return { sent: true, via: 'baileys', messageId: r.messageId };
  }
  if (r.skipped) {
    return { sent: false, via: 'skipped', skipped: true, error: r.error };
  }
  const connected = getConnectionStatus().isConnected;
  if (!connected) {
    return {
      sent: false,
      via: 'link',
      waMeUrl: buildWaMeUrl(phone, body),
      error: r.error || 'WhatsApp no conectado — vincula desde Admin → WhatsApp'
    };
  }
  return { sent: false, via: 'link', waMeUrl: buildWaMeUrl(phone, body), error: r.error };
}

export async function sendWhatsAppMessage(
  phone: string,
  body: string,
  opts?: SendWhatsAppOptions
): Promise<WhatsAppSendResult> {
  const normalized = normalizePhone(phone);
  if (!normalized) return { sent: false, via: 'skipped', error: 'Teléfono inválido' };

  const r = await sendViaBaileys(normalized, body, opts);
  return toResult(normalized, body, r);
}

export async function notifyUserWhatsApp(
  userId: string,
  body: string,
  opts?: SendWhatsAppOptions
): Promise<WhatsAppSendResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { phone: true, whatsappOptIn: true }
  });
  if (!user?.whatsappOptIn || !user.phone) {
    return { sent: false, via: 'skipped', error: 'WhatsApp no activado' };
  }
  return sendWhatsAppMessage(user.phone, body, opts);
}

export function buildJoinCredentialsMessage(opts: {
  displayName: string;
  email: string;
  password: string;
  appUrl?: string;
}) {
  const url = opts.appUrl || APP_URL;
  const isPin = /^\d{4,6}$/.test(opts.password);
  const secretLabel = isPin ? 'Clave' : 'Contraseña';
  return (
    `🔥 *Reto* — ¡Bienvenido/a ${opts.displayName}!*\n\n` +
    `Tu cuenta está lista:\n` +
    `📧 Correo: *${opts.email}*\n` +
    `🔑 ${secretLabel}: *${opts.password}*\n` +
    `🔗 Entrar: ${url}/login\n\n` +
    `Usa tu correo y ${secretLabel.toLowerCase()} para entrar.\n` +
    `Recibirás aquí alertas del reto. Guárdalo en un lugar seguro.`
  );
}

export function buildWhatsAppInviteLinkMessage(opts: {
  inviterName: string;
  joinUrl: string;
  guestName?: string;
}) {
  const greeting = opts.guestName ? `Hola ${opts.guestName}!` : '¡Hola!';
  return (
    `🔥 *Reto* — ${greeting}\n\n` +
    `${opts.inviterName} te invita al Reto del 29 de agosto.\n\n` +
    `Abre este link y crea tu cuenta con *tu correo y tu contraseña*:\n` +
    `🔗 ${opts.joinUrl}\n\n` +
    `El link es personal, válido 14 días y de un solo uso.`
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

export function isWhatsAppAutoSendEnabled(): boolean {
  return getConnectionStatus().isConnected;
}

export async function isWhatsAppConfigured(): Promise<boolean> {
  if (getConnectionStatus().isConnected) return true;
  const { hasWhatsAppAuthArchive } = await import('./whatsapp-auth-archive.js');
  return hasWhatsAppAuthArchive().catch(() => false);
}
