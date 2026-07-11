import crypto from 'crypto';
import { prisma } from './prisma.js';

const INVITE_TTL_DAYS = 14;

function randomCode(): string {
  return crypto.randomBytes(9).toString('base64url').slice(0, 12);
}

export async function createMemberInvite(inviterId: string) {
  const inviter = await prisma.user.findUnique({
    where: { id: inviterId },
    select: { id: true, isActive: true, displayName: true, nickname: true }
  });
  if (!inviter?.isActive) {
    throw new Error('No autorizado');
  }

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + INVITE_TTL_DAYS);

  let code = randomCode();
  for (let i = 0; i < 5; i++) {
    try {
      const invite = await prisma.invite.create({
        data: { code, inviterId, expiresAt }
      });
      return {
        code: invite.code,
        expiresAt: invite.expiresAt,
        inviterName: inviter.nickname || inviter.displayName
      };
    } catch {
      code = randomCode();
    }
  }
  throw new Error('No se pudo crear la invitación');
}

export async function validateInviteCode(code: string) {
  const invite = await prisma.invite.findUnique({
    where: { code },
    include: {
      inviter: {
        select: { displayName: true, nickname: true, avatarEmoji: true, avatarUrl: true, isActive: true }
      }
    }
  });

  if (!invite || invite.usedAt || !invite.inviter.isActive) {
    return { valid: false as const };
  }
  if (invite.expiresAt < new Date()) {
    return { valid: false as const, expired: true };
  }

  return {
    valid: true as const,
    inviterName: invite.inviter.nickname || invite.inviter.displayName,
    inviterEmoji: invite.inviter.avatarEmoji,
    inviterAvatarUrl: invite.inviter.avatarUrl,
    expiresAt: invite.expiresAt
  };
}

export async function consumeInvite(code: string, newUserId: string) {
  const invite = await prisma.invite.findUnique({ where: { code } });
  if (!invite || invite.usedAt || invite.expiresAt < new Date()) {
    throw new Error('Invitación inválida o expirada');
  }

  await prisma.$transaction([
    prisma.invite.update({
      where: { id: invite.id },
      data: { usedAt: new Date(), usedById: newUserId }
    }),
    prisma.user.update({
      where: { id: newUserId },
      data: { invitedById: invite.inviterId }
    })
  ]);

  const inviter = await prisma.user.findUnique({
    where: { id: invite.inviterId },
    select: { displayName: true, nickname: true }
  });

  return inviter?.nickname || inviter?.displayName || 'Un miembro';
}

export async function listActiveInvites(inviterId: string) {
  return prisma.invite.findMany({
    where: {
      inviterId,
      usedAt: null,
      expiresAt: { gt: new Date() }
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: { code: true, expiresAt: true, createdAt: true }
  });
}
