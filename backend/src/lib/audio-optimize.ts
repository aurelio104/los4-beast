import { execFile } from 'child_process';
import fs from 'fs';
import { promisify } from 'util';
import { RADIO_MAX_SECONDS } from './radio-storage.js';

const execFileAsync = promisify(execFile);

let ffmpegOk: boolean | null = null;

export async function isFfmpegAvailable(): Promise<boolean> {
  if (ffmpegOk !== null) return ffmpegOk;
  try {
    await execFileAsync('ffmpeg', ['-version'], { timeout: 5000 });
    ffmpegOk = true;
  } catch {
    ffmpegOk = false;
  }
  return ffmpegOk;
}

export async function optimizeAudioToMp3(
  inputPath: string,
  outputPath: string,
  maxSeconds = RADIO_MAX_SECONDS
): Promise<{ durationSec: number; sizeKb: number }> {
  if (!(await isFfmpegAvailable())) {
    throw new Error('El servidor no tiene ffmpeg — contacta al admin');
  }

  if (!fs.existsSync(inputPath)) {
    throw new Error('Archivo de audio no encontrado');
  }

  await execFileAsync(
    'ffmpeg',
    [
      '-y',
      '-i',
      inputPath,
      '-t',
      String(maxSeconds),
      '-af',
      'loudnorm=I=-16:TP=-1.5:LRA=11',
      '-ar',
      '44100',
      '-ac',
      '1',
      '-b:a',
      '128k',
      '-map_metadata',
      '-1',
      outputPath
    ],
    { timeout: 180_000, maxBuffer: 8 * 1024 * 1024 }
  );

  const stat = fs.statSync(outputPath);
  if (stat.size < 1024) {
    throw new Error('No se pudo procesar el audio');
  }

  let durationSec = maxSeconds;
  try {
    const { stdout } = await execFileAsync(
      'ffprobe',
      [
        '-v',
        'error',
        '-show_entries',
        'format=duration',
        '-of',
        'default=noprint_wrappers=1:nokey=1',
        outputPath
      ],
      { timeout: 15_000 }
    );
    const parsed = parseFloat(stdout.trim());
    if (Number.isFinite(parsed) && parsed > 0) durationSec = Math.round(parsed);
  } catch {
    /* ffprobe opcional */
  }

  return { durationSec, sizeKb: Math.round(stat.size / 1024) };
}
