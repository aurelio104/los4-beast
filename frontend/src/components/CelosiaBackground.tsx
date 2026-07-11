import { CSSProperties } from 'react';

type CelosiaVariant = 'full' | 'hero';

interface CelosiaBackgroundProps {
  variant?: CelosiaVariant;
  className?: string;
}

const darkAvif = {
  128: '/wallpapers/celosia-dark-128.avif',
  640: '/wallpapers/celosia-dark-640.avif',
  1280: '/wallpapers/celosia-dark-1280.avif',
  1920: '/wallpapers/celosia-dark-1920.avif'
};

const darkJpg = {
  640: '/wallpapers/celosia-dark-640.jpg',
  1280: '/wallpapers/celosia-dark-1280.jpg'
};

export function CelosiaBackground({ variant = 'full', className = '' }: CelosiaBackgroundProps) {
  const isHero = variant === 'hero';

  const wrapStyle: CSSProperties = isHero
    ? { position: 'absolute', inset: 0, zIndex: 0 }
    : { position: 'fixed', inset: 0, zIndex: 0 };

  return (
    <div className={`overflow-hidden pointer-events-none ${className}`} style={wrapStyle} aria-hidden>
      <picture className="absolute inset-0 w-full h-full">
        <source
          type="image/avif"
          media="(prefers-color-scheme: light)"
          srcSet={`/wallpapers/celosia-light-1280.avif 1280w`}
        />
        <source
          type="image/avif"
          srcSet={`${darkAvif[128]} 128w, ${darkAvif[640]} 640w, ${darkAvif[1280]} 1280w, ${darkAvif[1920]} 1920w`}
          sizes={isHero ? '100vw' : '100vw'}
        />
        <source
          type="image/jpeg"
          srcSet={`${darkJpg[640]} 640w, ${darkJpg[1280]} 1280w`}
          sizes="100vw"
        />
        <img
          src={darkJpg[1280]}
          alt=""
          decoding="async"
          fetchPriority={isHero ? 'high' : 'auto'}
          loading={isHero ? 'eager' : 'lazy'}
          className="absolute inset-0 w-full h-full object-cover object-center scale-[1.02]"
          style={{ filter: 'saturate(1.05) contrast(1.02)' }}
        />
      </picture>

      {/* Overlay para legibilidad del glass UI */}
      <div
        className="absolute inset-0"
        style={{
          background: isHero
            ? 'linear-gradient(180deg, rgba(5,5,12,0.35) 0%, rgba(5,5,12,0.55) 55%, rgba(5,5,12,0.92) 100%)'
            : 'linear-gradient(180deg, rgba(5,5,12,0.45) 0%, rgba(5,5,12,0.65) 40%, rgba(5,5,12,0.88) 100%)'
        }}
      />

      {/* Brillo sutil estilo iOS */}
      <div
        className="absolute inset-0 opacity-40 mix-blend-soft-light"
        style={{
          background: 'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(131,56,236,0.25) 0%, transparent 60%)'
        }}
      />
    </div>
  );
}
