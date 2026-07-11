/** Pantalla ligera mientras carga una ruta lazy. */
export function RouteFallback() {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center gap-4 bg-[#050508] px-6">
      <img src="/logoR.png" alt="" width={72} height={72} className="w-[4.5rem] h-[4.5rem] opacity-90 animate-pulse" decoding="async" />
      <div className="h-1 w-28 rounded-full shimmer-bar" aria-hidden />
      <p className="text-xs text-white/35 sr-only">Cargando…</p>
    </div>
  );
}
