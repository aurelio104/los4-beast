import { BootRecovery } from './BootRecovery';

/** Pantalla ligera mientras carga una ruta lazy. */
export function RouteFallback() {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center gap-4 bg-[#050508] px-6">
      <div className="relative">
        <div className="absolute inset-0 rounded-full bg-reto-purple/30 blur-2xl animate-pulse" aria-hidden />
        <img
          src="/logoR.png"
          alt=""
          width={72}
          height={72}
          className="relative w-[4.5rem] h-[4.5rem] opacity-95 drop-shadow-[0_0_24px_rgba(131,56,236,0.5)]"
          decoding="async"
        />
      </div>
      <div className="h-1.5 w-32 rounded-full shimmer-bar" aria-hidden />
      <p className="text-xs text-white/45 sr-only">Cargando…</p>
      <BootRecovery message="No termina de cargar esta pantalla." />
    </div>
  );
}
