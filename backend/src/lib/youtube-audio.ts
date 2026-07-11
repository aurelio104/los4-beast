import { execFile } from 'child_process';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

let ytDlpOk: boolean | null = null;

export function isValidYoutubeUrl(raw: string): boolean {
  return /(?:youtube\.com\/(?:watch\?.*v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{11})/i.test(raw.trim());
}

export async function isYtDlpAvailable(): Promise<boolean> {
  if (ytDlpOk !== null) return ytDlpOk;
  try {
    await execFileAsync('yt-dlp', ['--version'], { timeout: 8000 });
    ytDlpOk = true;
  } catch {
    ytDlpOk = false;
  }
  return ytDlpOk;
}

/** Descarga solo audio de YouTube a un archivo temporal (webm/m4a/mp3). */
export async function downloadYoutubeAudio(url: string, outBasename: string): Promise<string> {
  if (!(await isYtDlpAvailable())) {
    throw new Error('YouTube no disponible en el servidor — sube un archivo MP3/M4A');
  }
  if (!isValidYoutubeUrl(url)) {
    throw new Error('Link de YouTube inválido');
  }

  const outTemplate = `${outBasename}.%(ext)s`;
  await execFileAsync(
    'yt-dlp',
    [
      '--no-playlist',
      '--max-downloads',
      '1',
      '--socket-timeout',
      '25',
      '-f',
      'bestaudio/best',
      '-x',
      '--audio-format',
      'mp3',
      '--audio-quality',
      '5',
      '-o',
      outTemplate,
      url
    ],
    { timeout: 180_000, maxBuffer: 4 * 1024 * 1024 }
  );

  const dir = path.dirname(outBasename);
  const prefix = path.basename(outBasename);
  const match = fs.readdirSync(dir).find((f) => f.startsWith(prefix + '.') && f !== path.basename(outTemplate));
  if (!match) {
    throw new Error('No se pudo extraer audio de YouTube');
  }
  return path.join(dir, match);
}
