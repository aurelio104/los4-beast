import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Avatar } from './Avatar';
import { RetoLogo } from './RetoLogo';
import { PointsBadge } from './PointsBadge';

type HubHeaderProps = {
  displayName: string;
  avatarUrl?: string | null;
  avatarEmoji?: string;
  points: number;
};

export function HubHeader({ displayName, avatarUrl, avatarEmoji, points }: HubHeaderProps) {
  const navigate = useNavigate();

  return (
    <motion.header
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-5"
    >
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <button
          type="button"
          onClick={() => navigate('/perfil')}
          className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1 text-left"
        >
          <Avatar url={avatarUrl} emoji={avatarEmoji} name={displayName} size="md" />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <RetoLogo size="xs" glow />
              <h1 className="text-sm sm:text-base font-black gradient-text truncate">Reto</h1>
            </div>
            <p className="text-[11px] sm:text-xs text-white/55 truncate">{displayName}</p>
          </div>
        </button>
        <PointsBadge points={points} compact />
      </div>
    </motion.header>
  );
}
