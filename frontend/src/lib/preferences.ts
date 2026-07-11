export type BgMode = 'beach' | 'celosia' | 'orbs' | 'custom';

export interface UserPreferences {
  sound: boolean;
  haptics: boolean;
  reducedMotion: boolean;
  music: boolean;
  bgMode: BgMode;
}

const KEY = 'reto_prefs';

const defaults: UserPreferences = {
  sound: true,
  haptics: true,
  reducedMotion: false,
  music: false,
  bgMode: 'beach'
};

export function getPreferences(): UserPreferences {
  try {
    const raw = localStorage.getItem(KEY) || localStorage.getItem('los4_prefs');
    if (!raw) {
      return {
        ...defaults,
        reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches
      };
    }
    return { ...defaults, ...JSON.parse(raw) };
  } catch {
    return defaults;
  }
}

export function setPreferences(partial: Partial<UserPreferences>) {
  const next = { ...getPreferences(), ...partial };
  localStorage.setItem(KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent('reto-prefs', { detail: next }));
  return next;
}

export function isSoundEnabled() {
  return getPreferences().sound;
}

export function syncBgFromUser(bgMode?: string | null, bgUrl?: string | null) {
  const mode = (['beach', 'celosia', 'orbs', 'custom'].includes(bgMode || '')
    ? bgMode
    : 'beach') as BgMode;
  setPreferences({ bgMode: mode });
  if (bgUrl) localStorage.setItem('reto_bg_url', bgUrl);
  else localStorage.removeItem('reto_bg_url');
}

export function getCustomBgUrl(): string | null {
  return localStorage.getItem('reto_bg_url');
}
