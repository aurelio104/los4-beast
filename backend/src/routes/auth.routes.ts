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

export const authRouter = Router();

const loginSchema = z.object({
  identifier: z.string().min(1),
  password: z.string().min(1)
});

const joinSchema = z.object({
  inviteCode: z.string().min(1),
  username: z.string().min(3).max(30),
  email: z.string().email(),
  password: z.string().min(8),
  displayName: z.string().min(2).max(50),
  nickname: z.string().max(30).optional(),
  gender: z.enum(['M', 'F', 'OTHER']).default('OTHER')
});

function sanitizeUser(user: {
  id: string;
  username: string;
  email: string;
  role: string;
  displayName: string;
  nickname: string | null;
  gender: string;
  beastPoints: number;
  passkeyRegistered: boolean;
  avatarEmoji?: string;
}) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    displayName: user.displayName,
    nickname: user.nickname,
    gender: user.gender,
    beastPoints: user.beastPoints,
    avatarEmoji: user.avatarEmoji ?? '😎',
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
  const valid = req.params.code === (process.env.INVITE_CODE || 'BEAST2026');
  res.json({ success: true, valid, challengeDate: process.env.CHALLENGE_DATE || '2026-08-29T20:00:00-04:00' });
});

authRouter.post('/join', async (req: Request, res: Response) => {
  try {
    const data = joinSchema.parse(req.body);
    if (data.inviteCode !== (process.env.INVITE_CODE || 'BEAST2026')) {
      return res.status(403).json({ success: false, error: 'Código de invitación inválido' });
    }

    const existing = await prisma.user.findFirst({
      where: { OR: [{ username: data.username }, { email: data.email }] }
    });
    if (existing) {
      return res.status(400).json({ success: false, error: 'Usuario o email ya registrado' });
    }

    const passwordHash = await bcrypt.hash(data.password, 10);
    const user = await prisma.user.create({
      data: {
        username: data.username,
        email: data.email,
        passwordHash,
        displayName: data.displayName,
        nickname: data.nickname,
        gender: data.gender,
        role: 'PLAYER'
      }
    });

    await prisma.gameAction.create({
      data: {
        userId: user.id,
        type: 'JOIN',
        pointsDelta: 50,
        metadata: JSON.stringify({ displayName: user.displayName })
      }
    });

    await prisma.user.update({
      where: { id: user.id },
      data: { beastPoints: { increment: 50 } }
    });

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
      displayName: true,
      nickname: true,
      gender: true,
      beastPoints: true,
      passkeyRegistered: true
    },
    orderBy: { beastPoints: 'desc' }
  });
  res.json({ success: true, players });
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
    inviteCode: process.env.INVITE_CODE || 'BEAST2026',
    challengeDate: process.env.CHALLENGE_DATE || '2026-08-29T20:00:00-04:00'
  });
});

export { bearerUserId };
