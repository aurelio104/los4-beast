import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { ensurePushPersisted } from '../lib/push-sync';
import { isIOS, isStandalone } from '../lib/pwa';

type UpdateSW = (reloadPage?: boolean) => Promise<void>;

function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem('user') || '{}') as { id?: string; pushOptIn?: boolean };
  } catch {
    return null;
  }
}

function scheduleIdle(fn: () => void) {
  const delay = isIOS() ? 5000 : 1500;
  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    window.requestIdleCallback(fn, { timeout: delay + 2000 });
  } else {
    globalThis.setTimeout(fn, delay);
  }
}

export function SwUpdateToast() {
  const [needRefresh, setNeedRefresh] = useState(false);
  const [updateSW, setUpdateSW] = useState<UpdateSW | null>(null);

  useEffect(() => {
    let cancelled = false;

    const register = () => {
      scheduleIdle(() => {
        void import('virtual:pwa-register')
        .then(({ registerSW }) => {
          if (cancelled) return;
          const fn = registerSW({
            immediate: true,
            onNeedRefresh() {
              if (isIOS() || isStandalone()) {
                void ensurePushPersisted(getStoredUser()).finally(() => {
                  void fn(true);
                });
                return;
              }
              setNeedRefresh(true);
            },
            onRegisteredSW(_swUrl, registration) {
              registration?.addEventListener('updatefound', () => {
                const worker = registration.installing;
                worker?.addEventListener('statechange', () => {
                  if (worker.state === 'activated') {
                    void ensurePushPersisted(getStoredUser());
                  }
                });
              });
            }
          });
          setUpdateSW(() => fn);
        })
        .catch(() => {});
      });
    };

    if (document.readyState === 'complete') register();
    else window.addEventListener('load', register, { once: true });

    return () => {
      cancelled = true;
    };
  }, []);

  if (!needRefresh || !updateSW) return null;

  const applyUpdate = async () => {
    await ensurePushPersisted(getStoredUser());
    await updateSW(true);
  };

  return (
    <div
      className="fixed bottom-[max(5.5rem,env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 z-[100] w-[min(22rem,calc(100vw-2rem))] glass-strong rounded-2xl p-4 shadow-2xl"
      role="status"
    >
      <p className="text-sm font-semibold mb-2">Nueva versión disponible</p>
      <p className="text-xs text-white/50 mb-3">Actualiza para la mejor experiencia. Tus notificaciones se mantienen.</p>
      <button
        type="button"
        onClick={() => void applyUpdate()}
        className="w-full py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 btn-primary"
      >
        <RefreshCw size={16} /> Actualizar ahora
      </button>
    </div>
  );
}
