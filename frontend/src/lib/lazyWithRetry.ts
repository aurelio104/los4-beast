import { lazy, type ComponentType, type LazyExoticComponent } from 'react';
import { isChunkLoadError, reloadWithRecovery } from './chunkRecovery';

const RETRY_DELAY_MS = 800;

function wait(ms: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, ms));
}

/**
 * Import dinámico con reintentos y recuperación automática ante chunks obsoletos (PWA iOS).
 */
export function lazyWithRetry<T extends ComponentType<unknown>>(
  factory: () => Promise<{ default: T }>,
  label: string
): LazyExoticComponent<T> {
  return lazy(async () => {
    let lastError: unknown;

    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        return await factory();
      } catch (error) {
        lastError = error;
        if (!isChunkLoadError(error)) throw error;
        if (attempt < 2) await wait(RETRY_DELAY_MS * (attempt + 1));
      }
    }

    console.warn(`[reto] chunk "${label}" no cargó tras reintentos`, lastError);
    const reloaded = await reloadWithRecovery();
    if (!reloaded) throw lastError;
    return factory();
  });
}
