import { useEffect, useRef, useCallback } from 'react';

export function useLivePoll(callback: () => void | Promise<void>, intervalMs = 30000, enabled = true) {
  const cbRef = useRef(callback);
  cbRef.current = callback;

  const tick = useCallback(async () => {
    await cbRef.current();
  }, []);

  useEffect(() => {
    if (!enabled) return;
    tick();
    const id = setInterval(tick, intervalMs);
    return () => clearInterval(id);
  }, [tick, intervalMs, enabled]);
}
