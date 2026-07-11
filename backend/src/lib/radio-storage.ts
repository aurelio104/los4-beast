import fs from 'fs';
import path from 'path';
import { UPLOAD_DIR, ensureUploadDir } from './uploads.js';

export const RADIO_DIR = path.join(UPLOAD_DIR, 'radio');
export const RADIO_MAX_UPLOAD_BYTES = 25 * 1024 * 1024;
export const RADIO_MAX_SECONDS = 240;
export const RADIO_POINTS = 75;

export function ensureRadioDir() {
  ensureUploadDir();
  fs.mkdirSync(RADIO_DIR, { recursive: true });
}

export function radioPublicUrl(filename: string): string {
  return `/api/uploads/radio/${filename}`;
}

export function radioFilePath(filename: string): string {
  return path.join(RADIO_DIR, filename);
}

export function newRadioFilename(userId: string): string {
  const stamp = Date.now().toString(36);
  return `track-${userId.slice(0, 8)}-${stamp}.mp3`;
}

export function deleteRadioFile(filename: string) {
  try {
    const p = radioFilePath(filename);
    if (fs.existsSync(p)) fs.unlinkSync(p);
  } catch {
    /* ignore */
  }
}
