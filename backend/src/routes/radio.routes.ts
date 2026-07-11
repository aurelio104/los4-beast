import { Router, Request, Response } from 'express';
import multer from 'multer';
import os from 'os';
import { authMiddleware } from '../middleware/auth.js';
import {
  getCurrentRadioTrack,
  submitRadioFromFile,
  submitRadioFromYoutube
} from '../lib/community-radio.js';
import { RADIO_MAX_UPLOAD_BYTES } from '../lib/radio-storage.js';

export const radioRouter = Router();

const upload = multer({
  dest: os.tmpdir(),
  limits: { fileSize: RADIO_MAX_UPLOAD_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    const ok =
      /^audio\//.test(file.mimetype) ||
      /\.(mp3|m4a|aac|wav|ogg|webm|flac|opus)$/i.test(file.originalname || '');
    cb(null, ok);
  }
});

function userId(req: Request) {
  return (req as Request & { user: { userId: string } }).user.userId;
}

/** Pista activa para todos (pública — solo metadata + URL). */
radioRouter.get('/current', async (_req, res) => {
  try {
    const track = await getCurrentRadioTrack();
    res.setHeader('Cache-Control', 'public, max-age=30');
    res.json({ success: true, track });
  } catch (e) {
    res.status(500).json({ success: false, error: (e as Error).message });
  }
});

/** Subir archivo de audio → optimiza a MP3 mono 128k (máx. 4 min). +75 Puntos, 1/día. */
radioRouter.post('/submit', authMiddleware, upload.single('audio'), async (req: Request, res: Response) => {
  try {
    const title = String(req.body?.title || '').trim();
    const youtubeUrl = String(req.body?.youtubeUrl || '').trim();
    const uid = userId(req);

    if (youtubeUrl) {
      const result = await submitRadioFromYoutube(uid, title, youtubeUrl);
      return res.status(201).json({ success: true, ...result });
    }

    const file = req.file;
    if (!file) {
      return res.status(400).json({
        success: false,
        error: 'Sube un audio (MP3, M4A…) o pega un link de YouTube'
      });
    }

    const result = await submitRadioFromFile(uid, title, file.path, file.originalname);
    res.status(201).json({ success: true, ...result });
  } catch (e) {
    if (req.file?.path) {
      try {
        const fs = await import('fs');
        fs.unlinkSync(req.file.path);
      } catch {
        /* ignore */
      }
    }
    res.status(400).json({ success: false, error: (e as Error).message });
  }
});
