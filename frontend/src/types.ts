export interface User {
  id: string;
  username: string;
  email: string;
  role: string;
  displayName: string;
  nickname?: string | null;
  gender: string;
  points: number;
  avatarEmoji?: string;
  avatarUrl?: string | null;
  bio?: string | null;
  bgMode?: 'beach' | 'celosia' | 'orbs' | 'custom' | string;
  bgUrl?: string | null;
  phone?: string | null;
  whatsappOptIn?: boolean;
  pushOptIn?: boolean;
  hasPasskey: boolean;
  setupCompleted?: boolean;
}

export interface FeedItem {
  id: string;
  type: string;
  pointsDelta: number;
  isAnonymous: boolean;
  displayName: string;
  avatarEmoji?: string | null;
  avatarUrl?: string | null;
  metadata?: string;
  createdAt: string;
}

export interface Player {
  id: string;
  displayName: string;
  nickname?: string | null;
  gender: string;
  points: number;
  avatarEmoji?: string | null;
  avatarUrl?: string | null;
  bio?: string | null;
}

export interface StoryItem {
  id: string;
  mediaUrl: string;
  caption?: string | null;
  createdAt: string;
  expiresAt: string;
  viewed: boolean;
}

export interface StoryViewer {
  userId: string;
  displayName: string;
  avatarUrl?: string | null;
  avatarEmoji?: string | null;
  viewedAt: string;
  reaction?: string | null;
}

export interface StoryUserGroup {
  userId: string;
  displayName: string;
  avatarUrl?: string | null;
  avatarEmoji?: string | null;
  previewUrl?: string | null;
  hasUnseen: boolean;
  isOwn: boolean;
  stories: StoryItem[];
}

export interface RetoEvent {
  cycleIndex: number;
  name: string;
  emoji: string;
  desc: string;
  game: string | null;
}

export interface PlayerContext {
  streak: number;
  continuedToday: boolean;
  alliance: { partnerId: string; name: string; emoji: string; avatarUrl?: string | null } | null;
  hasVoted: boolean;
  canClaimChest: boolean;
  bribeAccepted: boolean;
  featuredGame: string | null;
  achievements: { id: string; emoji: string; title: string; unlocked: boolean }[];
  gender: string;
  teamStats: { gender: string; totalPoints: number; players: number }[];
}

export interface TriviaQuestion {
  q: string;
  options: string[];
  correct: number;
}

export const CHALLENGE_DATE = new Date('2026-08-29T20:00:00-04:00');

export const REWARDS = [
  { id: 'burger', emoji: '🍔', title: 'Burger del perdedor', cost: 300, desc: 'El perdedor paga la hamburguesa' },
  { id: 'beer', emoji: '🍺', title: 'Ronda de cervezas', cost: 400, desc: 'El perdedor paga la ronda' },
  { id: 'pizza', emoji: '🍕', title: 'Pizza por género', cost: 500, desc: 'Pierden mujeres → pagan mujeres' },
  { id: 'coffee', emoji: '☕', title: 'Cafecito', cost: 100, desc: 'El perdedor invita un café' },
  { id: 'dj', emoji: '🎵', title: 'DJ del día', cost: 200, desc: 'El perdedor elige la playlist' },
  { id: 'photo', emoji: '📸', title: 'Foto vergonzosa', cost: 150, desc: 'Cambio de avatar 24h' },
  { id: 'crown', emoji: '👑', title: 'Corona', cost: 1000, desc: 'Eliges el reto del gran día' }
] as const;

export const ACTION_LABELS: Record<string, string> = {
  JOIN: '🚀 Se unió al reto',
  CONTINUE: '✅ Continuó con el reto',
  CLEMENCY: '🙏 Pidió clemencia',
  BETRAY: '💀 Traicionó a alguien',
  BETRAY_VICTIM: '🎯 Fue saboteado',
  RENEGOTIATE: '🤝 Propuso renegociar',
  BRIBE: '💰 Aceptó soborno',
  VOTE: '🗳️ Votó eliminar',
  ALLIANCE: '🤝 Formó alianza',
  CONFESSION: '🤐 Confesión anónima',
  CHEST: '📦 Abrió cofre',
  RED_LIGHT: '🚦 Red Light',
  TRIVIA: '🧠 Trivia',
  DDAKJI: '🎯 Ddakji',
  DDAKJI_L1: '🎯 Ddakji Fácil',
  DDAKJI_L2: '🎯 Ddakji Medio',
  DDAKJI_L3: '🎯 Ddakji Difícil',
  GLASS_BRIDGE: '🌉 Glass Bridge',
  HONEYCOMB: '🍯 Honeycomb',
  MYSTERY_BOX: '🎁 Caja misteriosa',
  COIN_FLIP: '🪙 Coin Flip',
  TUG_WAR: '💪 Tug of War',
  CHALLENGE_1V1: '⚔️ Desafío 1v1',
  CHALLENGE_LOSS: '😵 Perdió desafío',
  REDEEM: '🎁 Canjeó premio',
  RADIO_DJ: '🎵 Puso la música del Reto'
};

export const GAME_LIST = [
  { id: 'redlight', icon: '🚦', title: 'Red Light', desc: '+80 · toca en verde', color: 'pink' as const },
  { id: 'trivia', icon: '🧠', title: 'Trivia', desc: '≥2 aciertos · +100', color: 'purple' as const },
  { id: 'ddakji', icon: '🎯', title: 'Ddakji Flip', desc: 'N1–N3 · hasta +150', color: 'gold' as const },
  { id: 'glass', icon: '🌉', title: 'Glass Bridge', desc: 'Hasta +200 Puntos', color: 'cyan' as const },
  { id: 'honeycomb', icon: '🍯', title: 'Honeycomb', desc: 'Precisión', color: 'gold' as const },
  { id: 'mystery', icon: '🎁', title: 'Caja Misteriosa', desc: '+120 Puntos', color: 'pink' as const },
  { id: 'coin', icon: '🪙', title: 'Coin Flip', desc: 'Apuesta Puntos', color: 'purple' as const },
  { id: 'tug', icon: '💪', title: 'Tug of War', desc: 'Tap rápido', color: 'cyan' as const }
];
