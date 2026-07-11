export type AlertPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
};

export type StoredAlert = AlertPayload & {
  id: string;
  at: number;
  read: boolean;
};

const STORAGE_KEY = 'reto_alerts_v1';
const EVENT = 'reto-notifications-changed';
const MAX = 30;

function load(): StoredAlert[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as StoredAlert[];
  } catch {
    return [];
  }
}

function save(items: StoredAlert[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX)));
  window.dispatchEvent(new CustomEvent(EVENT));
}

export function getUnreadCount(): number {
  return load().filter((a) => !a.read).length;
}

export function getUnreadCountByTag(tag: string): number {
  return load().filter((a) => !a.read && a.tag === tag).length;
}

export function getRecentAlerts(limit = 8): StoredAlert[] {
  return load().slice(0, limit);
}

export function addAlert(payload: AlertPayload): StoredAlert {
  const item: StoredAlert = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    at: Date.now(),
    read: false,
    title: payload.title,
    body: payload.body,
    url: payload.url || '/',
    tag: payload.tag
  };
  const items = [item, ...load().filter((a) => a.id !== item.id)];
  save(items);
  void syncAppBadge();
  return item;
}

export function markAllRead() {
  const items = load().map((a) => ({ ...a, read: true }));
  save(items);
  void syncAppBadge();
}

export function markReadByTag(tag: string) {
  const items = load().map((a) => (a.tag === tag ? { ...a, read: true } : a));
  save(items);
  void syncAppBadge();
}

export function clearAllAlerts() {
  localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new CustomEvent(EVENT));
  void syncAppBadge();
}

export function subscribeAlerts(cb: () => void) {
  const fn = () => cb();
  window.addEventListener(EVENT, fn);
  return () => window.removeEventListener(EVENT, fn);
}

export async function syncAppBadge() {
  const count = getUnreadCount();
  try {
    const nav = navigator as Navigator & {
      setAppBadge?: (count: number) => Promise<void>;
      clearAppBadge?: () => Promise<void>;
    };
    if (count > 0 && nav.setAppBadge) {
      await nav.setAppBadge(count);
    } else if (nav.clearAppBadge) {
      await nav.clearAppBadge();
    }
    const reg = await navigator.serviceWorker?.ready;
    const swReg = reg as ServiceWorkerRegistration & {
      setAppBadge?: (count: number) => Promise<void>;
      clearAppBadge?: () => Promise<void>;
    };
    if (swReg?.setAppBadge) {
      if (count > 0) await swReg.setAppBadge(count);
      else if (swReg.clearAppBadge) await swReg.clearAppBadge();
    } else {
      reg?.active?.postMessage({ type: 'RETO_BADGE_SYNC', count });
    }
  } catch {
    /* iOS/Android antiguos */
  }
}
