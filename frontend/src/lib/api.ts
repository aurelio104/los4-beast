import type { PlayerContext, TriviaQuestion } from '../types';

const API = '/api';

function getToken() {
  return localStorage.getItem('token');
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>)
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API}${path}`, { ...options, headers, credentials: 'include' });
  const data = await res.json();
  if (res.status === 401 && !path.includes('/login') && !path.includes('/join')) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  }
  return data as T;
}

export const api = {
  invite: (code: string) =>
    request<{
      valid: boolean;
      expired?: boolean;
      inviterName?: string;
      inviterEmoji?: string;
      inviterAvatarUrl?: string;
      challengeDate: string;
    }>(`/auth/invite/${code}`),
  createInvite: () =>
    request<{ success: boolean; invite?: { code: string; expiresAt: string; inviterName: string }; error?: string }>(
      '/auth/invites',
      { method: 'POST' }
    ),
  join: (body: Record<string, string>) => request<{ success: boolean; token?: string; user?: unknown; error?: string }>('/auth/join', { method: 'POST', body: JSON.stringify(body) }),
  login: (identifier: string, password: string) => request<{ success: boolean; token?: string; user?: unknown; error?: string; needsPasskey?: boolean }>('/auth/login', { method: 'POST', body: JSON.stringify({ identifier, password }) }),
  me: () => request<{ success: boolean; user: unknown }>('/auth/me'),
  passkeyChallenge: () => fetch(`${API}/auth/webauthn/challenge`).then((r) => r.json()),
  passkeyVerify: (body: unknown) => request<{ success: boolean; token?: string; user?: unknown; error?: string }>('/auth/webauthn/verify', { method: 'POST', body: JSON.stringify(body) }),
  passkeyRegisterOptions: () => fetch(`${API}/auth/webauthn/register-options`, { headers: { Authorization: `Bearer ${getToken()}` } }).then((r) => r.json()),
  passkeyRegister: (body: unknown) => fetch(`${API}/auth/webauthn/register`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` }, body: JSON.stringify(body) }).then((r) => r.json()),
  passkeyDelete: () => request<{ success: boolean }>('/auth/webauthn/passkey', { method: 'DELETE' }),
  players: () => request<{ success: boolean; players: unknown[] }>('/auth/players'),

  gameStatus: () => request<{ success: boolean; cycleIndex: number; nextEventAt: string; daysUntilChallenge: number; event: unknown; isEventActive: boolean; hoursUntilNext: number; player: PlayerContext }>('/game/status'),
  hubSnapshot: () =>
    request<{
      success: boolean;
      user: import('../types').User;
      feed: import('../types').FeedItem[];
      players: import('../types').Player[];
      cycleIndex: number;
      nextEventAt: string;
      daysUntilChallenge: number;
      event: unknown;
      isEventActive: boolean;
      hoursUntilNext: number;
      player: PlayerContext;
      tally: { targetId: string; count: number; name: string }[];
      bribe: { offer: { points: number; penalty: string }; alreadyAccepted: boolean };
      stories: import('../types').StoryUserGroup[];
    }>('/game/hub-snapshot'),
  triviaQuestions: () => request<{ success: boolean; questions: TriviaQuestion[] }>('/game/trivia/questions'),
  events: () => request<{ success: boolean; events: unknown[]; current: unknown }>('/game/events'),
  feed: () => request<{ success: boolean; feed: unknown[] }>('/game/feed'),
  continue: () => request<{ success: boolean; points: number; gained?: number; alreadyDone?: boolean; error?: string }>('/game/continue', { method: 'POST' }),
  clemency: () => request<{ success: boolean; points: number; error?: string }>('/game/clemency', { method: 'POST' }),
  betray: (targetId: string) => request<{ success: boolean; points: number; gained?: number; error?: string }>('/game/betray', { method: 'POST', body: JSON.stringify({ targetId }) }),
  renegotiate: (proposal: string) => request<{ success: boolean; message?: string; error?: string }>('/game/renegotiate', { method: 'POST', body: JSON.stringify({ proposal }) }),
  bribe: () => request<{ success: boolean; offer: { points: number; penalty: string }; alreadyAccepted: boolean }>('/game/bribe'),
  acceptBribe: () => request<{ success: boolean; points: number; gained?: number; penalty?: string; error?: string }>('/game/bribe/accept', { method: 'POST' }),
  vote: (targetId: string, voteType?: string) => request<{ success: boolean; points: number; error?: string }>('/game/vote', { method: 'POST', body: JSON.stringify({ targetId, voteType }) }),
  votes: () => request<{ success: boolean; tally: { targetId: string; count: number; name: string }[] }>('/game/votes'),
  alliance: (partnerId: string) => request<{ success: boolean; points: number; gained?: number; error?: string }>('/game/alliance', { method: 'POST', body: JSON.stringify({ partnerId }) }),
  getAlliance: () => request<{ success: boolean; alliance: unknown }>('/game/alliance'),
  confession: (message: string) => request<{ success: boolean; error?: string }>('/game/confession', { method: 'POST', body: JSON.stringify({ message }) }),
  confessions: () => request<{ success: boolean; confessions: unknown[] }>('/game/confessions'),
  chest: () => request<{ success: boolean; clues: { cycleIndex: number; clue: string }[]; canClaim: boolean; daysUntilChallenge: number }>('/game/chest'),
  claimChest: () => request<{ success: boolean; clue?: string; points: number; gained?: number; error?: string }>('/game/chest/claim', { method: 'POST' }),
  redeem: (rewardId: string, cost: number) => request<{ success: boolean; points: number; error?: string }>('/game/redeem', { method: 'POST', body: JSON.stringify({ rewardId, cost }) }),
  updateProfile: (data: {
    nickname?: string;
    displayName?: string;
    gender?: string;
    bio?: string;
    avatarEmoji?: string;
    bgMode?: string;
    currentPassword?: string;
    newPassword?: string;
    phone?: string;
    whatsappOptIn?: boolean;
  }) => request<{ success: boolean; user?: unknown; error?: string }>('/game/profile', { method: 'PATCH', body: JSON.stringify(data) }),
  uploadAvatar: (dataUrl: string) =>
    request<{ success: boolean; user?: unknown; error?: string }>('/game/profile/avatar', { method: 'POST', body: JSON.stringify({ dataUrl }) }),
  deleteAvatar: () => request<{ success: boolean; user?: unknown; error?: string }>('/game/profile/avatar', { method: 'DELETE' }),
  uploadBackground: (dataUrl: string) =>
    request<{ success: boolean; user?: unknown; error?: string }>('/game/profile/background', { method: 'POST', body: JSON.stringify({ dataUrl }) }),
  deleteBackground: () => request<{ success: boolean; user?: unknown; error?: string }>('/game/profile/background', { method: 'DELETE' }),

  stories: () => request<{ success: boolean; users: import('../types').StoryUserGroup[] }>('/game/stories'),
  createStory: (dataUrl: string, caption?: string) =>
    request<{ success: boolean; users?: import('../types').StoryUserGroup[]; error?: string }>('/game/stories', {
      method: 'POST',
      body: JSON.stringify({ dataUrl, caption })
    }),
  viewStory: (storyId: string) =>
    request<{ success: boolean }>(`/game/stories/${storyId}/view`, { method: 'POST' }),
  deleteStory: (storyId: string) =>
    request<{ success: boolean; users?: import('../types').StoryUserGroup[]; error?: string }>(
      `/game/stories/${storyId}`,
      { method: 'DELETE' }
    ),

  whatsappStatus: () => request<{ success: boolean; autoSend: boolean }>('/game/whatsapp/status'),
  whatsappWelcome: () =>
    request<{ success: boolean; whatsapp?: import('./whatsapp').WhatsAppResult; error?: string }>(
      '/game/whatsapp/welcome',
      { method: 'POST' }
    ),
  whatsappTest: () =>
    request<{ success: boolean; whatsapp?: import('./whatsapp').WhatsAppResult; error?: string }>(
      '/game/whatsapp/test',
      { method: 'POST' }
    ),

  whatsappAdminStatus: () => request<Record<string, unknown>>('/whatsapp/status'),
  whatsappConnect: () => request<{ message: string }>('/whatsapp/connect', { method: 'POST' }),
  whatsappClean: () => request<{ ok: boolean; message?: string }>('/whatsapp/clean', { method: 'POST' }),
  whatsappBotPause: (paused: boolean) =>
    request<{ ok: boolean; message: string }>('/whatsapp/bot-pause', { method: 'POST', body: JSON.stringify({ paused }) }),
  whatsappSend: (phoneNumber: string, message: string) =>
    request<{ success: boolean; error?: string }>('/whatsapp/send', { method: 'POST', body: JSON.stringify({ phoneNumber, message }) }),
  whatsappMessages: () => request<unknown[]>('/whatsapp/messages'),
  whatsappTemplatesSeed: () => request<{ message: string }>('/whatsapp/templates/seed', { method: 'POST' }),

  chatMessages: (after?: string) =>
    request<{ success: boolean; messages: unknown[] }>(`/chat/messages${after ? `?after=${encodeURIComponent(after)}` : ''}`),
  chatSend: (body: string) =>
    request<{ success: boolean; message?: unknown; error?: string }>('/chat/messages', { method: 'POST', body: JSON.stringify({ body }) }),

  redLight: (survived: boolean) => request<{ success: boolean; points: number; gained?: number; error?: string }>('/game/minigame/red-light', { method: 'POST', body: JSON.stringify({ survived }) }),
  trivia: (correct: boolean) => request<{ success: boolean; points: number; gained?: number; error?: string }>('/game/minigame/trivia', { method: 'POST', body: JSON.stringify({ correct }) }),
  ddakji: (won: boolean) => request<{ success: boolean; points: number; gained?: number; error?: string }>('/game/minigame/ddakji', { method: 'POST', body: JSON.stringify({ won }) }),
  glassBridge: (steps: number) => request<{ success: boolean; points: number; gained?: number; error?: string }>('/game/minigame/glass-bridge', { method: 'POST', body: JSON.stringify({ steps }) }),
  honeycomb: (precision: number) => request<{ success: boolean; points: number; gained?: number; error?: string }>('/game/minigame/honeycomb', { method: 'POST', body: JSON.stringify({ precision }) }),
  mysteryBox: (boxIndex: number) => request<{ success: boolean; points: number; gained?: number; error?: string }>('/game/minigame/mystery-box', { method: 'POST', body: JSON.stringify({ boxIndex }) }),
  coinFlip: (choice: string, bet: number) => request<{ success: boolean; points: number; gained?: number; won?: boolean; result?: string; error?: string }>('/game/minigame/coin-flip', { method: 'POST', body: JSON.stringify({ choice, bet }) }),
  tugWar: (taps: number) => request<{ success: boolean; points: number; gained?: number; error?: string }>('/game/minigame/tug-war', { method: 'POST', body: JSON.stringify({ taps }) }),
  challenge1v1: (opponentId: string, won: boolean) => request<{ success: boolean; points: number; gained?: number; error?: string }>('/game/minigame/challenge', { method: 'POST', body: JSON.stringify({ opponentId, won }) }),

  pushVapidPublic: () => request<{ success: boolean; publicKey?: string; error?: string }>('/push/vapid-public'),
  pushSubscribe: (body: { endpoint: string; keys: { p256dh: string; auth: string } }) => request<{ success: boolean }>('/push/subscribe', { method: 'POST', body: JSON.stringify(body) }),
  pushStatus: () => request<{ success: boolean; serverSubscribed?: boolean; pushOptIn?: boolean }>('/push/status'),
  pushUnsubscribe: () => request<{ success: boolean }>('/push/unsubscribe', { method: 'POST' }),
  pushTest: () => request<{ success: boolean }>('/push/test', { method: 'POST' }),
  pushBroadcast: (title: string, body: string) => request<{ success: boolean; sent: number }>('/push/broadcast', { method: 'POST', body: JSON.stringify({ title, body }) }),

  adminDashboard: () => request<{ success: boolean; stats: Record<string, number>; challengeDate: string; redemptions: unknown[] }>('/admin/dashboard'),
  adminCreateInvite: () =>
    request<{ success: boolean; invite?: { code: string; expiresAt: string; inviterName: string }; error?: string }>(
      '/admin/invites',
      { method: 'POST' }
    ),
  adminInviteWhatsApp: (body: { phone: string; displayName?: string }) =>
    request<{
      success: boolean;
      invite?: { code: string; expiresAt: string; inviterName: string };
      joinUrl?: string;
      whatsapp?: import('./whatsapp').WhatsAppResult;
      error?: string;
    }>('/admin/invites/whatsapp', { method: 'POST', body: JSON.stringify(body) }),
  adminRevealConfessions: () => request<{ success: boolean }>('/admin/reveal-confessions', { method: 'POST' }),
  adminNotifyEvent: () => request<{ success: boolean; sent: number }>('/admin/notify-event', { method: 'POST' }),
  adminUpdateRedemption: (id: string, status: string) => request<{ success: boolean }>(`/admin/redemptions/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  adminUsers: (includeInactive = false) =>
    request<{
      success: boolean;
      users: {
        id: string;
        username: string;
        email: string;
        displayName: string;
        nickname: string | null;
        role: string;
        phone?: string | null;
        whatsappOptIn?: boolean;
        passkeyRegistered?: boolean;
        points?: number;
        isActive?: boolean;
        createdAt?: string;
      }[];
    }>(`/admin/users${includeInactive ? '?includeInactive=1' : ''}`),
  adminResetPassword: (userId: string, newPassword: string) =>
    request<{
      success: boolean;
      user?: { id: string; username: string; displayName: string; phone?: string | null; whatsappOptIn?: boolean };
      whatsapp?: import('./whatsapp').WhatsAppResult;
      error?: string;
    }>(`/admin/users/${userId}/reset-password`, { method: 'POST', body: JSON.stringify({ newPassword }) }),
  adminResetPasskey: (userId: string) =>
    request<{ success: boolean; passkeyRegistered?: boolean; error?: string }>(
      `/admin/users/${userId}/reset-passkey`,
      { method: 'POST' }
    ),
  adminSetUserActive: (userId: string, isActive: boolean) =>
    request<{ success: boolean; isActive?: boolean; error?: string }>(
      `/admin/users/${userId}`,
      { method: 'PATCH', body: JSON.stringify({ isActive }) }
    ),
  adminDeleteUser: (userId: string) =>
    request<{ success: boolean; error?: string }>(`/admin/users/${userId}`, { method: 'DELETE' }),

  radioCurrent: () =>
    request<{
      success: boolean;
      track?: {
        id: string;
        title: string;
        audioUrl: string;
        durationSec: number | null;
        sourceType: string;
        submittedBy: string;
        submittedAt: string;
      } | null;
    }>('/game/radio/current'),

  submitRadio: async (form: FormData) => {
    const token = getToken();
    const res = await fetch(`${API}/game/radio/submit`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
      credentials: 'include'
    });
    const data = await res.json();
    if (res.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return data as {
      success: boolean;
      track?: unknown;
      gained?: number;
      points?: number;
      error?: string;
    };
  },
  adminStats: () => request<{ success: boolean; stats: { players: number; actions: number; redemptions: number }; challengeDate: string }>('/auth/admin/stats')
};
