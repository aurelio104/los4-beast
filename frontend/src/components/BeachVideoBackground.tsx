import { CSSProperties, useEffect, useRef, useState } from 'react';

type BeachVariant = 'full' | 'hero';

interface BeachVideoBackgroundProps {
  variant?: BeachVariant;
  className?: string;
}

const POSTER = '/wallpapers/beach-poster.jpg';
const VIDEO = '/wallpapers/beach-720.mp4';

export function BeachVideoBackground({ variant = 'full', className = '' }: BeachVideoBackgroundProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [motionOk, setMotionOk] = useState(true);
  const [videoReady, setVideoReady] = useState(false);

  const isHero = variant === 'hero';

  const wrapStyle: CSSProperties = isHero
    ? { position: 'absolute', inset: 0, zIndex: 0 }
    : { position: 'fixed', inset: 0, zIndex: 0 };

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setMotionOk(!mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !motionOk) return;

    const play = () => {
      video.play().catch(() => {
        /* autoplay bloqueado — poster visible */
      });
    };

    if (video.readyState >= 2) play();
    else video.addEventListener('loadeddata', play, { once: true });

    return () => video.removeEventListener('loadeddata', play);
  }, [motionOk]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isHero) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!motionOk) return;
        if (entry.isIntersecting) video.play().catch(() => {});
        else video.pause();
      },
      { threshold: 0.15 }
    );

    observer.observe(video);
    return () => observer.disconnect();
  }, [isHero, motionOk]);

  return (
    <div className={`overflow-hidden pointer-events-none ${className}`} style={wrapStyle} aria-hidden>
      <img
        src={POSTER}
        alt=""
        decoding="async"
        fetchPriority={isHero ? 'high' : 'auto'}
        loading={isHero ? 'eager' : 'lazy'}
        className="absolute inset-0 w-full h-full object-cover object-center scale-[1.02]"
        style={{ filter: 'saturate(1.08) contrast(1.04)' }}
      />

      {motionOk && (
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover object-center scale-[1.02] transition-opacity duration-700"
          style={{
            opacity: videoReady ? 1 : 0,
            filter: 'saturate(1.08) contrast(1.04)'
          }}
          autoPlay
          muted
          loop
          playsInline
          preload={isHero ? 'auto' : 'metadata'}
          poster={POSTER}
          onLoadedData={() => setVideoReady(true)}
        >
          <source src={VIDEO} type="video/mp4" />
        </video>
      )}

      <div
        className="absolute inset-0"
        style={{
          background: isHero
            ? 'linear-gradient(180deg, rgba(5,5,12,0.3) 0%, rgba(5,5,12,0.5) 55%, rgba(5,5,12,0.92) 100%)'
            : 'linear-gradient(180deg, rgba(5,5,12,0.4) 0%, rgba(5,5,12,0.6) 40%, rgba(5,5,12,0.88) 100%)'
        }}
      />

      <div
        className="absolute inset-0 opacity-35 mix-blend-soft-light"
        style={{
          background: 'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(56,189,248,0.2) 0%, transparent 60%)'
        }}
      />
    </div>
  );
}
