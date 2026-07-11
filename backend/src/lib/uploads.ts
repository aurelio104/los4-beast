import fs from 'fs';
import path from 'path';

const DATA_ROOT = fs.existsSync('/data') ? '/data' : path.join(process.cwd(), 'data');
export const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(DATA_ROOT, 'uploads');

const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_BYTES = 900_000; // ~900KB after client compression

export function ensureUploadDir() {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

export function extensionForMime(mime: string): string | null {
  if (mime === 'image/jpeg') return 'jpg';
  if (mime === 'image/png') return 'png';
  if (mime === 'image/webp') return 'webp';
  return null;
}

/** Guarda data URL → archivo y devuelve path público `/api/uploads/...` */
export function saveAvatarDataUrl(userId: string, dataUrl: string): string {
  const match = /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/i.exec(dataUrl);
  if (!match) throw new Error('Formato de imagen inválido');

  const mime = match[1].toLowerCase();
  if (!ALLOWED.has(mime)) throw new Error('Solo JPG, PNG o WebP');

  const buffer = Buffer.from(match[2], 'base64');
  if (buffer.length > MAX_BYTES) throw new Error('Imagen demasiado grande (máx. ~800KB)');
  if (buffer.length < 100) throw new Error('Imagen inválida');

  ensureUploadDir();
  const ext = extensionForMime(mime)!;
  // limpia avatares previos del mismo usuario
  for (const e of ['jpg', 'png', 'webp']) {
    const prev = path.join(UPLOAD_DIR, `${userId}.${e}`);
    if (fs.existsSync(prev)) fs.unlinkSync(prev);
  }

  const filename = `${userId}.${ext}`;
  fs.writeFileSync(path.join(UPLOAD_DIR, filename), buffer);
  return `/api/uploads/${filename}?v=${Date.now()}`;
}

export function deleteAvatarFiles(userId: string) {
  ensureUploadDir();
  for (const e of ['jpg', 'png', 'webp']) {
    const prev = path.join(UPLOAD_DIR, `${userId}.${e}`);
    if (fs.existsSync(prev)) fs.unlinkSync(prev);
  }
}
