import { useEffect, useRef, useCallback } from 'react';

/** Polling que se pausa con la pestaña oculta o sin conexión. */
export function useLivePoll(callback: () => void | Promise<void>, intervalMs = 30000, enabled = true) {
  const cbRef = useRef(callback);
  cbRef.current = callback;

  const tick = useCallback(async () => {
    if (typeof document !== 'undefined' && document.hidden) return;
    if (typeof navigator !== 'undefined' && !navigator.onLine) return;
    await cbRef.current();
  }, []);

  useEffect(() => {
    if (!enabled) return;

    tick();
    const id = setInterval(tick, intervalMs);

    const onVisible = () => {
      if (!document.hidden) void tick();
    };
    const onOnline = () => void tick();

    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('online', onOnline);

    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('online', onOnline);
    };
  }, [tick, intervalMs, enabled]);
}
