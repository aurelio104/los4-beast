import { useInstallPrompt } from '../hooks/useInstallPrompt';
import { InstallBanner } from './InstallBanner';
import { PwaInstallPrompt } from './PwaInstallPrompt';
import { isSetupDone } from '../lib/setup';

function getUserId(): string | null {
  try {
    const raw = localStorage.getItem('user');
    return raw ? (JSON.parse(raw).id as string) : null;
  } catch {
    return null;
  }
}

/** Instalación PWA: banner discreto en Hub; modal solo si el usuario lo pide (nunca auto tras setup). */
export function PwaInstallGate({ compactBanner = false }: { compactBanner?: boolean }) {
  const userId = getUserId();
  const setupDone = isSetupDone(userId);
  const install = useInstallPrompt(userId);

  if (install.installed || !install.canInstall) return null;

  return (
    <>
      <PwaInstallPrompt
        open={install.promptOpen}
        canNativeInstall={install.canNativeInstall}
        needsIOSGuide={install.needsIOSGuide}
        onInstall={install.install}
        onDismiss={install.dismiss}
      />
      {setupDone && compactBanner && !install.promptOpen && (
        <InstallBanner onInstall={() => install.showPrompt()} onDismiss={install.dismiss} />
      )}
    </>
  );
}
