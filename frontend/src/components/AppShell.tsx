import { ReactNode } from 'react';
import { AnimatedBackground } from './AnimatedBackground';
import { BeachVideoBackground } from './BeachVideoBackground';

type BackgroundMode = 'orbs' | 'beach' | 'beach-orbs';

export function AppShell({
  children,
  background = 'orbs'
}: {
  children: ReactNode;
  background?: BackgroundMode;
}) {
  return (
    <div className="relative min-h-dvh">
      {background === 'beach' && <BeachVideoBackground variant="full" />}
      {background === 'beach-orbs' && (
        <>
          <BeachVideoBackground variant="full" />
          <div className="fixed inset-0 pointer-events-none opacity-30" style={{ zIndex: 1 }}>
            <AnimatedBackground />
          </div>
        </>
      )}
      {background === 'orbs' && <AnimatedBackground />}
      <div className="noise-overlay" />
      <div className="relative z-10 min-h-dvh">{children}</div>
    </div>
  );
}

export function HeroSection({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <section className={`relative overflow-hidden rounded-b-[2rem] -mx-4 px-4 pt-2 pb-6 mb-5 ${className}`}>
      <BeachVideoBackground variant="hero" />
      <div className="relative z-10">{children}</div>
    </section>
  );
}
