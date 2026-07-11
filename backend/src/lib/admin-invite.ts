import { createMemberInvite } from './invites.js';
import { normalizePhone } from './phone.js';
import { buildWhatsAppInviteLinkMessage, sendWhatsAppMessage } from './whatsapp.js';

const APP_URL = process.env.APP_PUBLIC_URL || process.env.FRONTEND_URL || 'https://los4-beast.vercel.app';

export type WhatsAppInviteLinkResult = {
  invite: { code: string; expiresAt: Date; inviterName: string };
  joinUrl: string;
  whatsapp: Awaited<ReturnType<typeof sendWhatsAppMessage>>;
};

/** Envía por WhatsApp un link de invitación; el invitado elige correo y contraseña al registrarse. */
export async function sendWhatsAppInviteLink(params: {
  inviterId: string;
  phone: string;
  guestName?: string;
}): Promise<WhatsAppInviteLinkResult> {
  const phone = normalizePhone(params.phone.trim());
  if (!phone) {
    throw new Error('Número de WhatsApp inválido (ej. 04141234567)');
  }

  const invite = await createMemberInvite(params.inviterId, {
    guestName: params.guestName?.trim()
  });
  const joinUrl = `${APP_URL.replace(/\/$/, '')}/join/${invite.code}`;

  const waMsg = buildWhatsAppInviteLinkMessage({
    inviterName: invite.inviterName,
    guestName: params.guestName?.trim(),
    joinUrl
  });

  const whatsapp = await sendWhatsAppMessage(phone, waMsg, { bypassBotPause: true });

  return { invite, joinUrl, whatsapp };
}
