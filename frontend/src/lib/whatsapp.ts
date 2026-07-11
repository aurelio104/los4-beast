export type WhatsAppResult = {
  sent: boolean;
  via: 'baileys' | 'link' | 'skipped';
  waMeUrl?: string;
  error?: string;
};

export function openWaMe(url: string) {
  window.open(url, '_blank', 'noopener,noreferrer');
}

export function whatsAppResultLabel(r: WhatsAppResult): string {
  if (r.sent) return 'Enviado por WhatsApp ✓';
  if (r.via === 'link' && r.waMeUrl) return 'Abre WhatsApp para enviar el mensaje';
  if (r.error) return r.error;
  return 'WhatsApp no disponible';
}
