import { api } from './api';

const SETUP_PREFIX = 'reto_setup_done_';
const PWA_SEEN_PREFIX = 'reto_pwa_install_seen_';
const PWA_DISMISS_PREFIX = 'reto_pwa_dismissed_';

type SetupUser = { id: string; setupCompleted?: boolean };

export function isSetupDone(userId?: string | null, user?: SetupUser | null): boolean {
  if (!userId) return false;
  if (user?.setupCompleted === true) return true;
  return localStorage.getItem(`${SETUP_PREFIX}${userId}`) === '1';
}

export function markSetupDoneLocal(userId: string) {
  localStorage.setItem(`${SETUP_PREFIX}${userId}`, '1');
  markPwaInstallPromptSeen(userId);
}

/** Persiste setup en servidor y sincroniza local. */
export async function markSetupDone(userId: string): Promise<void> {
  markSetupDoneLocal(userId);
  try {
    const res = await api.setupComplete();
    if (res.success && res.user) {
      localStorage.setItem('user', JSON.stringify(res.user));
    }
  } catch {
    /* offline — local flag basta hasta próximo /me */
  }
}

export function clearSetupDone(userId: string) {
  localStorage.removeItem(`${SETUP_PREFIX}${userId}`);
}

export function isPwaInstallPromptSeen(userId?: string | null): boolean {
  if (!userId) return false;
  if (isSetupDone(userId)) return true;
  return localStorage.getItem(`${PWA_SEEN_PREFIX}${userId}`) === '1';
}

export function markPwaInstallPromptSeen(userId: string) {
  localStorage.setItem(`${PWA_SEEN_PREFIX}${userId}`, '1');
}

export function isPwaDismissed(userId?: string | null): boolean {
  if (!userId) return false;
  const raw = localStorage.getItem(`${PWA_DISMISS_PREFIX}${userId}`);
  if (!raw) return false;
  const ts = Number(raw);
  if (!Number.isFinite(ts)) return true;
  return Date.now() - ts < 14 * 24 * 60 * 60 * 1000;
}

export function dismissPwaInstallPrompt(userId: string) {
  localStorage.setItem(`${PWA_DISMISS_PREFIX}${userId}`, String(Date.now()));
  markPwaInstallPromptSeen(userId);
}

/** Sincroniza estado de primera vez desde el servidor tras login/join. */
export async function syncSetupFromUser(user: SetupUser): Promise<void> {
  if (!user.id) return;
  if (user.setupCompleted) {
    markSetupDoneLocal(user.id);
    return;
  }
  if (isSetupDone(user.id)) {
    try {
      const res = await api.setupComplete();
      if (res.success && res.user) {
        localStorage.setItem('user', JSON.stringify(res.user));
        markSetupDoneLocal(user.id);
      }
    } catch {
      /* mantener local hasta reconexión */
    }
  }
}
