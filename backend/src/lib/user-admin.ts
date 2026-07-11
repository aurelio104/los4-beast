import { prisma } from './prisma.js';
import { deleteAvatarFiles, deleteBackgroundFiles } from './uploads.js';
import { deletePasskeysByUserId } from './webauthn.js';

export async function adminResetUserPasskey(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.isActive) {
    throw new Error('Usuario no encontrado');
  }
  await deletePasskeysByUserId(userId);
  return { passkeyRegistered: false };
}

export async function adminDeleteUser(targetId: string, actingAdminId: string) {
  const user = await prisma.user.findUnique({ where: { id: targetId } });
  if (!user) throw new Error('Usuario no encontrado');
  if (user.role === 'MASTER') throw new Error('No puedes eliminar una cuenta admin');
  if (targetId === actingAdminId) throw new Error('No puedes eliminar tu propia cuenta');

  deleteAvatarFiles(targetId);
  deleteBackgroundFiles(targetId);

  await prisma.$transaction([
    prisma.redemption.deleteMany({ where: { userId: targetId } }),
    prisma.user.delete({ where: { id: targetId } })
  ]);

  return { deleted: true };
}

export async function adminSetUserActive(userId: string, isActive: boolean) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error('Usuario no encontrado');
  if (user.role === 'MASTER' && !isActive) {
    throw new Error('No puedes desactivar una cuenta admin');
  }

  await prisma.user.update({ where: { id: userId }, data: { isActive } });
  return { isActive };
}
