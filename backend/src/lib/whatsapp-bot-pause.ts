import { prisma } from './prisma.js';

export const WHATSAPP_BOT_PAUSED_KEY = 'WHATSAPP_BOT_PAUSED';

let cached: { value: boolean; at: number } | null = null;
const CACHE_MS = 4_000;

export async function isWhatsAppBotPaused(): Promise<boolean> {
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.value;
  const row = await prisma.appConfig.findUnique({ where: { key: WHATSAPP_BOT_PAUSED_KEY } });
  const value = row?.value === 'true';
  cached = { value, at: Date.now() };
  return value;
}

export async function setWhatsAppBotPaused(paused: boolean): Promise<void> {
  await prisma.appConfig.upsert({
    where: { key: WHATSAPP_BOT_PAUSED_KEY },
    update: { value: paused ? 'true' : 'false' },
    create: {
      id: WHATSAPP_BOT_PAUSED_KEY,
      key: WHATSAPP_BOT_PAUSED_KEY,
      value: paused ? 'true' : 'false'
    }
  });
  cached = { value: paused, at: Date.now() };
  console.log(`📱 WhatsApp bot ${paused ? 'PAUSADO' : 'ACTIVO'} (automáticos)`);
}

export function invalidateWhatsAppBotPauseCache(): void {
  cached = null;
}
