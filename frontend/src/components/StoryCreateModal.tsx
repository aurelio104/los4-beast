import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Camera, Loader2, X } from 'lucide-react';
import { compressImageFile } from '../lib/image';
import { api } from '../lib/api';
import { useModalBackClose } from '../hooks/useModalBackClose';
import { StoryUserGroup } from '../types';

type StoryCreateModalProps = {
  onClose: () => void;
  onPublished: (groups: StoryUserGroup[], openViewer?: boolean) => void;
};

export function StoryCreateModal({ onClose, onPublished }: StoryCreateModalProps) {
  useModalBackClose(true, onClose);
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const onPick = async (file?: File) => {
    if (!file) return;
    setError('');
    try {
      const dataUrl = await compressImageFile(file, 1080, 0.78);
      setPreview(dataUrl);
    } catch (e) {
      setError((e as Error).message || 'No se pudo leer la imagen');
    }
    if (fileRef.current) fileRef.current.value = '';
  };

  const publish = async () => {
    if (!preview || loading) return;
    setLoading(true);
    setError('');
    const res = await api.createStory(preview, caption.trim() || undefined);
    setLoading(false);
    if (res.success && res.users) {
      onPublished(res.users, true);
      onClose();
    } else {
      setError(res.error || 'No se pudo publicar');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[85] flex items-end sm:items-center justify-center modal-overlay p-0 sm:p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        className="w-full max-w-md glass-strong rounded-t-3xl sm:rounded-3xl p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-black">Nueva historia</h3>
          <button type="button" onClick={onClose} className="p-2 text-white/50" aria-label="Cerrar">
            <X size={20} />
          </button>
        </div>

        <p className="text-xs text-white/45 mb-4">Visible 24 horas para todo el grupo · máx. 10 al día</p>

        {preview ? (
          <div className="relative mb-4 rounded-2xl overflow-hidden aspect-[9/16] max-h-[50dvh] bg-black/40 mx-auto">
            <img src={preview} alt="Vista previa" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="absolute bottom-3 right-3 glass-strong rounded-full px-3 py-1.5 text-xs font-semibold"
            >
              Cambiar
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="w-full aspect-[9/12] max-h-[40dvh] rounded-2xl border-2 border-dashed border-white/20 flex flex-col items-center justify-center gap-3 mb-4 text-white/50 hover:border-reto-pink/50 hover:text-white/70 transition-colors"
          >
            <Camera size={32} className="text-reto-pink" />
            <span className="text-sm font-semibold">Elegir de la galería</span>
          </button>
        )}

        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
          className="hidden"
          onChange={(e) => onPick(e.target.files?.[0])}
        />

        <textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value.slice(0, 200))}
          placeholder="Texto opcional..."
          rows={2}
          className="w-full glass rounded-xl px-3 py-2.5 text-sm resize-none mb-4 bg-white/5 border border-white/10"
        />

        {error && <p className="text-reto-red text-sm mb-3">{error}</p>}

        <button
          type="button"
          disabled={!preview || loading}
          onClick={publish}
          className="w-full py-3.5 rounded-2xl font-bold bg-gradient-to-r from-reto-pink to-reto-purple disabled:opacity-40 flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 size={18} className="animate-spin" /> : null}
          Publicar historia
        </button>
      </motion.div>
    </motion.div>
  );
}
