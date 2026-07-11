import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { authRouter } from './routes/auth.routes.js';
import { gameRouter } from './routes/game.routes.js';
import { pushRouter } from './routes/push.routes.js';
import { adminRouter } from './routes/admin.routes.js';
import { chatRouter } from './routes/chat.routes.js';
import { notifyDailyContinue, notifyEventReminder, isPushConfigured } from './lib/push.js';
import { getEventCycle } from './lib/events.js';

const app = express();
const PORT = parseInt(process.env.PORT || '3010', 10);

const origins = [
  process.env.WEBAUTHN_ORIGIN,
  process.env.FRONTEND_URL,
  ...(process.env.CORS_ORIGINS?.split(',').map((o) => o.trim()) || []),
  'http://localhost:3011',
  'http://127.0.0.1:3011'
].filter(Boolean) as string[];

app.use(cors({ origin: origins, credentials: true }));
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, app: 'Reto', push: isPushConfigured() });
});

app.use('/api/auth', authRouter);
app.use('/api/game', gameRouter);
app.use('/api/chat', chatRouter);
app.use('/api/push', pushRouter);
app.use('/api/admin', adminRouter);

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
    console.log('ℹ️  Push: genera VAPID con npm run vapid:generate en backend');
  }
});
