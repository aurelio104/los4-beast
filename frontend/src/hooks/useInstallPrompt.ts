import { useCallback, useEffect, useRef, useState } from 'react';
import { canShowInstallUi, getInstallPlatform, isStandalone, type InstallPlatform } from '../lib/pwa';
import { dismissPwaInstallPrompt, isPwaDismissed, isPwaInstallPromptSeen, isSetupDone } from '../lib/setup';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function useInstallPrompt(userId?: string | null) {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(() => isPwaDismissed(userId));
  const [installed, setInstalled] = useState(isStandalone);
  const [platform, setPlatform] = useState<InstallPlatform>(() => getInstallPlatform());
  const [autoVisible, setAutoVisible] = useState(false);
  const [manualVisible, setManualVisible] = useState(false);
  const autoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setDismissed(isPwaDismissed(userId));
  }, [userId]);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
      setAutoVisible(false);
      setManualVisible(false);
      setPlatform('installed');
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const skipAutoModal = isSetupDone(userId) || isPwaInstallPromptSeen(userId) || installed;

  useEffect(() => {
    if (!canShowInstallUi() || skipAutoModal) {
      setAutoVisible(false);
      return;
    }

    autoTimer.current = setTimeout(() => {
      setAutoVisible(true);
    }, 1200);

    return () => {
      if (autoTimer.current) clearTimeout(autoTimer.current);
    };
  }, [skipAutoModal, userId]);

  const install = useCallback(async () => {
    if (!deferred) return false;
    await deferred.prompt();
    const choice = await deferred.userChoice;
    setDeferred(null);
    if (choice.outcome === 'accepted') {
      setInstalled(true);
      setAutoVisible(false);
      setManualVisible(false);
    }
    return choice.outcome === 'accepted';
  }, [deferred]);

  const dismiss = useCallback(() => {
    if (userId) dismissPwaInstallPrompt(userId);
    setDismissed(true);
    setAutoVisible(false);
    setManualVisible(false);
  }, [userId]);

  const showPrompt = useCallback(() => setManualVisible(true), []);

  const needsIOSGuide = platform === 'ios' && !installed;
  const canNativeInstall = !!deferred && !installed;
  const canInstall = canShowInstallUi() && !installed && !dismissed && (canNativeInstall || needsIOSGuide);
  const promptOpen =
    canInstall && !installed && !dismissed && (manualVisible || (autoVisible && !isSetupDone(userId)));

  return {
    canInstall,
    canNativeInstall,
    needsIOSGuide,
    installed,
    platform,
    promptOpen,
    install,
    dismiss,
    showPrompt
  };
}
