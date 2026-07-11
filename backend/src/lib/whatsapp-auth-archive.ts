/**
 * Persistencia Baileys en PostgreSQL/SQLite: **una sola fila** (`WhatsAppAuthArchive`, id=`main`).
 * Contiene un JSON `{ v:1, files: { "creds.json": "<base64>", ... } }` comprimido con gzip.
 * Evita N upserts (WhatsAppAuthBlob), restore parcial y “1 archivo” inconsistente tras limpiar.
 */
import * as fs from 'fs';
import * as path from 'path';
import * as zlib from 'zlib';
import { promisify } from 'util';
import { prisma } from './prisma.js';

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

const ARCHIVE_ID = 'main';
const DISABLE_DB_AUTH = process.env.WHATSAPP_DB_PERSIST === '0';

type ArchivePayloadV1 = { v: 1; files: Record<string, string> };

function isSafeAuthFilename(name: string): boolean {
  if (!name || name.includes('..') || name.includes('/') || name.includes('\\')) return false;
  return path.basename(name) === name && name.endsWith('.json');
}

/** Cola simple: no solapa dos persist al mismo tiempo. */
let persistChain: Promise<void> = Promise.resolve();

export async function clearWhatsAppAuthArchive(): Promise<void> {
  if (DISABLE_DB_AUTH) return;
  await prisma.whatsAppAuthArchive.deleteMany();
}

/** Indica si hay credenciales guardadas en BD (reconexión tras redeploy sin pulsar «Conectar»). */
export async function hasWhatsAppAuthArchive(): Promise<boolean> {
  if (DISABLE_DB_AUTH) return false;
  const row = await prisma.whatsAppAuthArchive.findUnique({
    where: { id: ARCHIVE_ID },
    select: { data: true }
  });
  const buf = row?.data;
  if (buf == null) return false;
  const len = Buffer.isBuffer(buf) ? buf.length : (buf as Uint8Array).byteLength;
  return len > 0;
}

/** Restaura todos los *.json desde la fila única. */
export async function restoreWhatsAppAuthArchive(folder: string): Promise<number> {
  if (DISABLE_DB_AUTH) return 0;
  const row = await prisma.whatsAppAuthArchive.findUnique({ where: { id: ARCHIVE_ID } });
  if (!row?.data || row.data.length === 0) return 0;

  let parsed: ArchivePayloadV1;
  try {
    const raw = Buffer.isBuffer(row.data) ? row.data : Buffer.from(row.data);
    const jsonBuf = await gunzip(raw);
    parsed = JSON.parse(jsonBuf.toString('utf8')) as ArchivePayloadV1;
  } catch (e) {
    console.warn('[whatsapp] Auth archive corrupto o formato antiguo; se ignora restore:', e);
    return 0;
  }

  if (parsed.v !== 1 || !parsed.files || typeof parsed.files !== 'object') return 0;

  await fs.promises.mkdir(folder, { recursive: true });
  let n = 0;
  for (const [filename, b64] of Object.entries(parsed.files)) {
    if (!isSafeAuthFilename(filename) || typeof b64 !== 'string') continue;
    try {
      const buf = Buffer.from(b64, 'base64');
      await fs.promises.writeFile(path.join(folder, filename), buf);
      n++;
    } catch {
      /* skip file */
    }
  }
  if (n > 0) {
    console.log(`[whatsapp] Auth: ${n} archivo(s) restaurados desde WhatsAppAuthArchive (una fila BD).`);
  }
  return n;
}

async function persistWhatsAppAuthArchiveWork(folder: string): Promise<void> {
  if (DISABLE_DB_AUTH) return;
  if (!fs.existsSync(folder)) return;

  const names = (await fs.promises.readdir(folder)).filter(isSafeAuthFilename);
  if (names.length === 0) {
    await prisma.whatsAppAuthArchive.deleteMany().catch(() => {});
    return;
  }

  const files: Record<string, string> = {};
  for (const name of names) {
    const fp = path.join(folder, name);
    try {
      const st = await fs.promises.stat(fp);
      if (!st.isFile()) continue;
      const buf = await fs.promises.readFile(fp);
      files[name] = buf.toString('base64');
    } catch {
      /* skip */
    }
  }

  if (Object.keys(files).length === 0) {
    await prisma.whatsAppAuthArchive.deleteMany().catch(() => {});
    return;
  }

  const payload = JSON.stringify({ v: 1 as const, files } satisfies ArchivePayloadV1);
  const zipped = await gzip(Buffer.from(payload, 'utf8'));

  await prisma.whatsAppAuthArchive.upsert({
    where: { id: ARCHIVE_ID },
    create: { id: ARCHIVE_ID, data: zipped },
    update: { data: zipped }
  });
}

/** Persiste carpeta → una fila (encadenado para no solapar escrituras). */
export function persistWhatsAppAuthArchive(folder: string): Promise<void> {
  const next = persistChain
    .catch(() => undefined)
    .then(() => persistWhatsAppAuthArchiveWork(folder));
  persistChain = next.catch((e) => {
    console.warn('[whatsapp] persist archive → BD:', e);
  });
  return next;
}

let debounceTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Tras `creds.update` de Baileys: espera un poco y persiste (evita volcar estado incompleto en cada micro‑update).
 */
export function schedulePersistWhatsAppAuthArchive(folder: string, delayMs = 1600): void {
  if (DISABLE_DB_AUTH) return;
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    void persistWhatsAppAuthArchive(folder);
  }, delayMs);
}

export function cancelScheduledPersistWhatsAppAuthArchive(): void {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
}
