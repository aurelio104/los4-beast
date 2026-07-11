import { CSSProperties, useEffect, useRef, useState } from 'react';

type BeachVariant = 'full' | 'hero';

interface BeachVideoBackgroundProps {
  variant?: BeachVariant;
  className?: string;
}

const POSTER = '/wallpapers/beach-poster.jpg';
const VIDEO = '/wallpapers/beach-720.mp4';

function prefersSaveData(): boolean {
  if (typeof navigator === 'undefined') return false;
  const conn = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  if (conn?.saveData) return true;
  return conn?.effectiveType === 'slow-2g' || conn?.effectiveType === '2g';
}

export function BeachVideoBackground({ variant = 'full', className = '' }: BeachVideoBackgroundProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [motionOk, setMotionOk] = useState(true);
  const [videoReady, setVideoReady] = useState(false);
  const [allowVideo, setAllowVideo] = useState(() => !prefersSaveData());

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
    const root = wrapRef.current;
    if (!root || !allowVideo || !motionOk) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        const video = videoRef.current;
        if (!video) return;
        if (entry.isIntersecting) {
          video.play().catch(() => {});
        } else {
          video.pause();
        }
      },
      { threshold: 0.08, rootMargin: '40px' }
    );

    observer.observe(root);
    return () => observer.disconnect();
  }, [allowVideo, motionOk]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !motionOk || !allowVideo) return;

    const play = () => {
      if (!document.hidden) video.play().catch(() => {});
    };

    if (video.readyState >= 2) play();
    else video.addEventListener('loadeddata', play, { once: true });

    return () => video.removeEventListener('loadeddata', play);
  }, [motionOk, allowVideo]);

  return (
    <div ref={wrapRef} className={`overflow-hidden pointer-events-none ${className}`} style={wrapStyle} aria-hidden>
      <img
        src={POSTER}
        alt=""
        decoding="async"
        fetchPriority={isHero ? 'high' : 'low'}
        loading={isHero ? 'eager' : 'lazy'}
        className="absolute inset-0 w-full h-full object-cover object-center scale-[1.02]"
        style={{ filter: 'saturate(1.08) contrast(1.04)' }}
      />

      {motionOk && allowVideo && (
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover object-center scale-[1.02] transition-opacity duration-700"
          style={{
            opacity: videoReady ? 1 : 0,
            filter: 'saturate(1.08) contrast(1.04)'
          }}
          muted
          loop
          playsInline
          preload={isHero ? 'metadata' : 'none'}
          poster={POSTER}
          onLoadedData={() => {
            setVideoReady(true);
            videoRef.current?.play().catch(() => {});
          }}
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
