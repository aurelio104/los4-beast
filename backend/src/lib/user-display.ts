const GENERIC_NAMES = new Set(['you', 'tu', 'yo', 'me', 'usuario', 'user', 'nombre', 'test', 'invitado']);

export function isGenericDisplayName(name: string | null | undefined): boolean {
  const n = (name || '').trim().toLowerCase();
  return !n || GENERIC_NAMES.has(n);
}

/** Nombre visible en feed, chat y rankings. */
export function resolvePublicName(user: {
  nickname?: string | null;
  displayName: string;
  username: string;
}): string {
  const nick = user.nickname?.trim();
  if (nick) return nick;

  const display = user.displayName?.trim();
  if (display && !isGenericDisplayName(display)) return display;

  const un = user.username.trim();
  if (!un) return 'Jugador';
  return un.charAt(0).toUpperCase() + un.slice(1);
}
