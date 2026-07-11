import { useInstallPrompt } from '../hooks/useInstallPrompt';
import { InstallBanner } from './InstallBanner';
import { PwaInstallPrompt } from './PwaInstallPrompt';

/** Instalación PWA inteligente: modal auto al entrar + banner compacto en Hub */
export function PwaInstallGate({ compactBanner = false }: { compactBanner?: boolean }) {
  const install = useInstallPrompt();

  if (install.installed || !install.canInstall) return null;

  return (
    <>
      <PwaInstallPrompt
        open={install.autoVisible}
        canNativeInstall={install.canNativeInstall}
        needsIOSGuide={install.needsIOSGuide}
        onInstall={install.install}
        onDismiss={install.dismiss}
      />
      {compactBanner && !install.autoVisible && (
        <InstallBanner onInstall={() => install.showPrompt()} onDismiss={install.dismiss} />
      )}
    </>
  );
}
