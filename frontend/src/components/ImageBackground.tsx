import { CSSProperties } from 'react';

type Variant = 'full' | 'hero';

export function ImageBackground({
  src,
  variant = 'full',
  className = ''
}: {
  src: string;
  variant?: Variant;
  className?: string;
}) {
  const isHero = variant === 'hero';
  const wrapStyle: CSSProperties = isHero
    ? { position: 'absolute', inset: 0, zIndex: 0 }
    : { position: 'fixed', inset: 0, zIndex: 0 };

  return (
    <div className={`overflow-hidden pointer-events-none ${className}`} style={wrapStyle} aria-hidden>
      <img
        src={src}
        alt=""
        decoding="async"
        className="absolute inset-0 w-full h-full object-cover object-center scale-[1.02]"
      />
      <div
        className="absolute inset-0"
        style={{
          background: isHero
            ? 'linear-gradient(180deg, rgba(5,5,12,0.35) 0%, rgba(5,5,12,0.55) 55%, rgba(5,5,12,0.92) 100%)'
            : 'linear-gradient(180deg, rgba(5,5,12,0.45) 0%, rgba(5,5,12,0.65) 40%, rgba(5,5,12,0.9) 100%)'
        }}
      />
    </div>
  );
}
