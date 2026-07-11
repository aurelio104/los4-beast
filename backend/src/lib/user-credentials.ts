import crypto from 'crypto';
import { prisma } from './prisma.js';

/** PIN numérico de 6 dígitos para cuentas creadas por admin. */
export function generatePin(): string {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
}

export function isValidPinPassword(password: string): boolean {
  return /^\d{4,6}$/.test(password);
}

export function isAcceptableUserPassword(password: string): boolean {
  return isValidPinPassword(password) || password.length >= 8;
}

/** @deprecated use isAcceptableUserPassword */
export const isAcceptableAdminPassword = isAcceptableUserPassword;

function slugifyToken(raw: string): string {
  return raw
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

/** Usuario corto: primer nombre + últimos 4 del teléfono; evita duplicados. */
export async function generateUniqueUsername(displayName: string, phoneDigits: string): Promise<string> {
  const first = displayName.trim().split(/\s+/)[0] || 'user';
  const base = slugifyToken(first).slice(0, 12) || 'user';
  const suffix = phoneDigits.replace(/\D/g, '').slice(-4);
  const stem = `${base}${suffix}`.slice(0, 16);
  const minLen = 3;

  for (let i = 0; i < 100; i++) {
    let candidate = i === 0 ? stem : `${base}${i}${suffix}`.slice(0, 20);
    if (candidate.length < minLen) candidate = `user${suffix}${i}`.slice(0, 20);
    const exists = await prisma.user.findUnique({ where: { username: candidate }, select: { id: true } });
    if (!exists) return candidate;
  }

  return `user${crypto.randomBytes(3).toString('hex')}`;
}

export async function uniquePlaceholderEmail(username: string): Promise<string> {
  let email = `${username}@reto.local`;
  for (let i = 0; i < 20; i++) {
    const exists = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (!exists) return email;
    email = `${username}${i}@reto.local`;
  }
  return `${username}.${crypto.randomBytes(2).toString('hex')}@reto.local`;
}

/** Usuario interno a partir del correo (login principal = email). */
export async function generateUsernameFromEmail(email: string): Promise<string> {
  const local = (email.split('@')[0] || 'user').trim();
  let base = slugifyToken(local).slice(0, 16) || 'user';
  if (base.length < 3) base = `user${base}`.slice(0, 16);

  for (let i = 0; i < 100; i++) {
    const candidate = (i === 0 ? base : `${base}${i}`).slice(0, 20);
    const exists = await prisma.user.findUnique({ where: { username: candidate }, select: { id: true } });
    if (!exists) return candidate;
  }
  return `user${crypto.randomBytes(3).toString('hex')}`;
}
