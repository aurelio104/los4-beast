/** Fondo ligero para login/join — solo poster, sin video ni AppShell. */
export function AuthBackdrop() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none" aria-hidden>
      <img
        src="/wallpapers/beach-poster.jpg"
        alt=""
        decoding="async"
        fetchPriority="high"
        className="absolute inset-0 w-full h-full object-cover scale-[1.02]"
        style={{ filter: 'saturate(1.05) contrast(1.03)' }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, rgba(5,5,12,0.55) 0%, rgba(5,5,12,0.72) 45%, rgba(5,5,12,0.94) 100%)'
        }}
      />
    </div>
  );
}
