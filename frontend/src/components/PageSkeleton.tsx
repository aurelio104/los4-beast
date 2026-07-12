/** Skeleton genérico mientras hidrata una página. */
export function PageSkeleton({ lines = 4 }: { lines?: number }) {
  return (
    <div className="space-y-4 animate-pulse" aria-hidden>
      <div className="h-8 w-40 rounded-xl bg-white/8" />
      <div className="h-4 w-56 rounded-lg bg-white/5" />
      {Array.from({ length: lines }, (_, i) => (
        <div key={i} className="h-20 rounded-3xl bg-white/5" />
      ))}
    </div>
  );
}
