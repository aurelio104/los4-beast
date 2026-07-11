const PREFIX = 'reto_setup_done_';

export function isSetupDone(userId?: string | null): boolean {
  if (!userId) return false;
  return localStorage.getItem(`${PREFIX}${userId}`) === '1';
}

export function markSetupDone(userId: string) {
  localStorage.setItem(`${PREFIX}${userId}`, '1');
}

export function clearSetupDone(userId: string) {
  localStorage.removeItem(`${PREFIX}${userId}`);
}
