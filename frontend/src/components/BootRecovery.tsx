import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { hardRecoverCaches } from '../lib/chunkRecovery';

type BootRecoveryProps = {
  /** Tiempo antes de mostrar recuperación manual (ms). */
  delayMs?: number;
  /** Mensaje bajo el logo. */
  message?: string;
};

export function BootRecovery({ delayMs = 10000, message }: BootRecoveryProps) {
  const [stuck, setStuck] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setStuck(true), delayMs);
    return () => window.clearTimeout(timer);
  }, [delayMs]);

  if (!stuck) return null;

  const recover = async () => {
    setBusy(true);
    try {
      await hardRecoverCaches();
      window.location.reload();
    } catch {
      window.location.reload();
    }
  };

  return (
    <div className="mt-6 flex flex-col items-center gap-3 text-center max-w-xs">
      <p className="text-sm text-white/60">
        {message || 'La carga está tardando más de lo normal.'}
      </p>
      <button
        type="button"
        disabled={busy}
        onClick={() => void recover()}
        className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/15 disabled:opacity-60"
      >
        <RefreshCw size={16} className={busy ? 'animate-spin' : undefined} />
        {busy ? 'Recuperando…' : 'Recargar app'}
      </button>
      <p className="text-[11px] text-white/35 leading-snug">
        Si sigue igual, cierra la pestaña y vuelve a abrir Reto desde Safari.
      </p>
    </div>
  );
}
