import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { authMiddleware, requireMaster } from '../middleware/auth.js';
import {
  initWhatsApp,
  getConnectionStatus,
  sendWhatsAppMessage,
  disconnectWhatsApp,
  getQRCode,
  cleanWhatsAppCredentials
} from '../lib/whatsapp.js';
import { hasWhatsAppAuthArchive } from '../lib/whatsapp-auth-archive.js';
import { isWhatsAppBotPaused, setWhatsAppBotPaused } from '../lib/whatsapp-bot-pause.js';

export const whatsappRouter = Router();

whatsappRouter.use(authMiddleware, requireMaster);

whatsappRouter.get('/status', async (_req, res) => {
  try {
    const status = getConnectionStatus();
    const [session, botPaused] = await Promise.all([
      prisma.whatsAppSession.findUnique({ where: { sessionId: 'main' } }),
      isWhatsAppBotPaused()
    ]);

    res.json({
      ...status,
      phoneNumber: session?.phoneNumber,
      lastConnected: session?.lastConnected,
      botPaused
    });
  } catch (error) {
    console.error('Error getting WhatsApp status:', error);
    res.status(500).json({ error: 'Error al obtener estado' });
  }
});

function prismaBytesLength(data: unknown): number {
  if (data == null) return 0;
  if (Buffer.isBuffer(data)) return data.length;
  if (data instanceof Uint8Array) return data.byteLength;
  try {
    return Buffer.from(data as ArrayBuffer).length;
  } catch {
    return 0;
  }
}

whatsappRouter.get('/persist-health', async (_req, res) => {
  try {
    const [authArchiveInDb, row] = await Promise.all([
      hasWhatsAppAuthArchive(),
      prisma.whatsAppAuthArchive.findUnique({
        where: { id: 'main' },
        select: { data: true, updatedAt: true }
      })
    ]);

    const archiveSizeBytes = prismaBytesLength(row?.data);
    const dbPersistEnabled = process.env.WHATSAPP_DB_PERSIST !== '0';
    const autoConnectOnBoot = process.env.WHATSAPP_AUTO_CONNECT_ON_BOOT !== '0';
    const authFolder = process.env.WHATSAPP_AUTH_FOLDER || './whatsapp-auth';

    const warnings: string[] = [];
    if (!dbPersistEnabled) {
      warnings.push('WHATSAPP_DB_PERSIST=0: un redeploy puede perder la vinculación.');
    }
    if (!autoConnectOnBoot) {
      warnings.push('WHATSAPP_AUTO_CONNECT_ON_BOOT=0: tras deploy hay que pulsar Conectar.');
    }
    warnings.push('En Koyeb debe haber una sola réplica del backend con Baileys.');

    res.setHeader('Cache-Control', 'private, no-store');
    res.json({
      authArchiveInDb,
      archiveSizeBytes,
      archiveUpdatedAt: row?.updatedAt?.toISOString() ?? null,
      dbPersistEnabled,
      autoConnectOnBoot,
      authFolder,
      summary: authArchiveInDb
        ? 'Hay snapshot en BD: redeploy suele reconectar sin QR nuevo.'
        : 'Sin snapshot aún. Conecta y escanea el QR la primera vez.',
      warnings
    });
  } catch (error) {
    console.error('Error WhatsApp persist-health:', error);
    res.status(500).json({ error: 'Error al leer persistencia' });
  }
});

whatsappRouter.post('/bot-pause', async (req: Request, res: Response) => {
  try {
    const paused = Boolean(req.body?.paused);
    await setWhatsAppBotPaused(paused);
    res.json({
      ok: true,
      botPaused: paused,
      message: paused
        ? 'Bot pausado: no se envían mensajes automáticos. La sesión sigue activa.'
        : 'Bot activo: envíos automáticos habilitados.'
    });
  } catch (error) {
    console.error('Error WhatsApp bot-pause:', error);
    res.status(500).json({ error: 'Error al cambiar pausa del bot' });
  }
});

whatsappRouter.post('/connect', async (_req, res) => {
  try {
    const status = getConnectionStatus();
    if (status.status === 'connected') {
      return res.json({ message: 'Ya está conectado', status });
    }
    if (status.status === 'connecting' || status.status === 'qr_ready') {
      return res.json({ message: 'Conexión en progreso', status });
    }
    initWhatsApp({ userInitiated: true }).catch(console.error);
    res.json({ message: 'Iniciando conexión...', status: 'connecting' });
  } catch (error) {
    console.error('Error connecting WhatsApp:', error);
    res.status(500).json({ error: 'Error al conectar' });
  }
});

whatsappRouter.post('/disconnect', async (_req, res) => {
  try {
    await disconnectWhatsApp();
    res.json({ message: 'WhatsApp desconectado' });
  } catch (error) {
    console.error('Error disconnecting WhatsApp:', error);
    res.status(500).json({ error: 'Error al desconectar' });
  }
});

whatsappRouter.post('/clean', async (_req, res) => {
  try {
    const result = await cleanWhatsAppCredentials();
    if (result.success) {
      res.json({ ok: true, message: result.message });
    } else {
      res.status(400).json({ ok: false, error: result.message });
    }
  } catch (error) {
    console.error('Error cleaning WhatsApp:', error);
    res.status(500).json({ ok: false, error: 'Error al limpiar credenciales' });
  }
});

whatsappRouter.get('/qr', async (_req, res) => {
  try {
    const qr = getQRCode();
    if (!qr) {
      return res.status(404).json({ error: 'QR no disponible. Pulsa Conectar primero.' });
    }
    res.json({ qrCode: qr, expiry: new Date(Date.now() + 60000) });
  } catch (error) {
    console.error('Error getting QR:', error);
    res.status(500).json({ error: 'Error al obtener QR' });
  }
});

whatsappRouter.post('/send', async (req: Request, res: Response) => {
  try {
    const { phoneNumber, message } = req.body as { phoneNumber?: string; message?: string };
    if (!phoneNumber || !message) {
      return res.status(400).json({ error: 'Número y mensaje son requeridos' });
    }
    const result = await sendWhatsAppMessage(phoneNumber, message, { bypassBotPause: true });
    if (result.sent) {
      res.json({ success: true, messageId: result.messageId, message: 'Mensaje enviado' });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
        waMeUrl: result.waMeUrl
      });
    }
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Error al enviar mensaje' });
  }
});

whatsappRouter.get('/messages', async (req: Request, res: Response) => {
  try {
    const { limit = '50', status } = req.query;
    const where: { status?: string } = {};
    if (status) where.status = String(status);

    const messages = await prisma.whatsAppMessage.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: parseInt(String(limit), 10)
    });
    res.json(messages);
  } catch (error) {
    console.error('Error getting messages:', error);
    res.status(500).json({ error: 'Error al obtener historial' });
  }
});

whatsappRouter.get('/templates', async (_req, res) => {
  try {
    const templates = await prisma.whatsAppTemplate.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' }
    });
    res.json(templates);
  } catch (error) {
    console.error('Error getting templates:', error);
    res.status(500).json({ error: 'Error al obtener plantillas' });
  }
});

whatsappRouter.post('/templates/seed', async (_req, res) => {
  try {
    const templates = [
      {
        name: 'Bienvenida Reto',
        code: 'WELCOME',
        subject: 'Bienvenido al Reto',
        content: `🔥 *Reto* — Bienvenido/a {{nombre}}

Usuario: *{{usuario}}*
Contraseña: *{{password}}*

Entra: {{url}}`,
        variables: JSON.stringify(['nombre', 'usuario', 'password', 'url'])
      },
      {
        name: 'Reset contraseña',
        code: 'PASSWORD_RESET',
        subject: 'Contraseña restablecida',
        content: `🔐 *Reto* — Contraseña restablecida

Hola {{nombre}},
Usuario: *{{usuario}}*
Nueva contraseña: *{{password}}*

{{url}}/login`,
        variables: JSON.stringify(['nombre', 'usuario', 'password', 'url'])
      },
      {
        name: 'Alerta evento',
        code: 'EVENT_ALERT',
        subject: 'Alerta del Reto',
        content: `📢 *Reto* — {{titulo}}

{{mensaje}}

{{url}}`,
        variables: JSON.stringify(['titulo', 'mensaje', 'url'])
      }
    ];

    const results = [];
    for (const t of templates) {
      results.push(
        await prisma.whatsAppTemplate.upsert({
          where: { code: t.code },
          update: t,
          create: t
        })
      );
    }

    res.json({ message: 'Plantillas Reto creadas', templates: results });
  } catch (error) {
    console.error('Error seeding templates:', error);
    res.status(500).json({ error: 'Error al crear plantillas' });
  }
});
