import { WifiOff } from 'lucide-react';

export function OfflineBanner({ online }: { online: boolean }) {
  if (online) return null;

  return (
    <div
      className="offline-banner fixed top-0 inset-x-0 z-[100] bg-reto-red/90 backdrop-blur-md px-4 py-2 flex items-center justify-center gap-2 text-sm font-semibold pt-safe"
      role="status"
    >
      <WifiOff size={16} aria-hidden />
      Sin conexión — reconectando...
    </div>
  );
}
