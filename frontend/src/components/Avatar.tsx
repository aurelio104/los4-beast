import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { AvatarPreviewModal } from './AvatarPreviewModal';

type AvatarProps = {
  url?: string | null;
  emoji?: string | null;
  name?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  /** Si hay foto, permite verla en grande al tocar */
  expandable?: boolean;
};

const SIZES = {
  xs: 'w-7 h-7 text-sm',
  sm: 'w-9 h-9 text-base',
  md: 'w-12 h-12 text-xl',
  lg: 'w-20 h-20 text-4xl',
  xl: 'w-28 h-28 text-5xl'
} as const;

export function Avatar({ url, emoji = '😎', name, size = 'md', className = '', expandable = true }: AvatarProps) {
  const [preview, setPreview] = useState(false);
  const dim = SIZES[size];
  const canExpand = expandable && !!url;

  if (url) {
    if (!canExpand) {
      return (
        <img
          src={url}
          alt={name || 'Avatar'}
          className={`${dim} rounded-full object-cover ring-2 ring-white/15 bg-white/5 shrink-0 ${className}`}
        />
      );
    }

    return (
      <>
        <button
          type="button"
          onClick={() => setPreview(true)}
          className="rounded-full shrink-0 p-0 border-0 bg-transparent inline-flex"
          aria-label={name ? `Ver foto de ${name}` : 'Ver foto de perfil'}
        >
          <img
            src={url}
            alt={name || 'Avatar'}
            className={`${dim} rounded-full object-cover ring-2 ring-white/15 bg-white/5 shrink-0 cursor-zoom-in active:scale-95 transition-transform ${className}`}
          />
        </button>
        <AnimatePresence>
          {preview && (
            <AvatarPreviewModal url={url} name={name} onClose={() => setPreview(false)} />
          )}
        </AnimatePresence>
      </>
    );
  }

  return (
    <span
      className={`${dim} rounded-full bg-white/10 ring-2 ring-white/10 flex items-center justify-center shrink-0 ${className}`}
      aria-label={name || 'Avatar'}
    >
      {emoji || '😎'}
    </span>
  );
}
