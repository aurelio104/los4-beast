import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { authRouter } from './routes/auth.routes.js';
import { gameRouter } from './routes/game.routes.js';
import { radioRouter } from './routes/radio.routes.js';
import { pushRouter } from './routes/push.routes.js';
import { adminRouter } from './routes/admin.routes.js';
import { chatRouter } from './routes/chat.routes.js';
import { whatsappRouter } from './routes/whatsapp.routes.js';
import { notifyDailyContinue, notifyEventReminder, isPushConfigured } from './lib/push.js';
import { isWhatsAppAutoSendEnabled, isWhatsAppConfigured } from './lib/whatsapp.js';
import { getEventCycle } from './lib/events.js';
import { ensureUploadDir, UPLOAD_DIR } from './lib/uploads.js';
import { ensureRadioDir } from './lib/radio-storage.js';

const app = express();
const PORT = parseInt(process.env.PORT || '3010', 10);

const origins = [
  process.env.WEBAUTHN_ORIGIN,
  process.env.FRONTEND_URL,
  ...(process.env.CORS_ORIGINS?.split(',').map((o) => o.trim()) || []),
  'http://localhost:3011',
  'http://127.0.0.1:3011'
].filter(Boolean) as string[];

ensureUploadDir();
ensureRadioDir();

app.use(cors({ origin: origins, credentials: true }));
app.use(express.json({ limit: '2mb' }));
app.use('/api/uploads', express.static(UPLOAD_DIR, { maxAge: '7d', fallthrough: true }));

app.get('/api/health', async (_req, res) => {
  const configured = await isWhatsAppConfigured().catch(() => false);
  res.json({
    ok: true,
    app: 'Reto',
    push: isPushConfigured(),
    whatsapp: isWhatsAppAutoSendEnabled(),
    whatsappConfigured: configured
  });
});

app.use('/api/auth', authRouter);
app.use('/api/game', gameRouter);
app.use('/api/game/radio', radioRouter);
app.use('/api/chat', chatRouter);
app.use('/api/push', pushRouter);
app.use('/api/admin', adminRouter);
app.use('/api/whatsapp', whatsappRouter);

// Scheduler simple: recordatorios cada hora
let lastDailyNotify = '';
let lastEventCycle = -1;

setInterval(async () => {
  if (!isPushConfigured()) return;
  const today = new Date().toISOString().slice(0, 10);
  const hour = new Date().getHours();

  if (hour === 9 && lastDailyNotify !== today) {
    lastDailyNotify = today;
    await notifyDailyContinue().catch(console.error);
  }

  const cycle = getEventCycle();
  if (cycle.isEventActive && cycle.cycleIndex !== lastEventCycle) {
    lastEventCycle = cycle.cycleIndex;
    await notifyEventReminder().catch(console.error);
  }
}, 60 * 60 * 1000);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🔥 Reto backend → port ${PORT}`);
  if (!isPushConfigured()) {
    console.log('ℹ️  Push: genera VAPID con pnpm -C backend vapid:generate');
  } else {
    console.log('✅ Push notifications configuradas (VAPID)');
  }
  console.log('📱 WhatsApp Baileys: Admin → WhatsApp para vincular con QR');

  const bootDelay = Number(process.env.WHATSAPP_BOOT_CONNECT_DELAY_MS || (process.env.NODE_ENV === 'production' ? 8000 : 2500));
  setTimeout(() => {
    void import('./lib/whatsapp.js')
      .then((m) => m.initWhatsAppIfPersisted())
      .catch((e) => console.warn('[whatsapp] boot auto-connect:', (e as Error).message));
  }, bootDelay);

  setTimeout(() => {
    void import('./lib/deploy-persistence.js')
      .then((m) => m.getRetoPersistenceReport())
      .then((r) => console.log(`💾 Persistencia: ${r.summary}`))
      .catch(() => {});
  }, 3000);
});

async function shutdown(signal: string) {
  console.log(`[shutdown] ${signal} — volcando WhatsApp a BD…`);
  try {
    const { flushWhatsAppAuthSnapshotForShutdown } = await import('./lib/whatsapp.js');
    await flushWhatsAppAuthSnapshotForShutdown();
  } catch (e) {
    console.warn('[shutdown] WhatsApp flush:', (e as Error).message);
  }
  process.exit(0);
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
