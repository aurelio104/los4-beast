import { useEffect } from 'react';
import { ensurePushPersisted, shouldKeepPushActive } from '../lib/push-sync';

function getStoredUser(): { id?: string; pushOptIn?: boolean } | null {
  try {
    const raw = localStorage.getItem('user');
    return raw ? (JSON.parse(raw) as { id?: string; pushOptIn?: boolean }) : null;
  } catch {
    return null;
  }
}

/** Tras cada deploy/SW update, re-sincroniza push sin pedir al usuario. */
export function PushAutoSync() {
  useEffect(() => {
    if (!localStorage.getItem('token')) return;

    const run = () => {
      const user = getStoredUser();
      if (!shouldKeepPushActive(user)) return;
      void ensurePushPersisted(user);
    };

    run();

    const onControllerChange = () => run();
    const onVisible = () => {
      if (document.visibilityState === 'visible') run();
    };

    navigator.serviceWorker?.addEventListener('controllerchange', onControllerChange);
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      navigator.serviceWorker?.removeEventListener('controllerchange', onControllerChange);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  return null;
}
