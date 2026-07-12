/** Sincroniza insets de safe-area en :root (iOS/Android, primer frame y tras resize). */
export function syncSafeAreaInsets() {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  const probe = document.createElement('div');
  probe.style.cssText =
    'position:fixed;top:0;left:0;visibility:hidden;pointer-events:none;' +
    'padding-top:constant(safe-area-inset-top);padding-top:env(safe-area-inset-top);' +
    'padding-right:constant(safe-area-inset-right);padding-right:env(safe-area-inset-right);' +
    'padding-bottom:constant(safe-area-inset-bottom);padding-bottom:env(safe-area-inset-bottom);' +
    'padding-left:constant(safe-area-inset-left);padding-left:env(safe-area-inset-left)';
  document.documentElement.appendChild(probe);
  const s = getComputedStyle(probe);
  root.style.setProperty('--safe-top', s.paddingTop);
  root.style.setProperty('--safe-right', s.paddingRight);
  root.style.setProperty('--safe-bottom', s.paddingBottom);
  root.style.setProperty('--safe-left', s.paddingLeft);
  probe.remove();

  const vv = window.visualViewport;
  if (vv) {
    const gap = Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop));
    root.style.setProperty('--viewport-bottom-gap', `${gap}px`);
  } else {
    root.style.setProperty('--viewport-bottom-gap', '0px');
  }
}

export function installSafeAreaListeners() {
  syncSafeAreaInsets();
  requestAnimationFrame(() => {
    syncSafeAreaInsets();
    requestAnimationFrame(syncSafeAreaInsets);
  });
  const run = () => syncSafeAreaInsets();
  window.addEventListener('resize', run, { passive: true });
  window.addEventListener('orientationchange', () => window.setTimeout(run, 80));
  window.visualViewport?.addEventListener('resize', run, { passive: true });
  window.visualViewport?.addEventListener('scroll', run, { passive: true });
  return () => {
    window.removeEventListener('resize', run);
    window.visualViewport?.removeEventListener('resize', run);
    window.visualViewport?.removeEventListener('scroll', run);
  };
}
