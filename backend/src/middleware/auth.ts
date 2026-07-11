import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';

export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (process.env.NODE_ENV === 'production' && !secret) {
    throw new Error('JWT_SECRET requerido en producción');
  }
  return secret || 'dev-secret-los4';
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'No autorizado' });
    }
    const token = authHeader.replace('Bearer ', '');
    const decoded = jwt.verify(token, getJwtSecret()) as { userId: string; role?: string };
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, role: true, isActive: true }
    });
    if (!user?.isActive) {
      return res.status(401).json({ success: false, error: 'Usuario no encontrado' });
    }
    (req as Request & { user: { id: string; userId: string; role: string } }).user = {
      id: user.id,
      userId: user.id,
      role: user.role
    };
    next();
  } catch {
    return res.status(401).json({ success: false, error: 'Token inválido' });
  }
}

export function requireMaster(req: Request, res: Response, next: NextFunction) {
  const user = (req as Request & { user?: { role: string } }).user;
  if (!user || user.role !== 'MASTER') {
    return res.status(403).json({ success: false, error: 'Solo admin' });
  }
  next();
}
