import { api } from './api';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

const OPTIN_PREFIX = 'reto_push_optin_';

export function setPushOptIn(userId: string, on: boolean) {
  localStorage.setItem(`${OPTIN_PREFIX}${userId}`, on ? '1' : '0');
}

export function getPushOptIn(userId: string): boolean {
  return localStorage.getItem(`${OPTIN_PREFIX}${userId}`) === '1';
}

export function shouldKeepPushActive(user?: { id?: string; pushOptIn?: boolean } | null): boolean {
  if (!user?.id) return false;
  return user.pushOptIn === true || getPushOptIn(user.id);
}

/** Re-suscribe en el navegador y sincroniza con el servidor (silencioso tras deploy/SW). */
export async function syncPushSubscription(): Promise<boolean> {
  if (!localStorage.getItem('token')) return false;
  if (!('Notification' in window) || !('serviceWorker' in navigator)) return false;
  if (Notification.permission !== 'granted') return false;

  try {
    const reg = await navigator.serviceWorker.ready;
    const vapid = await api.pushVapidPublic();
    if (!vapid.success || !vapid.publicKey) return false;

    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapid.publicKey)
      });
    }

    const json = sub.toJSON();
    await api.pushSubscribe({
      endpoint: json.endpoint!,
      keys: { p256dh: json.keys!.p256dh!, auth: json.keys!.auth! }
    });
    return true;
  } catch {
    return false;
  }
}

export async function ensurePushPersisted(user?: { id?: string; pushOptIn?: boolean } | null) {
  if (!user?.id || !shouldKeepPushActive(user)) return false;
  setPushOptIn(user.id, true);
  if (Notification.permission !== 'granted') return false;
  return syncPushSubscription();
}
