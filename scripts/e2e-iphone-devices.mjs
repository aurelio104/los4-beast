/**
 * Perfiles iPhone para E2E — 15 / 16 / 17 (Pro, Pro Max, Plus).
 * Playwright aún no incluye iPhone 16/17; usamos viewport lógico real + UA WebKit.
 */
export function buildIphoneDeviceMatrix(devices) {
  const base15Pro = devices['iPhone 15 Pro'];
  const base15ProMax = devices['iPhone 15 Pro Max'];

  const custom = (label, width, height, base = base15Pro) => ({
    label,
    device: {
      ...base,
      viewport: { width, height }
    }
  });

  return [
    { label: 'iPhone 15', key: 'iPhone 15' },
    { label: 'iPhone 15 Plus', key: 'iPhone 15 Plus' },
    { label: 'iPhone 15 Pro', key: 'iPhone 15 Pro' },
    { label: 'iPhone 15 Pro Max', key: 'iPhone 15 Pro Max' },
    // 16 Pro: 402×874 lógico → alto Playwright ~677 (ratio 15 Pro)
    custom('iPhone 16 Pro', 402, 677, base15Pro),
    // 16 Pro Max: 440×956 → ~758 (ratio 15 Pro Max)
    custom('iPhone 16 Pro Max', 440, 758, base15ProMax),
    // 17 Pro / Pro Max (misma resolución lógica que 16 hasta specs distintas)
    custom('iPhone 17 Pro', 402, 677, base15Pro),
    custom('iPhone 17 Pro Max', 440, 758, base15ProMax),
    { label: 'Pixel 5', key: 'Pixel 5' }
  ];
}

export async function assertBottomNavAtFloor(page, label, path, { immediate = false } = {}) {
  const nav = page.locator('.bottom-nav-bar');
  if (!(await nav.isVisible())) {
    return { ok: false, detail: 'nav no visible' };
  }
  if (!immediate) await page.waitForTimeout(400);
  const metrics = await nav.evaluate((el) => {
    const style = getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    return {
      bottom: style.bottom,
      position: style.position,
      gap: Math.round(window.innerHeight - rect.bottom),
      parent: el.parentElement?.tagName ?? 'none'
    };
  });
  const pass =
    metrics.position === 'fixed' &&
    metrics.bottom === '0px' &&
    metrics.gap <= 2 &&
    metrics.parent === 'BODY';
  return {
    ok: pass,
    detail: immediate
      ? `gap=${metrics.gap}px parent=${metrics.parent}`
      : `gap=${metrics.gap}px`
  };
}
