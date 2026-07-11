import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';

type UpdateSW = (reloadPage?: boolean) => Promise<void>;

export function SwUpdateToast() {
  const [needRefresh, setNeedRefresh] = useState(false);
  const [updateSW, setUpdateSW] = useState<UpdateSW | null>(null);

  useEffect(() => {
    let cancelled = false;

    void import('virtual:pwa-register')
      .then(({ registerSW }) => {
        if (cancelled) return;
        const fn = registerSW({
          immediate: true,
          onNeedRefresh() {
            setNeedRefresh(true);
          }
        });
        setUpdateSW(() => fn);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  if (!needRefresh || !updateSW) return null;

  return (
    <div
      className="fixed bottom-[max(5.5rem,env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 z-[100] w-[min(22rem,calc(100vw-2rem))] glass-strong rounded-2xl p-4 shadow-2xl"
      role="status"
    >
      <p className="text-sm font-semibold mb-2">Nueva versión disponible</p>
      <p className="text-xs text-white/50 mb-3">Actualiza para la mejor experiencia.</p>
      <button
        type="button"
        onClick={() => void updateSW(true)}
        className="w-full py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2"
        style={{ background: 'linear-gradient(135deg, #8338ec, #ff006e)' }}
      >
        <RefreshCw size={16} /> Actualizar ahora
      </button>
    </div>
  );
}
