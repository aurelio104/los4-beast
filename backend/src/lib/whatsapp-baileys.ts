import makeWASocket, {
  Browsers,
  DisconnectReason,
  useMultiFileAuthState,
  WASocket,
  makeCacheableSignalKeyStore,
  fetchLatestBaileysVersion
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import { prisma } from './prisma.js';
import {
  cancelScheduledPersistWhatsAppAuthArchive,
  clearWhatsAppAuthArchive,
  hasWhatsAppAuthArchive,
  persistWhatsAppAuthArchive,
  restoreWhatsAppAuthArchive,
  schedulePersistWhatsAppAuthArchive
} from './whatsapp-auth-archive.js';
import * as fs from 'fs';
import * as path from 'path';
import pino from 'pino';
import { isWhatsAppBotPaused } from './whatsapp-bot-pause.js';

const logger = pino({ level: 'silent' });

/**
 * libsignal / Baileys 7 a veces vuelcan `SessionEntry` y buffers por `console.log` (no pasan por el logger pino).
 * Filtro acotado: solo silencia patrones conocidos de ruido cripto. Desactivar: WHATSAPP_VERBOSE_LIB_LOGS=1
 */
function installLibSignalConsoleNoiseFilter(): void {
  if (process.env.WHATSAPP_VERBOSE_LIB_LOGS === '1') return;
  type CLog = typeof console.log;
  const key = '__retoWaConsolePatched';
  if ((globalThis as unknown as Record<string, boolean>)[key]) return;
  (globalThis as unknown as Record<string, boolean>)[key] = true;

  const orig: { log: CLog; info: CLog; debug: CLog } = {
    log: console.log.bind(console),
    info: console.info.bind(console),
    debug: console.debug.bind(console)
  };

  const isSignalSessionNoise = (args: unknown[]): boolean => {
    if (args.some((a) => a != null && typeof a === 'object' && (a as object).constructor?.name === 'SessionEntry')) {
      return true;
    }
    const head = args[0];
    if (typeof head === 'string') {
      if (/^Closing session/i.test(head)) return true;
      if (/Closing stale open session/i.test(head)) return true;
    }
    return false;
  };

  const wrap =
    (fn: CLog) =>
    (...a: unknown[]) => {
      if (isSignalSessionNoise(a)) return;
      fn(...a);
    };

  console.log = wrap(orig.log);
  console.info = wrap(orig.info);
  console.debug = wrap(orig.debug);
}

installLibSignalConsoleNoiseFilter();

/** Último cierre relevante (p. ej. conflicto 440) para el panel; se limpia al conectar bien. */
export type WhatsAppCloseDiagnostic = {
  kind: 'SESSION_CONFLICT' | 'LOGGED_OUT' | 'OTHER';
  summary: string;
  at: string;
};

let lastCloseDiagnostic: WhatsAppCloseDiagnostic | null = null;

function setCloseDiagnostic(d: WhatsAppCloseDiagnostic | null): void {
  lastCloseDiagnostic = d;
}

let sock: WASocket | null = null;
let qrCodeData: string | null = null;
let isConnecting = false;
let authCleanInProgress = false;
/** Evita tratar el 401 tras `logout()` local como sesión “corrupta”. */
let expectIntentionalLogoutClose = false;
let connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'qr_ready' = 'disconnected';

/**
 * Tras escanear el QR, WhatsApp suele cerrar el stream con 515 «restart required»; hay que volver a
 * abrir el socket con las credenciales ya guardadas (Baileys issues #1218, #141). Sin esto la sesión
 * no termina de enlazar aunque el móvil muestre el dispositivo vinculado.
 */
let waAuto515RestartCount = 0;
const WA_AUTO_515_RESTART_MAX = 8;
let waAuto515Timer: ReturnType<typeof setTimeout> | null = null;

function cancelWaAuto515Restart(): void {
  if (waAuto515Timer) {
    clearTimeout(waAuto515Timer);
    waAuto515Timer = null;
  }
}

function resetWaAuto515RestartBudget(): void {
  waAuto515RestartCount = 0;
  cancelWaAuto515Restart();
}

function scheduleWaAuto515Restart(): void {
  if (waAuto515RestartCount >= WA_AUTO_515_RESTART_MAX) {
    console.warn(
      `📱 WhatsApp: se alcanzó el límite de ${WA_AUTO_515_RESTART_MAX} reinicios automáticos por código 515. Pulsa «Conectar», revisa la red o WHATSAPP_WA_VERSION; si persiste, «Limpiar credenciales».`
    );
    return;
  }
  waAuto515RestartCount += 1;
  cancelWaAuto515Restart();
  const delayMs = Math.min(5500, 1100 + waAuto515RestartCount * 400);
  console.log(
    `📱 WhatsApp: reinicio de sesión pedido por WhatsApp (515). Reabriendo en ${(delayMs / 1000).toFixed(1)}s (automático ${waAuto515RestartCount}/${WA_AUTO_515_RESTART_MAX})…`
  );
  waAuto515Timer = setTimeout(() => {
    waAuto515Timer = null;
    void initWhatsApp().catch((e) => console.error('[whatsapp] reinicio automático tras 515:', e));
  }, delayMs);
}

const AUTH_FOLDER = process.env.WHATSAPP_AUTH_FOLDER || './whatsapp-auth';
const AUTH_ROOT = path.resolve(AUTH_FOLDER);

/**
 * Baileys 7.0.0-rc.9 trae `[2,3000,1027934701]`; WhatsApp ya no lo acepta → 405 en el WebSocket.
 * @see https://github.com/WhiskeySockets/Baileys/issues/2376
 * Override: WHATSAPP_WA_VERSION=2,3000,1034074495
 */
const DEFAULT_WA_PROTOCOL_VERSION: [number, number, number] = [2, 3000, 1034074495];

function parseWaVersionFromEnv(): [number, number, number] | undefined {
  const raw = process.env.WHATSAPP_WA_VERSION?.trim();
  if (!raw) return undefined;
  const parts = raw.split(/[,_]/).map((s) => parseInt(s.trim(), 10));
  if (parts.length === 3 && parts.every((n) => Number.isFinite(n))) {
    return [parts[0], parts[1], parts[2]];
  }
  console.warn('⚠️ WHATSAPP_WA_VERSION inválido; se usa la versión por defecto.');
  return undefined;
}

if (!fs.existsSync(AUTH_ROOT)) {
  fs.mkdirSync(AUTH_ROOT, { recursive: true });
}

let authDbSyncTimer: ReturnType<typeof setInterval> | null = null;

function stopAuthDbSync(): void {
  if (authDbSyncTimer) {
    clearInterval(authDbSyncTimer);
    authDbSyncTimer = null;
  }
  cancelScheduledPersistWhatsAppAuthArchive();
}

function startAuthDbSync(): void {
  stopAuthDbSync();
  authDbSyncTimer = setInterval(() => {
    void persistWhatsAppAuthArchive(AUTH_ROOT).catch((e) =>
      console.warn('[whatsapp] sincronizar auth → BD:', e)
    );
  }, 25_000);
}

if (process.env.NODE_ENV === 'production') {
  console.log(
    `[whatsapp] Auth Baileys: ${AUTH_ROOT} + snapshot único en BD (WhatsAppAuthArchive); redeploy sin volumen conserva la vinculación)`
  );
}

/** Espera a que termine «Limpiar credenciales» para no mezclar restore/persist con el wipe. */
async function waitUntilAuthCleanIdle(maxMs = 30_000): Promise<void> {
  const start = Date.now();
  while (authCleanInProgress && Date.now() - start < maxMs) {
    await new Promise((r) => setTimeout(r, 120));
  }
}

/** Borra copia en BD y archivos *.json locales (sesión inválida o limpieza manual). */
async function wipeAuthStorage(): Promise<number> {
  try {
    await clearWhatsAppAuthArchive();
  } catch (e) {
    console.error('[whatsapp] No se pudo vaciar WhatsAppAuthArchive en BD (revisa Postgres / réplicas):', e);
  }
  let deleted = 0;
  if (fs.existsSync(AUTH_ROOT)) {
    for (const f of fs.readdirSync(AUTH_ROOT)) {
      if (!f.endsWith('.json')) continue;
      try {
        fs.unlinkSync(path.join(AUTH_ROOT, f));
        deleted++;
      } catch {
        /* ignore */
      }
    }
  }
  return deleted;
}

export function getConnectionStatus(): {
  status: typeof connectionStatus;
  qrCode: string | null;
  isConnected: boolean;
  lastCloseDiagnostic: WhatsAppCloseDiagnostic | null;
} {
  return {
    status: connectionStatus,
    qrCode: qrCodeData,
    isConnected: connectionStatus === 'connected',
    lastCloseDiagnostic
  };
}

/**
 * Tras un redeploy: si hay snapshot en PostgreSQL, abre Baileys sin intervención (sin QR si la sesión sigue válida).
 * Desactivar: `WHATSAPP_AUTO_CONNECT_ON_BOOT=0`.
 */
export async function initWhatsAppIfPersisted(): Promise<void> {
  if (process.env.WHATSAPP_AUTO_CONNECT_ON_BOOT === '0') {
    console.log('📱 WhatsApp: auto-conexión al arrancar desactivada (WHATSAPP_AUTO_CONNECT_ON_BOOT=0).');
    return;
  }
  if (connectionStatus === 'connected' || isConnecting) return;
  const has = await hasWhatsAppAuthArchive().catch(() => false);
  if (!has) {
    console.log(
      '📱 WhatsApp: sin credenciales en BD; tras el primer enlace, los próximos deploys reconectarán solos si el snapshot se guarda (Panel o cierre ordenado del servicio).'
    );
    return;
  }
  console.log('📱 WhatsApp: credenciales en BD; reconectando automáticamente al arrancar…');
  await initWhatsApp().catch((e) =>
    console.warn('[whatsapp] auto-conexión al arrancar falló (puedes usar Panel → Conectar):', e)
  );
}

/** Antes de apagar el proceso (SIGTERM): vuelca auth a BD para no depender solo del intervalo de 25s. */
export async function flushWhatsAppAuthSnapshotForShutdown(): Promise<void> {
  try {
    stopAuthDbSync();
    await persistWhatsAppAuthArchive(AUTH_ROOT);
  } catch (e) {
    console.warn('[whatsapp] volcado de auth a BD en shutdown:', e);
  }
}

export async function initWhatsApp(opts?: { userInitiated?: boolean }): Promise<void> {
  if (isConnecting) {
    console.log('⏳ WhatsApp ya está conectándose...');
    return;
  }

  await waitUntilAuthCleanIdle();

  cancelWaAuto515Restart();
  if (opts?.userInitiated) {
    waAuto515RestartCount = 0;
  }

  isConnecting = true;
  connectionStatus = 'connecting';

  try {
    await restoreWhatsAppAuthArchive(AUTH_ROOT).catch((e) =>
      console.warn('[whatsapp] restaurar auth desde BD:', e)
    );

    const { state, saveCreds } = await useMultiFileAuthState(AUTH_ROOT);

    /** No persistir aquí: Baileys aún no ha estabilizado creds; evita snapshot parcial en BD (401 en bucle). */

    const saveCredsToDiskAndDb = async () => {
      await saveCreds();
      schedulePersistWhatsAppAuthArchive(AUTH_ROOT);
    };

    /**
     * Versión WA: por defecto triple actualizado (evita 405). Opcional: WHATSAPP_WA_VERSION=2,3000,...
     * fetchLatestBaileysVersion: opt-in WHATSAPP_USE_LATEST_WA_VERSION=1 (puede dar 515 si el proto npm va rezagado).
     */
    type WaVersionTuple = [number, number, number];
    let waVersion: WaVersionTuple =
      parseWaVersionFromEnv() ?? DEFAULT_WA_PROTOCOL_VERSION;
    if (process.env.WHATSAPP_USE_LATEST_WA_VERSION === '1') {
      const { version } = await fetchLatestBaileysVersion();
      waVersion = version as WaVersionTuple;
    }

    sock = makeWASocket({
      version: waVersion,
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, logger)
      },
      logger,
      /** En Linux/Koyeb, tupla “Mac OS + Chrome” evita 405 con builds antiguas (issue Baileys #2376). */
      browser: Browsers.macOS('Chrome'),
      connectTimeoutMs: 90000,
      defaultQueryTimeoutMs: 60000,
      keepAliveIntervalMs: 30000,
      emitOwnEvents: true,
      markOnlineOnConnect: false,
      syncFullHistory: false,
      enableAutoSessionRecreation: false
    });

    sock.ev.on('creds.update', saveCredsToDiskAndDb);

    /** Baileys puede emitir varios `close` seguidos (distintos POP); solo actuamos una vez. */
    let handledCloseThisSocket = false;

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        qrCodeData = qr;
        connectionStatus = 'qr_ready';
        // QR solo en memoria; se sirve al front vía GET /status o GET /qr. No persistir en BD.
      }

      if (connection === 'close') {
        if (handledCloseThisSocket) return;
        handledCloseThisSocket = true;
        stopAuthDbSync();

        const wasShowingQR = connectionStatus === 'qr_ready';
        const err = lastDisconnect?.error as (Boom & { output?: { payload?: { statusCode?: number; message?: string } }; data?: unknown }) | undefined;
        const statusCode =
          err?.output?.statusCode ??
          err?.output?.payload?.statusCode ??
          (err as { output?: { payload?: { statusCode?: number } } })?.output?.payload?.statusCode;
        const errStr = JSON.stringify(err ?? {});
        const errMsg = String(err?.message ?? (err as Error)?.toString?.() ?? '') + errStr;

        /** Tras `logout()` el cierre puede ser 401, 405 u otro texto; siempre es esperado. */
        if (expectIntentionalLogoutClose) {
          expectIntentionalLogoutClose = false;
          sock = null;
          connectionStatus = 'disconnected';
          qrCodeData = null;
          isConnecting = false;
          await wipeAuthStorage().catch(() => {});
          await prisma.whatsAppSession
            .upsert({
              where: { sessionId: 'main' },
              update: { isConnected: false, qrCode: null },
              create: { sessionId: 'main', isConnected: false }
            })
            .catch(() => {});
          console.log('📱 WhatsApp: sesión cerrada en el servidor (desconexión o limpieza manual).');
          return;
        }

        const isConflict =
          statusCode === DisconnectReason.connectionReplaced ||
          statusCode === 440 ||
          /\(conflict\)|stream errored.*conflict|connection replaced/i.test(errMsg);
        const isLoggedOut = statusCode === DisconnectReason.loggedOut || statusCode === 401;
        const isWaRejected =
          statusCode === 405 ||
          statusCode === 403 ||
          statusCode === 503 ||
          statusCode === DisconnectReason.forbidden ||
          statusCode === DisconnectReason.unavailableService;
        /** 515 = restartRequired: fallo de stream al vincular; no es lo mismo que “QR caducado”. */
        const isRestartRequired =
          statusCode === DisconnectReason.restartRequired ||
          statusCode === 515 ||
          /restart required/i.test(errMsg);
        const isQRTimeout =
          statusCode === 408 ||
          String(statusCode) === '408' ||
          /QR refs attempts ended|Request Time-out|qr.*timeout/i.test(errMsg) ||
          /"statusCode":\s*408|"message":\s*"QR refs/i.test(errStr);

        sock = null;

        if (isConflict) {
          console.log(
            `📱 WhatsApp: sesión sustituida (código ${statusCode ?? '?'}). Suele ser otra pestaña/servidor con el mismo enlace o un segundo «Dispositivo vinculado».`
          );
          setCloseDiagnostic({
            kind: 'SESSION_CONFLICT',
            summary:
              'Otra sesión de WhatsApp Web tomó el control con este mismo número. Cierra la otra (teléfono → Dispositivos vinculados, u otro servidor) y pulsa «Conectar» aquí. Mantén una sola réplica Koyeb si usas Baileys en la nube.',
            at: new Date().toISOString()
          });
        } else {
          console.warn('❌ WhatsApp cerrado:', statusCode, err?.message ?? lastDisconnect?.error);
        }
        connectionStatus = 'disconnected';
        qrCodeData = null;
        isConnecting = false;

        await prisma.whatsAppSession.upsert({
          where: { sessionId: 'main' },
          update: { isConnected: false, qrCode: null },
          create: { sessionId: 'main', isConnected: false }
        }).catch(() => {});

        // Nunca reconectar automáticamente: usuario usa Panel WhatsApp para conectar
        if (isLoggedOut) {
          setCloseDiagnostic({
            kind: 'LOGGED_OUT',
            summary:
              'Sesión inválida o cerrada por WhatsApp. Usa «Limpiar credenciales» y vuelve a escanear el QR desde este panel.',
            at: new Date().toISOString()
          });
          await wipeAuthStorage().catch(() => {});
          const intentional = /intentional logout/i.test(errMsg);
          console.warn(
            intentional
              ? '📱 WhatsApp: la sesión dejó de ser válida (p. ej. cerraste sesión en el teléfono o credenciales antiguas). Usa «Limpiar credenciales», luego «Conectar» y escanea el QR.'
              : '📱 WhatsApp: sesión inválida o cerrada (401). En el panel usa «Limpiar credenciales» y vuelve a escanear el QR.'
          );
        } else if (isConflict) {
          /* mensaje y diagnóstico ya arriba */
        } else if (isRestartRequired) {
          scheduleWaAuto515Restart();
        } else if (isWaRejected) {
          console.warn(
            '📱 WhatsApp: rechazo al conectar (403/405/503). Suele ser versión de protocolo o límites de WhatsApp. Redeploy con el backend actualizado; si persiste, prueba WHATSAPP_USE_LATEST_WA_VERSION=1 o WHATSAPP_WA_VERSION según docs del proyecto.'
          );
        } else if (isQRTimeout) {
          console.log('📱 WhatsApp: tiempo de espera del QR. Pulsa Conectar y escanea en menos de un minuto.');
        } else if (wasShowingQR) {
          console.log(
            '📱 WhatsApp: no se completó la vinculación (QR o red). Pulsa Conectar de nuevo; si falla varias veces, limpia credenciales.'
          );
        } else {
          setCloseDiagnostic({
            kind: 'OTHER',
            summary: 'Conexión perdida. Revisa red y vuelve a conectar desde el panel cuando lo necesites.',
            at: new Date().toISOString()
          });
          console.log('📱 WhatsApp: conexión perdida. Conecta desde el Panel WhatsApp cuando lo necesites.');
        }
      } else if (connection === 'open') {
        console.log('✅ WhatsApp conectado exitosamente');
        setCloseDiagnostic(null);
        resetWaAuto515RestartBudget();
        connectionStatus = 'connected';
        qrCodeData = null;
        isConnecting = false;

        void persistWhatsAppAuthArchive(AUTH_ROOT).catch((e) =>
          console.warn('[whatsapp] persist al abrir:', e)
        );
        startAuthDbSync();

        const phoneNumber = sock?.user?.id?.split(':')[0] || null;
        
        await prisma.whatsAppSession.upsert({
          where: { sessionId: 'main' },
          update: { 
            isConnected: true, 
            qrCode: null,
            phoneNumber,
            lastConnected: new Date()
          },
          create: { 
            sessionId: 'main', 
            isConnected: true,
            phoneNumber,
            lastConnected: new Date()
          }
        });
      }
    });

    sock.ev.on('messages.upsert', async ({ messages }) => {
      for (const msg of messages) {
        if (msg.key.fromMe) continue;
        console.log('📩 Mensaje recibido:', msg.key.remoteJid);
      }
    });

  } catch (error) {
    console.error('❌ Error inicializando WhatsApp:', error);
    isConnecting = false;
    connectionStatus = 'disconnected';
    throw error;
  }
}

/** Normaliza número para WhatsApp (solo dígitos, código Venezuela 58 por defecto). */
export function normalizePhoneForWhatsApp(phoneNumber: string): string {
  let clean = phoneNumber.replace(/[^0-9]/g, '');
  if (clean.startsWith('0')) clean = '58' + clean.substring(1);
  else if (!clean.startsWith('58')) clean = '58' + clean;
  return clean;
}

/**
 * Comprueba si un número está registrado en WhatsApp.
 * Requiere que WhatsApp esté conectado.
 */
export async function isPhoneOnWhatsApp(phoneNumber: string): Promise<{ valid: boolean; error?: string }> {
  if (!sock || connectionStatus !== 'connected') {
    return { valid: false, error: 'WhatsApp no está conectado. No se puede validar el número ahora; intenta más tarde.' };
  }
  try {
    const cleanPhone = normalizePhoneForWhatsApp(phoneNumber);
    if (cleanPhone.length < 10) {
      return { valid: false, error: 'El número de teléfono no tiene suficientes dígitos.' };
    }
    const formattedNumber = `${cleanPhone}@s.whatsapp.net`;
    const waCheck = await sock.onWhatsApp(formattedNumber);
    const exists = waCheck?.[0];
    if (!exists?.exists) {
      return { valid: false, error: 'Este número no está registrado en WhatsApp. Usa un número con WhatsApp activo.' };
    }
    return { valid: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error al validar el número';
    return { valid: false, error: msg };
  }
}

export type SendWhatsAppOptions = {
  /** Envío manual desde el Panel (no aplica pausa del bot automático). */
  bypassBotPause?: boolean;
};

export async function sendWhatsAppMessage(
  phoneNumber: string,
  message: string,
  opts?: SendWhatsAppOptions
): Promise<{ success: boolean; messageId?: string; error?: string; skipped?: boolean }> {
  if (!opts?.bypassBotPause && (await isWhatsAppBotPaused())) {
    return {
      success: false,
      skipped: true,
      error: 'Bot de WhatsApp pausado. Reanúdalo en Panel → WhatsApp (no hace falta escanear QR).'
    };
  }

  if (!sock || connectionStatus !== 'connected') {
    return { success: false, error: 'WhatsApp no está conectado' };
  }

  try {
    const cleanPhone = normalizePhoneForWhatsApp(phoneNumber);
    const formattedNumber = `${cleanPhone}@s.whatsapp.net`;

    // Verificar si el número está en WhatsApp
    const waCheck = await sock.onWhatsApp(formattedNumber);
    const exists = waCheck?.[0];
    if (!exists?.exists) {
      // Guardar log de mensaje fallido
      await prisma.whatsAppMessage.create({
        data: {
          phoneNumber,
          message,
          status: 'FAILED',
          errorMessage: 'Número no registrado en WhatsApp'
        }
      });
      return { success: false, error: 'Número no registrado en WhatsApp' };
    }

    // Enviar mensaje
    const result = await sock.sendMessage(formattedNumber, { text: message });
    
    // Guardar log de mensaje enviado
    await prisma.whatsAppMessage.create({
      data: {
        phoneNumber,
        message,
        status: 'SENT',
        messageId: result?.key?.id,
        sentAt: new Date()
      }
    });

    console.log('✅ Mensaje WhatsApp enviado a:', phoneNumber);
    return { success: true, messageId: result?.key?.id ?? undefined };

  } catch (error: any) {
    console.error('❌ Error enviando WhatsApp:', error);
    
    await prisma.whatsAppMessage.create({
      data: {
        phoneNumber,
        message,
        status: 'FAILED',
        errorMessage: error.message
      }
    });

    return { success: false, error: error.message };
  }
}

export async function disconnectWhatsApp(): Promise<void> {
  setCloseDiagnostic(null);
  resetWaAuto515RestartBudget();
  stopAuthDbSync();
  if (sock) {
    expectIntentionalLogoutClose = true;
    try {
      await sock.logout();
    } catch {
      /* ignore */
    }
    sock = null;
    connectionStatus = 'disconnected';
    qrCodeData = null;
    expectIntentionalLogoutClose = false;

    await prisma.whatsAppSession.upsert({
      where: { sessionId: 'main' },
      update: { isConnected: false, qrCode: null },
      create: { sessionId: 'main', isConnected: false }
    });

    console.log('👋 WhatsApp desconectado');
  }
}

export function getQRCode(): string | null {
  return qrCodeData;
}

/** Limpiar credenciales: desconecta y borra archivos de auth para forzar nuevo escaneo QR */
export async function cleanWhatsAppCredentials(): Promise<{ success: boolean; message: string }> {
  if (authCleanInProgress) {
    return { success: true, message: 'Limpieza ya en curso; espera un momento.' };
  }
  setCloseDiagnostic(null);
  authCleanInProgress = true;
  try {
    if (sock) {
      expectIntentionalLogoutClose = true;
      try {
        await sock.logout();
      } catch {
        /* ignore; el flag se resetea en finally */
      }
      sock = null;
    }
    connectionStatus = 'disconnected';
    qrCodeData = null;
    isConnecting = false;

    stopAuthDbSync();

    await prisma.whatsAppSession.upsert({
      where: { sessionId: 'main' },
      update: { isConnected: false, qrCode: null },
      create: { sessionId: 'main', isConnected: false }
    });

    const deleted = await wipeAuthStorage();

    console.log('🧹 Credenciales WhatsApp limpiadas');
    return {
      success: true,
      message:
        deleted > 0
          ? `Credenciales limpiadas (${deleted} archivo(s) y copia en base de datos).`
          : 'No había credenciales guardadas en disco/BD.'
    };
  } catch (err: any) {
    console.error('Error limpiando credenciales:', err);
    return { success: false, message: err?.message || 'Error limpiando credenciales' };
  } finally {
    /** Si queda en true, un `close` tardío del socket viejo puede confundir el siguiente intento. */
    expectIntentionalLogoutClose = false;
    authCleanInProgress = false;
    resetWaAuto515RestartBudget();
  }
}
