import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Music2, X } from 'lucide-react';
import { getPreferences, setPreferences } from '../lib/preferences';
import { api } from '../lib/api';

export type NowPlaying = {
  title: string;
  submittedBy: string;
  audioUrl: string;
  sourceType?: string;
  youtubeVideoId?: string | null;
} | null;

type RadioTrack = {
  title: string;
  audioUrl: string;
  sourceType: string;
  youtubeVideoId?: string | null;
  submittedBy: string;
};

function youtubeEmbedSrc(videoId: string): string {
  const params = new URLSearchParams({
    autoplay: '1',
    controls: '0',
    disablekb: '1',
    fs: '0',
    iv_load_policy: '3',
    loop: '1',
    modestbranding: '1',
    playsinline: '1',
    playlist: videoId,
    rel: '0'
  });
  return `https://www.youtube-nocookie.com/embed/${videoId}?${params}`;
}

function trackNudgeKey(track: Pick<RadioTrack, 'title' | 'audioUrl' | 'youtubeVideoId'>): string {
  return `reto_music_nudge:${track.youtubeVideoId || track.audioUrl || track.title}`;
}

/** Música comunitaria (MP3 en servidor o link YouTube) + fallback ambiente. */
export function BackgroundMusic() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const nodesRef = useRef<{ osc: OscillatorNode[]; gain: GainNode } | null>(null);
  const [on, setOn] = useState(() => getPreferences().music);
  const [booted, setBooted] = useState(false);
  const [src, setSrc] = useState<string | null>(null);
  const [youtubeVideoId, setYoutubeVideoId] = useState<string | null>(null);
  const [hasCommunityTrack, setHasCommunityTrack] = useState(false);
  const [trackMeta, setTrackMeta] = useState<{ title: string; by: string } | null>(null);
  const [audioReady, setAudioReady] = useState(false);
  const [showMuteNudge, setShowMuteNudge] = useState(false);

  const applyTrack = (track: RadioTrack | null) => {
    if (!track) {
      setSrc(null);
      setYoutubeVideoId(null);
      setHasCommunityTrack(false);
      setTrackMeta(null);
      return;
    }
    setTrackMeta({ title: track.title, by: track.submittedBy });
    if (track.sourceType === 'youtube' && track.youtubeVideoId) {
      setSrc(null);
      setYoutubeVideoId(track.youtubeVideoId);
      setHasCommunityTrack(true);
      return;
    }
    if (track.audioUrl) {
      setYoutubeVideoId(null);
      setSrc(track.audioUrl);
      setHasCommunityTrack(true);
      return;
    }
    setSrc(null);
    setYoutubeVideoId(null);
    setHasCommunityTrack(false);
    setTrackMeta(null);
  };

  const loadRadio = async () => {
    try {
      const r = await api.radioCurrent();
      if (r.success && r.track) {
        applyTrack({
          title: r.track.title,
          audioUrl: r.track.audioUrl,
          sourceType: r.track.sourceType,
          youtubeVideoId: r.track.youtubeVideoId,
          submittedBy: r.track.submittedBy
        });
      } else {
        applyTrack(null);
      }
    } catch {
      applyTrack(null);
    }
  };

  useEffect(() => {
    void loadRadio();
    const id = window.setInterval(() => void loadRadio(), 60_000);
    const onRadio = () => void loadRadio();
    window.addEventListener('reto-radio-updated', onRadio);
    return () => {
      window.clearInterval(id);
      window.removeEventListener('reto-radio-updated', onRadio);
    };
  }, []);

  useEffect(() => {
    const boot = () => setBooted(true);
    window.addEventListener('pointerdown', boot, { once: true, passive: true });
    window.addEventListener('keydown', boot, { once: true });
    const t = window.setTimeout(boot, 2800);
    return () => {
      window.clearTimeout(t);
    };
  }, []);

  useEffect(() => {
    const onPrefs = () => setOn(getPreferences().music);
    window.addEventListener('reto-prefs', onPrefs);
    return () => window.removeEventListener('reto-prefs', onPrefs);
  }, []);

  useEffect(() => {
    if (!hasCommunityTrack || on || !trackMeta) {
      setShowMuteNudge(false);
      return;
    }
    const key = trackNudgeKey({
      title: trackMeta.title,
      audioUrl: src || '',
      youtubeVideoId
    });
    try {
      if (sessionStorage.getItem(key) === '1') {
        setShowMuteNudge(false);
        return;
      }
    } catch {
      /* private mode */
    }
    setShowMuteNudge(true);
  }, [hasCommunityTrack, on, trackMeta, src, youtubeVideoId]);

  const dismissMuteNudge = () => {
    setShowMuteNudge(false);
    if (!trackMeta) return;
    const key = trackNudgeKey({
      title: trackMeta.title,
      audioUrl: src || '',
      youtubeVideoId
    });
    try {
      sessionStorage.setItem(key, '1');
    } catch {
      /* ignore */
    }
  };

  const enableMusic = () => {
    setPreferences({ music: true });
    setOn(true);
    dismissMuteNudge();
  };

  useEffect(() => {
    if (!booted) return;

    const audio = new Audio();
    audio.loop = true;
    audio.volume = 0.32;
    audio.preload = 'none';
    audioRef.current = audio;

    const onReady = () => setAudioReady(true);
    const onErr = () => setAudioReady(false);
    audio.addEventListener('canplaythrough', onReady);
    audio.addEventListener('error', onErr);

    return () => {
      audio.pause();
      audio.removeEventListener('canplaythrough', onReady);
      audio.removeEventListener('error', onErr);
      stopAmbient();
      audioRef.current = null;
    };
  }, [booted]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !booted) return;
    setAudioReady(false);
    if (src) {
      audio.src = src;
      audio.load();
      return;
    }
    audio.pause();
    audio.removeAttribute('src');
  }, [src, booted]);

  const stopAmbient = () => {
    nodesRef.current?.osc.forEach((o) => {
      try {
        o.stop();
      } catch {
        /* stopped */
      }
    });
    nodesRef.current = null;
    if (ctxRef.current) {
      ctxRef.current.close().catch(() => {});
      ctxRef.current = null;
    }
  };

  const startAmbient = async () => {
    stopAmbient();
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    ctxRef.current = ctx;
    const master = ctx.createGain();
    master.gain.value = 0.04;
    master.connect(ctx.destination);
    [110, 164.81, 220].forEach((f, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = i === 0 ? 'sine' : 'triangle';
      osc.frequency.value = f;
      g.gain.value = i === 0 ? 0.7 : 0.25;
      osc.connect(g);
      g.connect(master);
      osc.start();
    });
  };

  useEffect(() => {
    if (!booted || !on) {
      audioRef.current?.pause();
      stopAmbient();
      return;
    }

    if (youtubeVideoId) {
      audioRef.current?.pause();
      stopAmbient();
      return;
    }

    const audio = audioRef.current;
    if (hasCommunityTrack && audio && audioReady) {
      stopAmbient();
      audio.play().catch(() => {});
      return;
    }

    if (!hasCommunityTrack) {
      audio?.pause();
      startAmbient().catch(() => {});
    }
  }, [on, booted, hasCommunityTrack, audioReady, src, youtubeVideoId]);

  const playYoutube = on && booted && !!youtubeVideoId;

  return (
    <>
      {playYoutube ? (
        <iframe
          key={youtubeVideoId}
          title="Radio Reto"
          src={youtubeEmbedSrc(youtubeVideoId!)}
          allow="autoplay; encrypted-media"
          className="pointer-events-none fixed opacity-0"
          style={{ width: 1, height: 1, border: 0, left: -9999, top: -9999 }}
        />
      ) : null}

      <AnimatePresence>
        {showMuteNudge && trackMeta && (
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            className="fixed left-1/2 -translate-x-1/2 z-[86] w-[min(22rem,calc(100vw-2rem))] glass-strong rounded-2xl px-4 py-3 shadow-2xl border border-reto-cyan/35 toast-bottom-safe"
            role="status"
          >
            <div className="flex items-start gap-3">
              <Music2 size={20} className="text-reto-cyan shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold leading-tight">Hay música en el Reto</p>
                <p className="text-xs text-white/65 mt-1 line-clamp-2">
                  Activa el sonido para escuchar «{trackMeta.title}»
                  {trackMeta.by ? ` · ${trackMeta.by}` : ''}
                </p>
                <button
                  type="button"
                  onClick={enableMusic}
                  className="mt-2.5 w-full py-2 rounded-xl text-sm font-bold btn-primary"
                >
                  Activar sonido
                </button>
              </div>
              <button
                type="button"
                className="text-white/40 min-w-[36px] min-h-[36px] flex items-center justify-center shrink-0"
                onClick={dismissMuteNudge}
                aria-label="Cerrar"
              >
                <X size={14} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export function useNowPlaying(): NowPlaying {
  const [nowPlaying, setNowPlaying] = useState<NowPlaying>(null);
  useEffect(() => {
    const load = () => {
      void api.radioCurrent().then((r) => {
        if (r.success && r.track) {
          setNowPlaying({
            title: r.track.title,
            submittedBy: r.track.submittedBy,
            audioUrl: r.track.audioUrl,
            sourceType: r.track.sourceType,
            youtubeVideoId: r.track.youtubeVideoId
          });
        } else setNowPlaying(null);
      });
    };
    load();
    window.addEventListener('reto-radio-updated', load);
    return () => window.removeEventListener('reto-radio-updated', load);
  }, []);
  return nowPlaying;
}
