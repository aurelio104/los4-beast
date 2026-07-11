import { motion } from 'framer-motion';
import { FeedItem, ACTION_LABELS } from '../types';
import { formatDistanceToNow } from '../lib/time';
import { formatFeedDetail } from '../lib/feedMeta';

export function DramaFeed({ items }: { items: FeedItem[] }) {
  if (!items.length) {
    return (
      <div className="text-center py-8 text-white/30 text-sm">
        El drama está por comenzar... 👀
      </div>
    );
  }

  return (
    <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-hide">
      {items.map((item, i) => {
        const detail = formatFeedDetail(item);
        return (
        <motion.div
          key={item.id}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.05 }}
          className="flex items-center gap-3 p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06]"
        >
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
            <span className={`text-xs font-bold tabular-nums ${item.pointsDelta > 0 ? 'text-beast-cyan' : 'text-beast-red'}`}>
              {item.pointsDelta > 0 ? '+' : ''}{item.pointsDelta}
            </span>
          )}
        </motion.div>
        );
      })}
    </div>
  );
}
