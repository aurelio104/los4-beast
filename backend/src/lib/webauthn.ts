import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse
} from '@simplewebauthn/server';
import { prisma } from './prisma.js';

const WEBAUTHN_RP_NAME = process.env.WEBAUTHN_RP_NAME || 'LOS 4 Beast';
const WEBAUTHN_ORIGIN = process.env.WEBAUTHN_ORIGIN || 'http://localhost:3011';

function getRpId(): string {
  const env = process.env.WEBAUTHN_RP_ID;
  if (env) return env;
  try {
    return new URL(WEBAUTHN_ORIGIN).hostname;
  } catch {
    return 'localhost';
  }
}

const WEBAUTHN_RP_ID = getRpId();

export const webauthnConfig = {
  rpName: WEBAUTHN_RP_NAME,
  rpID: WEBAUTHN_RP_ID,
  origin: WEBAUTHN_ORIGIN
};

export function getExpectedOrigin(requestOrigin?: string): string {
  const list = process.env.WEBAUTHN_ORIGINS?.split(',').map((o) => o.trim()).filter(Boolean) ?? [WEBAUTHN_ORIGIN];
  if (requestOrigin && list.includes(requestOrigin)) return requestOrigin;
  return webauthnConfig.origin;
}

export async function storeChallengeValue(
  challengeValue: string,
  userId: string | null,
  type: 'registration' | 'authentication'
): Promise<void> {
  await prisma.webAuthnChallenge.create({
    data: {
      challenge: challengeValue,
      userId,
      type,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000)
    }
  });
}

export async function verifyChallenge(challengeValue: string) {
  const record = await prisma.webAuthnChallenge.findUnique({ where: { challenge: challengeValue } });
  if (!record || record.expiresAt < new Date()) return null;
  await prisma.webAuthnChallenge.delete({ where: { id: record.id } });
  return { userId: record.userId, type: record.type };
}

export async function savePasskey(data: {
  userId: string;
  credentialId: string;
  publicKey: string;
  counter: number;
  deviceName?: string;
}) {
  await prisma.passkey.create({
    data: {
      userId: data.userId,
      credentialId: data.credentialId,
      publicKey: data.publicKey,
      counter: BigInt(data.counter),
      deviceName: data.deviceName ?? 'Dispositivo'
    }
  });
  await prisma.user.update({
    where: { id: data.userId },
    data: { passkeyRegistered: true }
  });
}

export async function findPasskeyByCredentialId(credentialId: string) {
  return prisma.passkey.findFirst({
    where: { credentialId, isActive: true },
    include: { user: true }
  });
}

export async function findPasskeysByUserId(userId: string) {
  return prisma.passkey.findMany({ where: { userId, isActive: true } });
}

export async function updatePasskeyCounter(credentialId: string, counter: number) {
  await prisma.passkey.updateMany({
    where: { credentialId },
    data: { counter: BigInt(counter), lastUsed: new Date() }
  });
}

export async function deletePasskeysByUserId(userId: string) {
  await prisma.passkey.deleteMany({ where: { userId } });
  await prisma.user.update({ where: { id: userId }, data: { passkeyRegistered: false } });
}

export async function getRegistrationOptions(userId: string, userEmail: string, userName: string) {
  const existingPasskeys = await findPasskeysByUserId(userId);
  const options = await generateRegistrationOptions({
    rpName: webauthnConfig.rpName,
    rpID: webauthnConfig.rpID,
    userID: new TextEncoder().encode(userId),
    userName: userEmail,
    userDisplayName: userName,
    attestationType: 'none',
    excludeCredentials: existingPasskeys.map((pk) => ({ id: pk.credentialId, type: 'public-key' as const })),
    authenticatorSelection: { residentKey: 'preferred', userVerification: 'preferred' }
  });
  await storeChallengeValue(options.challenge, userId, 'registration');
  return options;
}

export async function verifyRegistration(body: Record<string, unknown> & { deviceName?: string }, userId: string) {
  try {
    const verification = await verifyRegistrationResponse({
      response: body as unknown as Parameters<typeof verifyRegistrationResponse>[0]['response'],
      expectedChallenge: async (challenge) => {
        const result = await verifyChallenge(challenge);
        return result !== null && result.userId === userId;
      },
      expectedOrigin: webauthnConfig.origin,
      expectedRPID: webauthnConfig.rpID
    });
    if (!verification.verified || !verification.registrationInfo) {
      return { verified: false as const, error: 'Verificación fallida' };
    }
    const { credential } = verification.registrationInfo;
    await savePasskey({
      userId,
      credentialId: credential.id,
      publicKey: Buffer.from(credential.publicKey).toString('base64'),
      counter: credential.counter,
      deviceName: body.deviceName
    });
    return { verified: true as const };
  } catch (e) {
    return { verified: false as const, error: (e as Error).message };
  }
}

export async function getAuthenticationOptions() {
  const options = await generateAuthenticationOptions({
    rpID: webauthnConfig.rpID,
    userVerification: 'preferred',
    allowCredentials: []
  });
  await storeChallengeValue(options.challenge, null, 'authentication');
  return options;
}

export async function verifyAuthentication(body: Record<string, unknown>, requestOrigin?: string) {
  const id = (body.id ?? '') as string;
  const passkey = await findPasskeyByCredentialId(id);
  if (!passkey?.user) return { verified: false as const, error: 'Passkey no encontrada' };

  const publicKeyBuffer = Buffer.from(passkey.publicKey, 'base64');
  const expectedOrigin = getExpectedOrigin(requestOrigin);

  try {
    const verification = await verifyAuthenticationResponse({
      response: body as unknown as Parameters<typeof verifyAuthenticationResponse>[0]['response'],
      expectedChallenge: async (challenge) => (await verifyChallenge(challenge)) !== null,
      expectedOrigin,
      expectedRPID: webauthnConfig.rpID,
      credential: {
        id: passkey.credentialId,
        publicKey: new Uint8Array(publicKeyBuffer),
        counter: Number(passkey.counter)
      }
    });
    if (!verification.verified) return { verified: false as const, error: 'Verificación fallida' };
    await updatePasskeyCounter(passkey.credentialId, verification.authenticationInfo.newCounter);
    return {
      verified: true as const,
      userId: passkey.user.id,
      username: passkey.user.username,
      email: passkey.user.email,
      role: passkey.user.role,
      displayName: passkey.user.displayName
    };
  } catch (e) {
    return { verified: false as const, error: (e as Error).message };
  }
}
