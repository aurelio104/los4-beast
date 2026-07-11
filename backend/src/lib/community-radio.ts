import fs from 'fs';
import os from 'os';
import path from 'path';
import { prisma } from './prisma.js';
import { awardPoints, playedMiniGameToday } from './points.js';
import { optimizeAudioToMp3 } from './audio-optimize.js';
import { downloadYoutubeAudio, isValidYoutubeUrl } from './youtube-audio.js';
import {
  RADIO_POINTS,
  deleteRadioFile,
  ensureRadioDir,
  newRadioFilename,
  radioFilePath,
  radioPublicUrl
} from './radio-storage.js';

export type RadioTrackPublic = {
  id: string;
  title: string;
  audioUrl: string;
  durationSec: number | null;
  sourceType: string;
  submittedBy: string;
  submittedAt: string;
};

export async function getCurrentRadioTrack(): Promise<RadioTrackPublic | null> {
  const track = await prisma.communityRadioTrack.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: 'desc' },
    include: { user: { select: { displayName: true, nickname: true } } }
  });
  if (!track) return null;
  return {
    id: track.id,
    title: track.title,
    audioUrl: track.audioUrl,
    durationSec: track.durationSec,
    sourceType: track.sourceType,
    submittedBy: track.user.nickname || track.user.displayName,
    submittedAt: track.createdAt.toISOString()
  };
}

async function deactivateAllTracks(exceptId?: string) {
  const active = await prisma.communityRadioTrack.findMany({
    where: { isActive: true, ...(exceptId ? { id: { not: exceptId } } : {}) },
    select: { id: true, audioFile: true }
  });
  if (active.length) {
    await prisma.communityRadioTrack.updateMany({
      where: { id: { in: active.map((t) => t.id) } },
      data: { isActive: false }
    });
    for (const t of active) {
      if (t.id !== exceptId) deleteRadioFile(t.audioFile);
    }
  }
}

async function finalizeTrack(
  userId: string,
  title: string,
  sourceType: 'upload' | 'youtube',
  sourceRef: string | undefined,
  optimizedPath: string,
  meta: { durationSec: number; sizeKb: number }
) {
  ensureRadioDir();
  const filename = newRadioFilename(userId);
  const dest = radioFilePath(filename);
  fs.renameSync(optimizedPath, dest);

  const audioUrl = radioPublicUrl(filename);

  const track = await prisma.communityRadioTrack.create({
    data: {
      userId,
      title,
      sourceType,
      sourceRef,
      audioFile: filename,
      audioUrl,
      durationSec: meta.durationSec,
      fileSizeKb: meta.sizeKb,
      isActive: true
    }
  });

  await deactivateAllTracks(track.id);

  const { gained, points } = await awardPoints(userId, 'RADIO_DJ', RADIO_POINTS, {
    title,
    sourceType,
    trackId: track.id
  });

  return {
    track: await getCurrentRadioTrack(),
    gained,
    points
  };
}

export async function submitRadioFromFile(
  userId: string,
  title: string,
  inputPath: string,
  originalName?: string
) {
  const cleanTitle = title.trim().slice(0, 120);
  if (cleanTitle.length < 2) throw new Error('Indica el nombre de la canción');

  if (await playedMiniGameToday(userId, 'RADIO_DJ')) {
    throw new Error('Ya pusiste música hoy — mañana puedes de nuevo (+75 Puntos)');
  }

  ensureRadioDir();
  const tmpOut = path.join(os.tmpdir(), `reto-radio-${userId}-${Date.now()}.mp3`);
  try {
    const meta = await optimizeAudioToMp3(inputPath, tmpOut);
    return finalizeTrack(userId, cleanTitle, 'upload', originalName, tmpOut, meta);
  } finally {
    if (fs.existsSync(tmpOut) && !fs.existsSync(radioFilePath(path.basename(tmpOut)))) {
      try {
        fs.unlinkSync(tmpOut);
      } catch {
        /* ignore */
      }
    }
    try {
      if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
    } catch {
      /* ignore */
    }
  }
}

export async function submitRadioFromYoutube(userId: string, title: string, youtubeUrl: string) {
  const cleanTitle = title.trim().slice(0, 120);
  if (cleanTitle.length < 2) throw new Error('Indica el nombre de la canción');
  if (!isValidYoutubeUrl(youtubeUrl)) throw new Error('Link de YouTube inválido');

  if (await playedMiniGameToday(userId, 'RADIO_DJ')) {
    throw new Error('Ya pusiste música hoy — mañana puedes de nuevo (+75 Puntos)');
  }

  const base = path.join(os.tmpdir(), `reto-yt-${userId}-${Date.now()}`);
  let downloaded = '';
  const tmpOut = `${base}-opt.mp3`;
  try {
    downloaded = await downloadYoutubeAudio(youtubeUrl.trim(), base);
    const meta = await optimizeAudioToMp3(downloaded, tmpOut);
    return finalizeTrack(userId, cleanTitle, 'youtube', youtubeUrl.trim(), tmpOut, meta);
  } finally {
    for (const p of [downloaded, tmpOut]) {
      if (p && fs.existsSync(p)) {
        try {
          fs.unlinkSync(p);
        } catch {
          /* ignore */
        }
      }
    }
  }
}
