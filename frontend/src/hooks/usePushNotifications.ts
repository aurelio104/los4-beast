import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api';
import {
  ensurePushPersisted,
  getPushOptIn,
  setPushOptIn,
  shouldKeepPushActive,
  syncPushSubscription
} from '../lib/push-sync';

function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem('user') || '{}') as { id?: string; pushOptIn?: boolean };
  } catch {
    return {};
  }
}

function patchStoredUser(partial: { pushOptIn?: boolean }) {
  try {
    const user = getStoredUser();
    localStorage.setItem('user', JSON.stringify({ ...user, ...partial }));
  } catch {
    /* ignore */
  }
}

async function readSubscribedState(): Promise<boolean> {
  const user = getStoredUser();
  if (Notification.permission === 'denied') return false;
  if (shouldKeepPushActive(user)) return true;
  try {
    const reg = await navigator.serviceWorker?.ready;
    const sub = await reg?.pushManager.getSubscription();
    return !!sub;
  } catch {
    return false;
  }
}

export function usePushNotifications() {
  const [supported, setSupported] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setSubscribed(await readSubscribedState());
  }, []);

  useEffect(() => {
    setSupported('Notification' in window && 'serviceWorker' in navigator);
    void refresh();
  }, [refresh]);

  const subscribe = useCallback(async () => {
    if (!supported || loading) return false;
    setLoading(true);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') return false;

      const ok = await syncPushSubscription();
      if (!ok) return false;

      const user = getStoredUser();
      if (user.id) setPushOptIn(user.id, true);
      patchStoredUser({ pushOptIn: true });

      await api.pushTest();
      setSubscribed(true);

      const { playNotificationSound } = await import('../lib/sounds');
      const { haptic } = await import('../lib/haptics');
      const { syncAppBadge } = await import('../lib/notification-center');
      playNotificationSound();
      haptic('notification');
      void syncAppBadge();
      return true;
    } catch {
      return false;
    } finally {
      setLoading(false);
    }
  }, [supported, loading]);

  const unsubscribe = useCallback(async () => {
    if (loading) return false;
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) await sub.unsubscribe();
      await api.pushUnsubscribe();

      const user = getStoredUser();
      if (user.id) setPushOptIn(user.id, false);
      patchStoredUser({ pushOptIn: false });

      setSubscribed(false);
      return true;
    } catch {
      return false;
    } finally {
      setLoading(false);
    }
  }, [loading]);

  return { supported, subscribed, loading, subscribe, unsubscribe, refresh };
}

/** Sincroniza pushOptIn desde /me y re-registra si el usuario ya lo tenía activo. */
export async function hydratePushFromServer(user: { id: string; pushOptIn?: boolean }) {
  if (user.pushOptIn) {
    setPushOptIn(user.id, true);
    patchStoredUser({ pushOptIn: true });
  } else if (getPushOptIn(user.id)) {
    patchStoredUser({ pushOptIn: true });
  }
  await ensurePushPersisted(user);
}
