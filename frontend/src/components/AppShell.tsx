import { ReactNode, useEffect, useState } from 'react';
import { AnimatedBackground } from './AnimatedBackground';
import { BeachVideoBackground } from './BeachVideoBackground';
import { CelosiaBackground } from './CelosiaBackground';
import { ImageBackground } from './ImageBackground';
import { BgMode, getCustomBgUrl, getPreferences } from '../lib/preferences';

type BackgroundMode = BgMode | 'beach-orbs';

function resolveMode(override?: BackgroundMode): { mode: BgMode; customUrl: string | null } {
  if (override === 'beach-orbs') return { mode: 'beach', customUrl: null };
  if (override) return { mode: override, customUrl: override === 'custom' ? getCustomBgUrl() : null };
  const prefs = getPreferences();
  return { mode: prefs.bgMode, customUrl: getCustomBgUrl() };
}

function BackgroundLayer({ mode, customUrl, variant }: { mode: BgMode; customUrl: string | null; variant: 'full' | 'hero' }) {
  if (mode === 'beach') return <BeachVideoBackground variant={variant} />;
  if (mode === 'celosia') return <CelosiaBackground variant={variant} />;
  if (mode === 'custom' && customUrl) return <ImageBackground src={customUrl} variant={variant} />;
  if (mode === 'custom') return <BeachVideoBackground variant={variant} />;
  return variant === 'full' ? <AnimatedBackground /> : <BeachVideoBackground variant="hero" />;
}

export function AppShell({
  children,
  background
}: {
  children: ReactNode;
  /** Si no se pasa, usa la preferencia del perfil */
  background?: BackgroundMode;
}) {
  const [resolved, setResolved] = useState(() => resolveMode(background));

  useEffect(() => {
    setResolved(resolveMode(background));
    const onPrefs = () => setResolved(resolveMode(background));
    window.addEventListener('reto-prefs', onPrefs);
    window.addEventListener('storage', onPrefs);
    return () => {
      window.removeEventListener('reto-prefs', onPrefs);
      window.removeEventListener('storage', onPrefs);
    };
  }, [background]);

  const { mode, customUrl } = resolved;

  return (
    <div className="relative min-h-dvh">
      <BackgroundLayer mode={mode} customUrl={customUrl} variant="full" />
      {mode === 'orbs' ? null : null}
      <div className="noise-overlay" />
      <div className="relative z-10 min-h-dvh">{children}</div>
    </div>
  );
}

export function HeroSection({ children, className = '' }: { children: ReactNode; className?: string }) {
  const [resolved, setResolved] = useState(() => resolveMode());

  useEffect(() => {
    const onPrefs = () => setResolved(resolveMode());
    window.addEventListener('reto-prefs', onPrefs);
    return () => window.removeEventListener('reto-prefs', onPrefs);
  }, []);

  return (
    <section className={`hero-section ${className}`}>
      <BackgroundLayer mode={resolved.mode} customUrl={resolved.customUrl} variant="hero" />
      <div className="relative z-10">{children}</div>
    </section>
  );
}
