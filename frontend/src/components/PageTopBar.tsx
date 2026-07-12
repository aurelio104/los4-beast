import { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';

export function PageTopBar({
  onBack,
  backLabel = 'Hub',
  children
}: {
  onBack: () => void;
  backLabel?: string;
  children?: ReactNode;
}) {
  return (
    <header className="page-top-bar">
      <button type="button" onClick={onBack} className="page-back-btn" aria-label={`Volver a ${backLabel}`}>
        <ArrowLeft size={18} aria-hidden />
        <span>{backLabel}</span>
      </button>
      {children}
    </header>
  );
}
