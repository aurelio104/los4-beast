import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export function usePushNotifications() {
  const [supported, setSupported] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setSupported('Notification' in window && 'serviceWorker' in navigator);
    navigator.serviceWorker?.ready.then((reg) =>
      reg.pushManager.getSubscription().then((sub) => setSubscribed(!!sub))
    ).catch(() => {});
  }, []);

  const subscribe = useCallback(async () => {
    if (!supported || loading) return false;
    setLoading(true);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') return false;

      const reg = await navigator.serviceWorker.ready;
      const vapid = await api.pushVapidPublic();
      if (!vapid.success || !vapid.publicKey) return false;

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapid.publicKey)
      });

      const json = sub.toJSON();
      await api.pushSubscribe({
        endpoint: json.endpoint!,
        keys: { p256dh: json.keys!.p256dh!, auth: json.keys!.auth! }
      });
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
      setSubscribed(false);
      return true;
    } catch {
      return false;
    } finally {
      setLoading(false);
    }
  }, [loading]);

  return { supported, subscribed, loading, subscribe, unsubscribe };
}
