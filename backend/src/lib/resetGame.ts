import { prisma } from './prisma.js';
import { deleteAvatarFiles, deleteBackgroundFiles } from './uploads.js';

export type ResetSummary = {
  deletedUsers: number;
  deletedActions: number;
  deletedInvites: number;
  deletedChat: number;
  deletedVotes: number;
  deletedAlliances: number;
  deletedChests: number;
  deletedConfessions: number;
  deletedRedemptions: number;
  resetMasters: number;
};

/** Borra todo el progreso del juego y deja cuentas master en cero. */
export async function resetGameToZero(): Promise<ResetSummary> {
  const playerIds = (
    await prisma.user.findMany({
      where: { role: { not: 'MASTER' } },
      select: { id: true }
    })
  ).map((u) => u.id);

  for (const id of playerIds) {
    deleteAvatarFiles(id);
    deleteBackgroundFiles(id);
  }

  const [
    deletedActions,
    deletedInvites,
    deletedChat,
    deletedVotes,
    deletedAlliances,
    deletedChests,
    deletedConfessions,
    deletedRedemptions,
    deletedUsers
  ] = await prisma.$transaction([
    prisma.gameAction.deleteMany(),
    prisma.invite.deleteMany(),
    prisma.chatMessage.deleteMany(),
    prisma.vote.deleteMany(),
    prisma.alliance.deleteMany(),
    prisma.chestClaim.deleteMany(),
    prisma.confession.deleteMany(),
    prisma.redemption.deleteMany(),
    prisma.user.deleteMany({ where: { role: { not: 'MASTER' } } }),
    prisma.pushSubscription.deleteMany(),
    prisma.webAuthnChallenge.deleteMany()
  ]);

  const resetMasters = await prisma.user.updateMany({
    where: { role: 'MASTER' },
    data: {
      points: 0,
      lastContinuedAt: null,
      clemencyUsedAt: null,
      bribeAcceptedCycle: null
    }
  });

  return {
    deletedUsers: deletedUsers.count,
    deletedActions: deletedActions.count,
    deletedInvites: deletedInvites.count,
    deletedChat: deletedChat.count,
    deletedVotes: deletedVotes.count,
    deletedAlliances: deletedAlliances.count,
    deletedChests: deletedChests.count,
    deletedConfessions: deletedConfessions.count,
    deletedRedemptions: deletedRedemptions.count,
    resetMasters: resetMasters.count
  };
}
