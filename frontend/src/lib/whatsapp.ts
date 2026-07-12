import { isStandalone } from './pwa';

export type WhatsAppResult = {
  sent: boolean;
  via: 'baileys' | 'link' | 'skipped';
  waMeUrl?: string;
  error?: string;
};

/** Abre wa.me — en PWA standalone `window.open` suele fallar en iOS/Android. */
export function openWaMe(url: string) {
  if (isStandalone()) {
    window.location.assign(url);
    return;
  }
  const opened = window.open(url, '_blank', 'noopener,noreferrer');
  if (!opened) window.location.assign(url);
}

export function whatsAppResultLabel(r: WhatsAppResult): string {
  if (r.sent) return 'Enviado por WhatsApp ✓';
  if (r.via === 'link' && r.waMeUrl) return 'Abre WhatsApp para enviar el mensaje';
  if (r.error) return r.error;
  return 'WhatsApp no disponible';
}
