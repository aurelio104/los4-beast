import { motion } from 'framer-motion';
import { Images, Pencil, Trophy, X } from 'lucide-react';
import type { Player } from '../types';
import { useModalBackClose } from '../hooks/useModalBackClose';
import { overlayFade, overlayTransition, slideSheet, slideSheetTransition } from '../lib/motion';
import { Avatar } from './Avatar';
import { ModalPortal } from './ModalPortal';

const GENDER_LABEL: Record<string, string> = {
  M: 'Hombre',
  F: 'Mujer',
  OTHER: 'Otro'
};

type PlayerProfileSheetProps = {
  player: Player;
  rank?: number;
  isOwn?: boolean;
  hasStories?: boolean;
  onClose: () => void;
  onViewStories?: () => void;
  onEditProfile?: () => void;
};

export function PlayerProfileSheet({
  player,
  rank,
  isOwn,
  hasStories,
  onClose,
  onViewStories,
  onEditProfile
}: PlayerProfileSheetProps) {
  useModalBackClose(true, onClose);

  const name = player.nickname || player.displayName;
  const gender = GENDER_LABEL[player.gender] || null;

  return (
    <ModalPortal>
      <motion.div
        initial={overlayFade.initial}
        animate={overlayFade.animate}
        exit={overlayFade.exit}
        transition={overlayTransition}
        className="app-modal-overlay flex items-end sm:items-center justify-center p-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] modal-overlay"
        role="dialog"
        aria-modal="true"
        aria-label={`Perfil de ${name}`}
        onClick={onClose}
      >
        <motion.div
          initial={slideSheet.initial}
          animate={slideSheet.animate}
          exit={slideSheet.exit}
          transition={slideSheetTransition}
          className="glass-strong glass-aurora-top w-full max-w-md rounded-3xl p-5 sm:p-6 max-h-[min(85dvh,calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-2rem))] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-end mb-1">
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl glass-subtle text-white/55 hover:text-white"
              aria-label="Cerrar"
            >
              <X size={18} />
            </button>
          </div>

          <div className="flex flex-col items-center text-center mb-5">
            <Avatar
              url={player.avatarUrl}
              emoji={player.avatarEmoji}
              name={player.displayName}
              size="xl"
              className="!ring-white/25 mb-1"
            />
            {player.avatarUrl ? (
              <p className="text-[11px] text-white/40 mb-3">Toca la foto para ampliar</p>
            ) : (
              <div className="mb-3" />
            )}
            <h3 className="text-xl font-black text-white leading-tight">{name}</h3>
            {player.nickname && player.nickname !== player.displayName && (
              <p className="text-sm text-white/45 mt-0.5">{player.displayName}</p>
            )}
            <div className="flex flex-wrap items-center justify-center gap-2 mt-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-reto-gold/20 border border-reto-gold/35 text-sm font-bold text-reto-gold">
                <Trophy size={14} />
                {player.points} Puntos
              </span>
              {typeof rank === 'number' && rank > 0 && (
                <span className="px-3 py-1 rounded-full bg-white/8 border border-white/10 text-xs font-semibold text-white/70">
                  #{rank}
                </span>
              )}
              {gender && (
                <span className="px-3 py-1 rounded-full bg-white/8 border border-white/10 text-xs font-semibold text-white/70">
                  {gender}
                </span>
              )}
            </div>
          </div>

          {player.bio?.trim() ? (
            <p className="text-sm text-white/75 leading-relaxed text-center mb-5 whitespace-pre-wrap">
              {player.bio.trim()}
            </p>
          ) : (
            <p className="text-sm text-white/35 text-center mb-5 italic">Sin bio todavía</p>
          )}

          <div className="flex gap-3">
            {isOwn && onEditProfile ? (
              <button
                type="button"
                onClick={onEditProfile}
                className="flex-1 py-3.5 rounded-2xl font-bold btn-primary inline-flex items-center justify-center gap-2"
              >
                <Pencil size={16} />
                Editar perfil
              </button>
            ) : hasStories && onViewStories ? (
              <button
                type="button"
                onClick={onViewStories}
                className="flex-1 py-3.5 rounded-2xl font-bold btn-primary inline-flex items-center justify-center gap-2"
              >
                <Images size={16} />
                Ver historias
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="flex-1 glass-btn py-3.5 rounded-2xl font-semibold text-white/70"
              >
                Cerrar
              </button>
            )}
            {(isOwn || (hasStories && onViewStories)) && (
              <button
                type="button"
                onClick={onClose}
                className="glass-btn px-5 py-3.5 rounded-2xl font-semibold text-white/70"
              >
                Cerrar
              </button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </ModalPortal>
  );
}
