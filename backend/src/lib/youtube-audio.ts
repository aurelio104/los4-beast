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

function mapYtDlpError(stderr: string, message: string): string {
  const raw = `${message}\n${stderr}`.toLowerCase();
  if (raw.includes('sign in') || raw.includes('not a bot') || raw.includes('cookies')) {
    return 'YouTube bloqueó la descarga desde el servidor. Usa la pestaña Archivo y sube el MP3 o M4A.';
  }
  if (raw.includes('private video') || raw.includes('video unavailable') || raw.includes('unavailable')) {
    return 'Ese video de YouTube no está disponible';
  }
  if (raw.includes('age-restricted') || raw.includes('confirm your age')) {
    return 'Video con restricción de edad — sube el audio como archivo';
  }
  return 'No se pudo extraer audio de YouTube. Sube el MP3 o M4A en la pestaña Archivo.';
}

function ytDlpArgs(outTemplate: string, url: string): string[] {
  const args = [
    '--js-runtimes',
    'deno',
    '--no-playlist',
    '--max-downloads',
    '1',
    '--socket-timeout',
    '25',
    '--retries',
    '3',
    '--extractor-args',
    'youtube:player_client=android,web;player_skip=webpage,configs',
    '-f',
    'ba/best',
    '-x',
    '--audio-format',
    'mp3',
    '--audio-quality',
    '5',
    '-o',
    outTemplate,
    url
  ];

  const cookiesFile = process.env.YOUTUBE_COOKIES_FILE?.trim();
  if (cookiesFile && fs.existsSync(cookiesFile)) {
    return ['--cookies', cookiesFile, ...args];
  }

  return args;
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
  try {
    await execFileAsync('yt-dlp', ytDlpArgs(outTemplate, url), {
      timeout: 180_000,
      maxBuffer: 8 * 1024 * 1024
    });
  } catch (e) {
    const err = e as { stderr?: string | Buffer; message?: string };
    const stderr = typeof err.stderr === 'string' ? err.stderr : err.stderr?.toString() || '';
    throw new Error(mapYtDlpError(stderr, err.message || String(e)));
  }

  const dir = path.dirname(outBasename);
  const prefix = path.basename(outBasename);
  const match = fs.readdirSync(dir).find((f) => f.startsWith(prefix + '.') && f !== path.basename(outTemplate));
  if (!match) {
    throw new Error('No se pudo extraer audio de YouTube. Sube el MP3 o M4A en la pestaña Archivo.');
  }
  return path.join(dir, match);
}
