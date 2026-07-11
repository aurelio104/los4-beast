export interface UserPreferences {
  sound: boolean;
  haptics: boolean;
  reducedMotion: boolean;
}

const KEY = 'los4_prefs';

const defaults: UserPreferences = {
  sound: true,
  haptics: true,
  reducedMotion: false
};

export function getPreferences(): UserPreferences {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...defaults, reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches };
    return { ...defaults, ...JSON.parse(raw) };
  } catch {
    return defaults;
  }
}

export function setPreferences(partial: Partial<UserPreferences>) {
  const next = { ...getPreferences(), ...partial };
  localStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

export function isSoundEnabled() {
  return getPreferences().sound;
}
