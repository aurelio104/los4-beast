import { FeedItem } from '../types';

export function formatFeedDetail(item: FeedItem): string | null {
  if (!item.metadata) return null;
  try {
    const meta = JSON.parse(item.metadata) as Record<string, unknown>;
    switch (item.type) {
      case 'JOIN':
        return meta.invitedBy ? `Invitado por ${meta.invitedBy}` : null;
      case 'RENEGOTIATE':
        return `"${String(meta.proposal ?? '').slice(0, 120)}"`;
      case 'BRIBE':
        return `Penalización: ${meta.penalty ?? '?'}`;
      case 'BETRAY':
      case 'BETRAY_VICTIM':
        return meta.targetId ? 'Objetivo seleccionado 👀' : null;
      case 'ALLIANCE':
        return 'Pacto secreto formado 🤫';
      case 'VOTE':
        return 'Voto registrado 🗳️';
      case 'CHEST':
        return meta.clue ? String(meta.clue) : null;
      case 'CHALLENGE_1V1':
        return meta.won ? 'Ganó el duelo ⚔️' : 'Perdió el duelo 😵';
      case 'REDEEM':
        return `Canje: ${meta.rewardId ?? 'premio'}`;
      case 'RADIO_DJ':
        return meta.title ? `"${String(meta.title).slice(0, 80)}"` : null;
      case 'COIN_FLIP':
        return meta.won ? `Ganó apuesta (${meta.bet} Puntos)` : `Perdió apuesta (${meta.bet} Puntos)`;
      default:
        return null;
    }
  } catch {
    return null;
  }
}
