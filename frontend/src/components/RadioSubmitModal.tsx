import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Music2, Upload, Link2, Loader2, X, Radio } from 'lucide-react';
import { GlassCard } from './GlassCard';
import { api } from '../lib/api';

type Props = {
  open: boolean;
  onClose: () => void;
  onSuccess?: (msg: string) => void;
  currentDj?: string | null;
  currentTitle?: string | null;
};

const ACCEPT = 'audio/mpeg,audio/mp4,audio/x-m4a,audio/wav,audio/ogg,audio/webm,audio/aac,.mp3,.m4a,.wav,.ogg,.webm,.aac';

export function RadioSubmitModal({ open, onClose, onSuccess, currentDj, currentTitle }: Props) {
  const [mode, setMode] = useState<'file' | 'youtube'>('file');
  const [title, setTitle] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const reset = () => {
    setTitle('');
    setYoutubeUrl('');
    setFile(null);
    setError('');
    setMode('file');
  };

  const close = () => {
    if (loading) return;
    reset();
    onClose();
  };

  const submit = async () => {
    setError('');
    if (title.trim().length < 2) {
      setError('Indica el nombre de la canción');
      return;
    }
    setLoading(true);
    try {
      const form = new FormData();
      form.append('title', title.trim());
      if (mode === 'youtube') {
        if (!youtubeUrl.trim()) throw new Error('Pega el link de YouTube');
        form.append('youtubeUrl', youtubeUrl.trim());
      } else {
        if (!file) throw new Error('Elige un archivo de audio');
        form.append('audio', file);
      }

      const res = await api.submitRadio(form);
      if (!res.success) throw new Error(res.error || 'No se pudo subir');

      const pts = res.gained ? ` +${res.gained} Puntos` : '';
      onSuccess?.(`🎵 ¡Tu tema suena para todos!${pts}`);
      window.dispatchEvent(new CustomEvent('reto-radio-updated'));
      close();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={close}
        >
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 24, opacity: 0 }}
            transition={{ type: 'spring', damping: 26, stiffness: 320 }}
            className="w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <GlassCard strong glow="purple" className="p-5 bg-black/40">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <p className="text-lg font-black flex items-center gap-2">
                    <Radio size={20} className="text-reto-cyan" /> DJ del Reto
                  </p>
                  <p className="text-xs text-white/50 mt-1 leading-relaxed">
                    Sube audio o un link de YouTube. Se optimiza a MP3 ligero — todos la escuchan al abrir la app. <strong className="text-reto-gold">+75 Puntos</strong> · 1 vez al día.
                  </p>
                </div>
                <button type="button" onClick={close} className="glass-btn p-2 rounded-xl" aria-label="Cerrar">
                  <X size={18} />
                </button>
              </div>

              {currentTitle && (
                <p className="text-xs text-white/45 mb-3 p-2 rounded-xl bg-white/5">
                  Sonando: <span className="text-white/80 font-semibold">{currentTitle}</span>
                  {currentDj ? ` · DJ ${currentDj}` : ''}
                </p>
              )}

              <div className="flex gap-2 mb-4">
                <button
                  type="button"
                  onClick={() => setMode('file')}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-1.5 ${mode === 'file' ? 'glass-strong ring-1 ring-reto-pink/40' : 'glass-btn'}`}
                >
                  <Upload size={16} /> Archivo
                </button>
                <button
                  type="button"
                  onClick={() => setMode('youtube')}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-1.5 ${mode === 'youtube' ? 'glass-strong ring-1 ring-reto-pink/40' : 'glass-btn'}`}
                >
                  <Link2 size={16} /> YouTube
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs text-white/40 mb-1 block">Nombre de la canción</label>
                  <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ej. La favorita del grupo" />
                </div>

                {mode === 'file' ? (
                  <div>
                    <label className="text-xs text-white/40 mb-1 block">Archivo (MP3, M4A, WAV… máx. 25 MB)</label>
                    <label className="flex flex-col items-center justify-center gap-2 py-6 rounded-2xl border border-dashed border-white/15 bg-white/[0.03] cursor-pointer">
                      <Music2 size={28} className="text-reto-purple" />
                      <span className="text-sm text-white/70">{file ? file.name : 'Toca para elegir'}</span>
                      <span className="text-[10px] text-white/35">Se comprime a MP3 mono 128k · máx. 4 min</span>
                      <input
                        type="file"
                        accept={ACCEPT}
                        className="hidden"
                        onChange={(e) => setFile(e.target.files?.[0] || null)}
                      />
                    </label>
                  </div>
                ) : (
                  <div>
                    <label className="text-xs text-white/40 mb-1 block">Link de YouTube</label>
                    <input
                      value={youtubeUrl}
                      onChange={(e) => setYoutubeUrl(e.target.value)}
                      placeholder="https://youtube.com/watch?v=…"
                      inputMode="url"
                      autoComplete="off"
                    />
                    <p className="text-[10px] text-white/35 mt-1">Solo extraemos el audio y lo optimizamos en el servidor</p>
                  </div>
                )}
              </div>

              {error && <p className="text-reto-red text-sm mt-3">{error}</p>}

              <button
                type="button"
                disabled={loading}
                onClick={submit}
                className="w-full mt-4 py-3.5 rounded-2xl font-bold flex items-center justify-center gap-2 disabled:opacity-40"
                style={{ background: 'linear-gradient(135deg, #8338ec, #ff006e)' }}
              >
                {loading ? <Loader2 className="animate-spin" size={20} /> : <Radio size={20} />}
                {loading ? 'Optimizando…' : 'Poner para todos'}
              </button>
            </GlassCard>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
