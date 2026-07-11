import { prisma } from './prisma.js';

export async function awardPoints(
  userId: string,
  type: string,
  pointsDelta: number,
  metadata?: Record<string, unknown>,
  isAnonymous = false
) {
  const updated = await prisma.user.update({
    where: { id: userId },
    data: { points: pointsDelta >= 0 ? { increment: pointsDelta } : { decrement: Math.abs(pointsDelta) } }
  });

  await prisma.gameAction.create({
    data: {
      userId,
      type,
      pointsDelta,
      isAnonymous,
      metadata: metadata ? JSON.stringify(metadata) : undefined
    }
  });

  return { points: Math.max(0, updated.points), gained: pointsDelta };
}

export async function playedMiniGameToday(userId: string, type: string): Promise<boolean> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const found = await prisma.gameAction.findFirst({
    where: { userId, type, createdAt: { gte: today } }
  });
  return !!found;
}
