import { api } from './api';

export async function shareMemberInvite(): Promise<{ shared: boolean; code: string }> {
  const res = await api.createInvite();
  if (!res.success || !res.invite?.code) {
    throw new Error(res.error || 'No se pudo crear la invitación');
  }
  const shared = await shareInviteLink(res.invite.code, res.invite.inviterName);
  return { shared, code: res.invite.code };
}

export async function shareInviteLink(code: string, inviterName?: string) {
  const url = `${window.location.origin}/join/${code}`;
  const text = inviterName
    ? `${inviterName} te invita al Reto — 29 de agosto`
    : 'Te invitan al Reto — 29 de agosto';
  if (navigator.share) {
    await navigator.share({ title: 'Reto', text, url });
    return true;
  }
  await navigator.clipboard.writeText(url);
  return false;
}

/** @deprecated use shareMemberInvite */
export async function shareInvite(code: string) {
  return shareInviteLink(code);
}
