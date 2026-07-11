/** Normaliza teléfono a E.164. Por defecto asume Venezuela (+58) si son 10 dígitos locales. */
export function normalizePhone(raw: string, defaultCountry = '58'): string | null {
  let digits = raw.replace(/\D/g, '');
  if (!digits.length) return null;

  if (digits.startsWith('0')) digits = defaultCountry + digits.slice(1);
  else if (!digits.startsWith(defaultCountry) && digits.length === 10) digits = defaultCountry + digits;

  if (digits.length < 10 || digits.length > 15) return null;
  return `+${digits}`;
}

export function isValidPhone(raw: string): boolean {
  return normalizePhone(raw) !== null;
}
