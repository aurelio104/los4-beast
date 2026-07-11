import { useEffect, useRef, useState } from 'react';
import { getPreferences } from '../lib/preferences';
import { api } from '../lib/api';

const FALLBACK_BGM = '/audio/reto-bgm.mp3';

export type NowPlaying = {
  title: string;
  submittedBy: string;
  audioUrl: string;
} | null;

/** Música comunitaria (optimizada en servidor) + fallback playa. */
export function BackgroundMusic() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const nodesRef = useRef<{ osc: OscillatorNode[]; gain: GainNode } | null>(null);
  const [on, setOn] = useState(() => getPreferences().music);
  const [booted, setBooted] = useState(false);
  const [src, setSrc] = useState(FALLBACK_BGM);
  const [hasCommunityTrack, setHasCommunityTrack] = useState(false);
  const [audioReady, setAudioReady] = useState(false);

  const loadRadio = async () => {
    try {
      const r = await api.radioCurrent();
      if (r.success && r.track?.audioUrl) {
        setSrc(r.track.audioUrl);
        setHasCommunityTrack(true);
      } else {
        setSrc(FALLBACK_BGM);
        setHasCommunityTrack(false);
      }
    } catch {
      setSrc(FALLBACK_BGM);
      setHasCommunityTrack(false);
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
    audio.src = src;
    audio.load();
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
  }, [on, booted, hasCommunityTrack, audioReady, src]);

  return null;
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
            audioUrl: r.track.audioUrl
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
