import { CSSProperties, useEffect, useRef, useState } from 'react';

type BeachVariant = 'full' | 'hero';

interface BeachVideoBackgroundProps {
  variant?: BeachVariant;
  className?: string;
}

const POSTER = '/wallpapers/beach-poster.jpg';
const VIDEO_720 = '/wallpapers/beach-720.mp4';
const VIDEO_480 = '/wallpapers/beach-480.mp4';

function prefersSaveData(): boolean {
  if (typeof navigator === 'undefined') return false;
  const conn = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  if (conn?.saveData) return true;
  return conn?.effectiveType === 'slow-2g' || conn?.effectiveType === '2g' || conn?.effectiveType === '3g';
}

function pickVideoSrc(): string {
  if (typeof window === 'undefined') return VIDEO_720;
  const narrow = window.matchMedia('(max-width: 480px)').matches;
  const lowMem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  if (narrow || (lowMem != null && lowMem <= 4)) return VIDEO_480;
  return VIDEO_720;
}

export function BeachVideoBackground({ variant = 'full', className = '' }: BeachVideoBackgroundProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [motionOk, setMotionOk] = useState(true);
  const [videoReady, setVideoReady] = useState(false);
  const [allowVideo, setAllowVideo] = useState(() => !prefersSaveData());
  const [videoSrc, setVideoSrc] = useState(VIDEO_720);
  const [deferVideo, setDeferVideo] = useState(false);

  const isHero = variant === 'hero';

  const wrapStyle: CSSProperties = isHero
    ? { position: 'absolute', inset: 0, zIndex: 0 }
    : { position: 'fixed', inset: 0, zIndex: 0 };

  useEffect(() => {
    setVideoSrc(pickVideoSrc());
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const dataMq = window.matchMedia('(prefers-reduced-data: reduce)');
    const update = () => {
      setMotionOk(!mq.matches);
      if (dataMq.matches || prefersSaveData()) setAllowVideo(false);
    };
    update();
    mq.addEventListener('change', update);
    dataMq.addEventListener('change', update);
    return () => {
      mq.removeEventListener('change', update);
      dataMq.removeEventListener('change', update);
    };
  }, []);

  useEffect(() => {
    if (!allowVideo) setDeferVideo(false);
  }, [allowVideo]);

  useEffect(() => {
    const root = wrapRef.current;
    if (!root || !allowVideo || !motionOk || deferVideo) return;

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
  }, [allowVideo, motionOk, deferVideo]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !motionOk || !allowVideo || deferVideo) return;

    const play = () => {
      if (!document.hidden) video.play().catch(() => {});
    };

    if (video.readyState >= 2) play();
    else video.addEventListener('loadeddata', play, { once: true });

    return () => video.removeEventListener('loadeddata', play);
  }, [motionOk, allowVideo, deferVideo, videoSrc]);

  const showVideo = motionOk && allowVideo && !deferVideo;

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

      {showVideo && (
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
          <source src={videoSrc} type="video/mp4" />
          {videoSrc !== VIDEO_720 && <source src={VIDEO_720} type="video/mp4" />}
        </video>
      )}

      <div
        className="absolute inset-0"
        style={{
          background: isHero
            ? 'linear-gradient(180deg, rgba(5,5,12,0.3) 0%, rgba(5,5,12,0.5) 55%, rgba(5,5,12,0.92) 100%)'
            : 'linear-gradient(180deg, rgba(5,5,12,0.12) 0%, rgba(5,5,12,0.28) 45%, rgba(5,5,12,0.65) 100%)'
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
