import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Avatar } from './Avatar';
import { RetoLogo } from './RetoLogo';
import { PointsBadge } from './PointsBadge';
import { NotificationBellButton } from './NotificationProvider';
import { useNotifications } from './NotificationProvider';
import { fadeUp, fadeUpTransition } from '../lib/motion';

type HubHeaderProps = {
  displayName: string;
  avatarUrl?: string | null;
  avatarEmoji?: string;
  points: number;
};

export function HubHeader({ displayName, avatarUrl, avatarEmoji, points }: HubHeaderProps) {
  const navigate = useNavigate();
  const { unread, openInbox } = useNotifications();

  return (
    <motion.header
      initial={fadeUp.initial}
      animate={fadeUp.animate}
      transition={fadeUpTransition}
      className="mb-3"
    >
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <button
          type="button"
          onClick={() => navigate('/perfil')}
          className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1 text-left"
        >
          <div className={`relative shrink-0 ${unread > 0 ? 'avatar-ring-pulse' : ''}`}>
            <Avatar url={avatarUrl} emoji={avatarEmoji} name={displayName} size="md" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <RetoLogo size="xs" glow animate />
              <h1 className="text-sm sm:text-base font-black gradient-text truncate">Reto</h1>
            </div>
            <p className="text-[11px] sm:text-xs text-white/65 truncate">{displayName}</p>
          </div>
        </button>
        <NotificationBellButton unread={unread} onClick={openInbox} />
        <PointsBadge points={points} compact />
      </div>
    </motion.header>
  );
}
