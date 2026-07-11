type AvatarProps = {
  url?: string | null;
  emoji?: string | null;
  name?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
};

const SIZES = {
  xs: 'w-7 h-7 text-sm',
  sm: 'w-9 h-9 text-base',
  md: 'w-12 h-12 text-xl',
  lg: 'w-20 h-20 text-4xl',
  xl: 'w-28 h-28 text-5xl'
} as const;

export function Avatar({ url, emoji = '😎', name, size = 'md', className = '' }: AvatarProps) {
  const dim = SIZES[size];
  if (url) {
    return (
      <img
        src={url}
        alt={name || 'Avatar'}
        className={`${dim} rounded-full object-cover ring-2 ring-white/15 bg-white/5 shrink-0 ${className}`}
      />
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
