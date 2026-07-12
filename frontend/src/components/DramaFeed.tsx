import { FeedItem, ACTION_LABELS } from '../types';
import { formatDistanceToNow } from '../lib/time';
import { formatFeedDetail } from '../lib/feedMeta';
import { Avatar } from './Avatar';
import { useReducedMotion } from '../hooks/useReducedMotion';

export function DramaFeed({ items }: { items: FeedItem[] }) {
  const reducedMotion = useReducedMotion();

  if (!items.length) {
    return (
      <div className="text-center py-8 text-white/30 text-sm">
        El drama está por comenzar... 👀
      </div>
    );
  }

  return (
    <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-hide scroll-contain">
      {items.map((item, i) => {
        const detail = formatFeedDetail(item);
        const animate = !reducedMotion && i < 6;
        const cls = 'flex items-center gap-3 p-3 rounded-2xl glass-subtle feed-row';

        const inner = (
          <>
            <Avatar url={item.avatarUrl} emoji={item.avatarEmoji || '😎'} name={item.displayName} size="xs" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white/90">
                <span className="font-semibold">{item.displayName}</span>
                {' '}
                <span className="text-white/60">{ACTION_LABELS[item.type] || item.type}</span>
              </p>
              {detail && <p className="text-xs text-white/45 mt-0.5 truncate">{detail}</p>}
              <p className="text-[10px] text-white/30">{formatDistanceToNow(item.createdAt)}</p>
            </div>
            {item.pointsDelta !== 0 && (
              <span className={`text-xs font-bold tabular-nums ${item.pointsDelta > 0 ? 'text-reto-cyan' : 'text-reto-red'}`}>
                {item.pointsDelta > 0 ? '+' : ''}{item.pointsDelta}
              </span>
            )}
          </>
        );

        if (!animate) {
          return <div key={item.id} className={cls}>{inner}</div>;
        }

        return (
          <div
            key={item.id}
            className={`${cls} feed-row-in`}
            style={{ animationDelay: `${i * 40}ms` }}
          >
            {inner}
          </div>
        );
      })}
    </div>
  );
}
