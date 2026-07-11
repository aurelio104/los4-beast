import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authMiddleware, getJwtSecret, requireMaster } from '../middleware/auth.js';
import {
  getRegistrationOptions,
  verifyRegistration,
  getAuthenticationOptions,
  verifyAuthentication,
  deletePasskeysByUserId
} from '../lib/webauthn.js';
import {
  createMemberInvite,
  validateInviteCode,
  consumeInvite,
  listActiveInvites
} from '../lib/invites.js';
import { normalizePhone } from '../lib/phone.js';
import { buildJoinCredentialsMessage, sendWhatsAppMessage } from '../lib/whatsapp.js';
import { generateUsernameFromEmail, isAcceptableUserPassword } from '../lib/user-credentials.js';
import { isGenericDisplayName, resolvePublicName } from '../lib/user-display.js';

export const authRouter = Router();

const loginSchema = z.object({
  identifier: z.string().min(1),
  password: z.string().min(1)
});

const joinSchema = z
  .object({
    inviteCode: z.string().min(1),
    username: z.string().min(3).max(30).optional(),
    email: z.string().email(),
    password: z.string().min(1),
    displayName: z.string().min(2).max(50),
    nickname: z.string().max(30).optional(),
    gender: z.enum(['M', 'F', 'OTHER']).default('OTHER'),
    phone: z.string().max(20).optional()
  })
  .superRefine((data, ctx) => {
    if (!isAcceptableUserPassword(data.password)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Usa un PIN de 4–6 dígitos o una contraseña de al menos 8 caracteres',
        path: ['password']
      });
    }
  });

function sanitizeUser(user: {
  id: string;
  username: string;
  email: string;
  role: string;
  displayName: string;
  nickname: string | null;
  gender: string;
  points: number;
  passkeyRegistered: boolean;
  avatarEmoji?: string | null;
  avatarUrl?: string | null;
  bio?: string | null;
  bgMode?: string | null;
  bgUrl?: string | null;
  phone?: string | null;
  whatsappOptIn?: boolean;
}) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    displayName: user.displayName,
    nickname: user.nickname,
    gender: user.gender,
    points: user.points,
    avatarEmoji: user.avatarEmoji ?? '😎',
    avatarUrl: user.avatarUrl ?? null,
    bio: user.bio ?? null,
    bgMode: user.bgMode ?? 'beach',
    bgUrl: user.bgUrl ?? null,
    phone: user.phone ?? null,
    whatsappOptIn: user.whatsappOptIn ?? false,
    hasPasskey: user.passkeyRegistered
  };
}

function bearerUserId(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return null;
  try {
    const decoded = jwt.verify(authHeader.replace('Bearer ', ''), getJwtSecret()) as { userId: string };
    return decoded.userId;
  } catch {
    return null;
  }
}

authRouter.get('/invite/:code', async (req: Request, res: Response) => {
  const code = String(req.params.code);
  const result = await validateInviteCode(code);
  res.json({
    success: true,
    valid: result.valid,
    expired: 'expired' in result ? result.expired : false,
    guestName: result.valid ? result.guestName : undefined,
    inviterName: result.valid ? result.inviterName : undefined,
    inviterEmoji: result.valid ? result.inviterEmoji : undefined,
    inviterAvatarUrl: result.valid ? result.inviterAvatarUrl : undefined,
    expiresAt: result.valid ? result.expiresAt : undefined,
    challengeDate: process.env.CHALLENGE_DATE || '2026-08-29T20:00:00-04:00'
  });
});

authRouter.post('/invites', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as Request & { user: { userId: string } }).user.userId;
    const invite = await createMemberInvite(userId);
    res.status(201).json({ success: true, invite });
  } catch (e) {
    res.status(400).json({ success: false, error: (e as Error).message || 'Error al crear invitación' });
  }
});

authRouter.get('/invites', authMiddleware, async (req: Request, res: Response) => {
  const userId = (req as Request & { user: { userId: string } }).user.userId;
  const invites = await listActiveInvites(userId);
  res.json({ success: true, invites });
});

authRouter.post('/join', async (req: Request, res: Response) => {
  try {
    const data = joinSchema.parse(req.body);
    const inviteCheck = await validateInviteCode(data.inviteCode);
    if (!inviteCheck.valid) {
      const msg = 'expired' in inviteCheck && inviteCheck.expired
        ? 'Esta invitación expiró. Pide una nueva a un miembro del grupo.'
        : 'Invitación inválida. Solo puedes unirte con un link de un integrante.';
      return res.status(403).json({ success: false, error: msg });
    }

    const existing = await prisma.user.findFirst({
      where: { email: data.email }
    });
    if (existing) {
      return res.status(400).json({ success: false, error: 'Este correo ya está registrado' });
    }

    const username =
      data.username?.trim() && data.username.trim().length >= 3
        ? data.username.trim()
        : await generateUsernameFromEmail(data.email);

    const usernameTaken = await prisma.user.findUnique({ where: { username } });
    if (usernameTaken) {
      return res.status(400).json({ success: false, error: 'No se pudo crear la cuenta. Prueba otro correo.' });
    }

    const passwordHash = await bcrypt.hash(data.password, 10);
    const phone = data.phone ? normalizePhone(data.phone) : null;

    const inviteRow = await prisma.invite.findUnique({ where: { code: data.inviteCode } });
    let displayName = data.displayName.trim();
    if (isGenericDisplayName(displayName) && inviteRow?.guestName?.trim()) {
      displayName = inviteRow.guestName.trim();
    }

    const user = await prisma.user.create({
      data: {
        username,
        email: data.email,
        passwordHash,
        displayName,
        nickname: data.nickname,
        gender: data.gender,
        phone,
        whatsappOptIn: !!phone,
        role: 'PLAYER'
      }
    });

    const inviterName = await consumeInvite(data.inviteCode, user.id);

    await prisma.gameAction.create({
      data: {
        userId: user.id,
        type: 'JOIN',
        pointsDelta: 50,
        metadata: JSON.stringify({ displayName: user.displayName, invitedBy: inviterName })
      }
    });

    await prisma.user.update({
      where: { id: user.id },
      data: { points: { increment: 50 } }
    });

    if (phone) {
      const waMsg = buildJoinCredentialsMessage({
        displayName: user.displayName,
        email: user.email,
        password: data.password
      });
      sendWhatsAppMessage(phone, waMsg, { bypassBotPause: true }).catch(() => {});
    }

    const token = jwt.sign({ userId: user.id, role: user.role }, getJwtSecret(), { expiresIn: '30d' });
    res.status(201).json({ success: true, token, user: sanitizeUser(user), needsPasskey: !user.passkeyRegistered });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: e.errors[0]?.message || 'Datos inválidos' });
    }
    console.error('join:', e);
    res.status(500).json({ success: false, error: 'Error al registrarse' });
  }
});

authRouter.post('/login', async (req: Request, res: Response) => {
  try {
    const { identifier, password } = loginSchema.parse(req.body);
    const user = await prisma.user.findFirst({
      where: { OR: [{ username: identifier }, { email: identifier }] }
    });
    if (!user?.isActive) {
      return res.status(200).json({ success: false, error: 'Credenciales inválidas' });
    }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(200).json({ success: false, error: 'Credenciales inválidas' });
    }
    const token = jwt.sign({ userId: user.id, role: user.role }, getJwtSecret(), { expiresIn: '30d' });
    res.json({
      success: true,
      token,
      user: sanitizeUser(user),
      needsPasskey: !user.passkeyRegistered
    });
  } catch (e) {
    res.status(400).json({ success: false, error: 'Datos inválidos' });
  }
});

authRouter.get('/me', authMiddleware, async (req: Request, res: Response) => {
  const userId = (req as Request & { user: { userId: string } }).user.userId;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return res.status(404).json({ success: false, error: 'No encontrado' });
  res.json({ success: true, user: sanitizeUser(user) });
});

authRouter.get('/webauthn/register-options', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as Request & { user: { userId: string } }).user.userId;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(401).json({ success: false, error: 'No encontrado' });
    const options = await getRegistrationOptions(user.id, user.email, user.displayName);
    res.json(options);
  } catch (e) {
    res.status(500).json({ success: false, error: 'Error al obtener opciones' });
  }
});

authRouter.post('/webauthn/register', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as Request & { user: { userId: string } }).user.userId;
    const result = await verifyRegistration(req.body, userId);
    if (!result.verified) return res.status(400).json({ success: false, error: result.error });
    res.json({ success: true });
  } catch {
    res.status(400).json({ success: false, error: 'Error al registrar passkey' });
  }
});

authRouter.get('/webauthn/challenge', async (_req, res) => {
  try {
    const options = await getAuthenticationOptions();
    res.json(options);
  } catch {
    res.status(500).json({ success: false, error: 'Error al generar challenge' });
  }
});

authRouter.post('/webauthn/verify', async (req: Request, res: Response) => {
  try {
    const origin = req.get('origin') || (req.headers.origin as string | undefined);
    const result = await verifyAuthentication(req.body, origin);
    if (!result.verified || !result.userId) {
      return res.status(200).json({ success: false, error: result.error || 'Verificación fallida' });
    }
    const user = await prisma.user.findUnique({ where: { id: result.userId } });
    if (!user) return res.status(200).json({ success: false, error: 'Usuario no encontrado' });
    const token = jwt.sign({ userId: user.id, role: user.role }, getJwtSecret(), { expiresIn: '30d' });
    res.json({ success: true, token, user: sanitizeUser(user) });
  } catch {
    res.status(200).json({ success: false, error: 'Error al verificar' });
  }
});

authRouter.delete('/webauthn/passkey', authMiddleware, async (req: Request, res: Response) => {
  const userId = (req as Request & { user: { userId: string } }).user.userId;
  await deletePasskeysByUserId(userId);
  res.json({ success: true });
});

authRouter.get('/players', authMiddleware, async (_req, res) => {
  const players = await prisma.user.findMany({
    where: { role: 'PLAYER', isActive: true },
    select: {
      id: true,
      username: true,
      displayName: true,
      nickname: true,
      gender: true,
      points: true,
      avatarEmoji: true,
      avatarUrl: true,
      bio: true,
      passkeyRegistered: true
    },
    orderBy: { points: 'desc' }
  });
  res.json({
    success: true,
    players: players.map((p) => ({
      ...p,
      displayName: resolvePublicName(p)
    }))
  });
});

authRouter.get('/admin/stats', authMiddleware, requireMaster, async (_req, res) => {
  const [players, actions, redemptions] = await Promise.all([
    prisma.user.count({ where: { role: 'PLAYER' } }),
    prisma.gameAction.count(),
    prisma.redemption.count()
  ]);
  res.json({
    success: true,
    stats: { players, actions, redemptions },
    challengeDate: process.env.CHALLENGE_DATE || '2026-08-29T20:00:00-04:00'
  });
});

export { bearerUserId };
