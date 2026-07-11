import fs from 'fs';
import { prisma } from './prisma.js';
import { hasWhatsAppAuthArchive } from './whatsapp-auth-archive.js';

export type RetoPersistenceReport = {
  ok: boolean;
  timestamp: string;
  volume: {
    dataDirExists: boolean;
    dataDirWritable: boolean;
    dbOnVolume: boolean;
    uploadsOnVolume: boolean;
    whatsappAuthOnVolume: boolean;
  };
  paths: {
    databaseUrl: string;
    uploadDir: string;
    whatsappAuthFolder: string;
  };
  counts: {
    users: number;
    whatsappMessages: number;
    uploadFiles: number;
  };
  whatsappAuthArchiveInDb: boolean;
  warnings: string[];
  summary: string;
};

function countFiles(dir: string): number {
  try {
    if (!fs.existsSync(dir)) return 0;
    return fs.readdirSync(dir).filter((f) => fs.statSync(`${dir}/${f}`).isFile()).length;
  } catch {
    return 0;
  }
}

export async function getRetoPersistenceReport(): Promise<RetoPersistenceReport> {
  const databaseUrl = process.env.DATABASE_URL || 'file:./dev.db';
  const uploadDir = process.env.UPLOAD_DIR || '/data/uploads';
  const whatsappAuthFolder = process.env.WHATSAPP_AUTH_FOLDER || '/data/whatsapp-auth';
  const warnings: string[] = [];

  const dataDirExists = fs.existsSync('/data');
  let dataDirWritable = false;
  try {
    if (dataDirExists) {
      fs.accessSync('/data', fs.constants.W_OK);
      dataDirWritable = true;
    }
  } catch {
    dataDirWritable = false;
  }

  const dbOnVolume = databaseUrl.includes('/data/');
  const uploadsOnVolume = uploadDir.startsWith('/data');
  const whatsappAuthOnVolume = whatsappAuthFolder.startsWith('/data');

  if (process.env.NODE_ENV === 'production' && !dbOnVolume) {
    warnings.push('DATABASE_URL no apunta a /data — los usuarios se perderían en redeploy.');
  }
  if (process.env.NODE_ENV === 'production' && !uploadsOnVolume) {
    warnings.push('UPLOAD_DIR no está en /data — las fotos se perderían en redeploy.');
  }
  if (process.env.NODE_ENV === 'production' && !whatsappAuthOnVolume) {
    warnings.push('WHATSAPP_AUTH_FOLDER no está en /data — la sesión WA se perdería en redeploy.');
  }
  if (process.env.WHATSAPP_DB_PERSIST === '0') {
    warnings.push('WHATSAPP_DB_PERSIST=0 — snapshot WhatsApp en BD desactivado.');
  }

  const whatsappAuthArchiveInDb = await hasWhatsAppAuthArchive().catch(() => false);

  let users = 0;
  let whatsappMessages = 0;
  try {
    [users, whatsappMessages] = await Promise.all([
      prisma.user.count(),
      prisma.whatsAppMessage.count()
    ]);
  } catch {
    warnings.push('No se pudo leer la base de datos.');
  }

  const uploadFiles = countFiles(uploadDir);
  const ok =
    warnings.length === 0 &&
    dbOnVolume &&
    uploadsOnVolume &&
    whatsappAuthOnVolume &&
    dataDirExists &&
    dataDirWritable;

  const summary = ok
    ? 'Persistencia OK: usuarios, fotos y WhatsApp viven en volumen /data (+ snapshot WA en BD).'
    : whatsappAuthArchiveInDb
      ? 'Volumen parcial o advertencias — revisa warnings. Hay snapshot WhatsApp en BD.'
      : 'Revisa volumen /data y variables. Tras vincular WhatsApp, el snapshot queda en la BD.';

  return {
    ok,
    timestamp: new Date().toISOString(),
    volume: { dataDirExists, dataDirWritable, dbOnVolume, uploadsOnVolume, whatsappAuthOnVolume },
    paths: { databaseUrl, uploadDir, whatsappAuthFolder },
    counts: { users, whatsappMessages, uploadFiles },
    whatsappAuthArchiveInDb,
    warnings,
    summary
  };
}
