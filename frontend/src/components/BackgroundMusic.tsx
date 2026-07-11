import { useEffect, useRef, useState } from 'react';
import { getPreferences } from '../lib/preferences';

const BGM_SRC = '/audio/reto-bgm.mp3';

/** Reproduce música según la preferencia del perfil (sin botón flotante). */
export function BackgroundMusic() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const nodesRef = useRef<{ osc: OscillatorNode[]; gain: GainNode } | null>(null);
  const [on, setOn] = useState(() => getPreferences().music);
  const [useFile, setUseFile] = useState(false);

  useEffect(() => {
    const audio = new Audio(BGM_SRC);
    audio.loop = true;
    audio.volume = 0.32;
    audio.preload = 'metadata';
    audioRef.current = audio;

    const onReady = () => setUseFile(true);
    const onError = () => setUseFile(false);
    audio.addEventListener('canplaythrough', onReady);
    audio.addEventListener('error', onError);

    const onPrefs = () => setOn(getPreferences().music);
    window.addEventListener('reto-prefs', onPrefs);

    return () => {
      audio.pause();
      audio.removeEventListener('canplaythrough', onReady);
      audio.removeEventListener('error', onError);
      window.removeEventListener('reto-prefs', onPrefs);
      stopAmbient();
      audioRef.current = null;
    };
  }, []);

  const stopAmbient = () => {
    nodesRef.current?.osc.forEach((o) => {
      try {
        o.stop();
      } catch {
        /* already stopped */
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

    const freqs = [110, 164.81, 220];
    const oscs = freqs.map((f, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = i === 0 ? 'sine' : 'triangle';
      osc.frequency.value = f;
      g.gain.value = i === 0 ? 0.7 : 0.25;
      osc.connect(g);
      g.connect(master);
      osc.start();
      return osc;
    });
    nodesRef.current = { osc: oscs, gain: master };
  };

  useEffect(() => {
    const audio = audioRef.current;

    if (!on) {
      audio?.pause();
      stopAmbient();
      return;
    }

    if (useFile && audio) {
      stopAmbient();
      audio.play().catch(() => {});
    } else {
      audio?.pause();
      startAmbient().catch(() => {});
    }
  }, [on, useFile]);

  return null;
}
