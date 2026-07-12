import { execFile } from 'child_process';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

let ytDlpOk: boolean | null = null;

const YOUTUBE_STRATEGIES = [
  { id: 'android_vr', args: 'youtube:player_client=android_vr' },
  { id: 'tv_embedded', args: 'youtube:player_client=tv_embedded' },
  { id: 'ios', args: 'youtube:player_client=ios' },
  { id: 'android', args: 'youtube:player_client=android,web;player_skip=webpage,configs' },
  { id: 'mweb', args: 'youtube:player_client=mweb' },
  { id: 'web', args: 'youtube:player_client=web' }
] as const;

export function isValidYoutubeUrl(raw: string): boolean {
  return extractYoutubeVideoId(raw) !== null;
}

export function extractYoutubeVideoId(raw: string): string | null {
  const m = raw
    .trim()
    .match(/(?:youtube\.com\/(?:watch\?.*v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{11})/i);
  return m?.[1] ?? null;
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
    return 'YouTube bloqueó el link desde el servidor. Descarga el audio en tu móvil (MP3/M4A) y súbelo en Archivo.';
  }
  if (raw.includes('private video') || raw.includes('video unavailable') || raw.includes('unavailable')) {
    return 'Ese video de YouTube no está disponible';
  }
  if (raw.includes('age-restricted') || raw.includes('confirm your age')) {
    return 'Video con restricción de edad — sube el audio como archivo';
  }
  return 'No se pudo extraer audio de YouTube. Sube el MP3 o M4A en la pestaña Archivo.';
}

function stderrOf(e: unknown): string {
  const err = e as { stderr?: string | Buffer; message?: string };
  const stderr = typeof err.stderr === 'string' ? err.stderr : err.stderr?.toString() || '';
  return `${err.message || String(e)}\n${stderr}`;
}

function ytDlpArgs(outTemplate: string, url: string, youtubeExtractorArgs: string): string[] {
  const args: string[] = [
    '--js-runtimes',
    'deno',
    '--no-playlist',
    '--max-downloads',
    '1',
    '--socket-timeout',
    '25',
    '--retries',
    '2'
  ];

  const cookiesFile = process.env.YOUTUBE_COOKIES_FILE?.trim();
  if (cookiesFile && fs.existsSync(cookiesFile)) {
    args.push('--cookies', cookiesFile);
  }

  if (process.env.YOUTUBE_POT_DISABLED !== '1') {
    const potBase = process.env.YOUTUBE_POT_URL?.trim() || 'http://127.0.0.1:4416';
    args.push('--extractor-args', `youtubepot-bgutilhttp:base_url=${potBase}`);
  }

  args.push(
    '--extractor-args',
    youtubeExtractorArgs,
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
  );

  return args;
}

function clearPartialDownloads(outBasename: string) {
  const dir = path.dirname(outBasename);
  const prefix = path.basename(outBasename);
  if (!fs.existsSync(dir)) return;
  for (const f of fs.readdirSync(dir)) {
    if (f.startsWith(`${prefix}.`)) {
      try {
        fs.unlinkSync(path.join(dir, f));
      } catch {
        /* ignore */
      }
    }
  }
}

function findDownloadedFile(outBasename: string, outTemplate: string): string | null {
  const dir = path.dirname(outBasename);
  const prefix = path.basename(outBasename);
  const match = fs.readdirSync(dir).find((f) => f.startsWith(`${prefix}.`) && f !== path.basename(outTemplate));
  return match ? path.join(dir, match) : null;
}

async function runYtDlp(outTemplate: string, url: string, youtubeExtractorArgs: string): Promise<void> {
  await execFileAsync('yt-dlp', ytDlpArgs(outTemplate, url, youtubeExtractorArgs), {
    timeout: 180_000,
    maxBuffer: 8 * 1024 * 1024
  });
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
  let lastError = '';

  for (const strategy of YOUTUBE_STRATEGIES) {
    clearPartialDownloads(outBasename);
    try {
      await runYtDlp(outTemplate, url, strategy.args);
      const file = findDownloadedFile(outBasename, outTemplate);
      if (file) return file;
      lastError = `Estrategia ${strategy.id}: sin archivo de salida`;
    } catch (e) {
      lastError = stderrOf(e);
    }
  }

  throw new Error(mapYtDlpError(lastError, lastError));
}
