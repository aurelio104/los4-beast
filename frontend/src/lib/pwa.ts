export type InstallPlatform = 'ios' | 'android' | 'desktop' | 'installed';

export function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as Window & { MSStream?: unknown }).MSStream;
}

export function isAndroid(): boolean {
  return /Android/i.test(navigator.userAgent);
}

export function getInstallPlatform(): InstallPlatform {
  if (isStandalone()) return 'installed';
  if (isIOS()) return 'ios';
  if (isAndroid()) return 'android';
  return 'desktop';
}

export function canShowInstallUi(): boolean {
  return !isStandalone();
}
