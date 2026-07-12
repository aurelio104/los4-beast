const RELOAD_KEY = 'reto_boot_reload';
const MAX_AUTO_RELOADS = 3;

export function isChunkLoadError(reason: unknown): boolean {
  const msg =
    reason instanceof Error
      ? reason.message
      : typeof reason === 'string'
        ? reason
        : '';
  return /failed to fetch|loading chunk|dynamically imported module|importing a module script failed|error loading dynamically imported module/i.test(
    msg
  );
}

export function clearBootReloadCount() {
  /* No resetear en cada mount — evita bucles infinitos de recarga */
}

function isModuleAsset(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLScriptElement || target instanceof HTMLLinkElement)) return false;
  const href = target instanceof HTMLLinkElement ? target.href : target.src;
  if (!href) return false;
  return href.includes('/assets/') || href.endsWith('.js') || href.endsWith('.css');
}

function getReloadCount(): number {
  try {
    return Number(sessionStorage.getItem(RELOAD_KEY) || '0');
  } catch {
    return 0;
  }
}

function bumpReloadCount(): number {
  const next = getReloadCount() + 1;
  try {
    sessionStorage.setItem(RELOAD_KEY, String(next));
  } catch {
    /* ignore */
  }
  return next;
}

export async function hardRecoverCaches(): Promise<void> {
  try {
    const regs = await navigator.serviceWorker?.getRegistrations();
    await Promise.all((regs || []).map((reg) => reg.unregister()));
  } catch {
    /* ignore */
  }

  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) await reg.update();
  } catch {
    /* ignore */
  }

  try {
    const keys = await caches?.keys();
    await Promise.all((keys || []).map((key) => caches.delete(key)));
  } catch {
    /* ignore */
  }
}

export async function reloadWithRecovery(): Promise<boolean> {
  if (getReloadCount() >= MAX_AUTO_RELOADS) return false;
  bumpReloadCount();
  await hardRecoverCaches();
  window.location.reload();
  return true;
}

export function registerChunkRecovery() {
  window.addEventListener('vite:preloadError', (event) => {
    event.preventDefault();
    void reloadWithRecovery();
  });

  window.addEventListener(
    'error',
    (event) => {
      if (!isModuleAsset(event.target)) return;
      void reloadWithRecovery();
    },
    true
  );

  window.addEventListener('unhandledrejection', (event) => {
    if (!isChunkLoadError(event.reason)) return;
    event.preventDefault();
    void reloadWithRecovery();
  });
}

export async function serviceWorkerReady(timeoutMs = 5000): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null;
  try {
    return await Promise.race([
      navigator.serviceWorker.ready,
      new Promise<null>((resolve) => window.setTimeout(() => resolve(null), timeoutMs))
    ]);
  } catch {
    return null;
  }
}
