import { useCallback, useEffect, useRef, useState } from 'react';
import { canShowInstallUi, getInstallPlatform, isStandalone, type InstallPlatform } from '../lib/pwa';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'pwa_install_dismissed_at';
const DISMISS_DAYS = 3;

function isDismissedRecently(): boolean {
  const raw = localStorage.getItem(DISMISS_KEY);
  if (!raw) return false;
  const ts = Number(raw);
  if (!Number.isFinite(ts)) return true;
  return Date.now() - ts < DISMISS_DAYS * 24 * 60 * 60 * 1000;
}

export function useInstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(isDismissedRecently);
  const [installed, setInstalled] = useState(isStandalone);
  const [platform, setPlatform] = useState<InstallPlatform>(() => getInstallPlatform());
  const [autoVisible, setAutoVisible] = useState(false);
  const autoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
      setAutoVisible(false);
      setPlatform('installed');
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  useEffect(() => {
    if (!canShowInstallUi() || dismissed || installed) return;

    autoTimer.current = setTimeout(() => {
      setAutoVisible(true);
    }, 1200);

    return () => {
      if (autoTimer.current) clearTimeout(autoTimer.current);
    };
  }, [dismissed, installed]);

  const install = useCallback(async () => {
    if (!deferred) return false;
    await deferred.prompt();
    const choice = await deferred.userChoice;
    setDeferred(null);
    if (choice.outcome === 'accepted') {
      setInstalled(true);
      setAutoVisible(false);
    }
    return choice.outcome === 'accepted';
  }, [deferred]);

  const dismiss = useCallback(() => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setDismissed(true);
    setAutoVisible(false);
  }, []);

  const showPrompt = useCallback(() => setAutoVisible(true), []);

  const needsIOSGuide = platform === 'ios' && !installed;
  const canNativeInstall = !!deferred && !installed;

  return {
    canInstall: canShowInstallUi() && !installed && !dismissed && (canNativeInstall || needsIOSGuide),
    canNativeInstall,
    needsIOSGuide,
    installed,
    platform,
    autoVisible: autoVisible && canShowInstallUi() && !installed && !dismissed,
    install,
    dismiss,
    showPrompt
  };
}
