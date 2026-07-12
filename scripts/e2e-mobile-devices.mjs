/**
 * Matriz móvil completa — iPhone 15/16/17 (todos) + Android variado + iOS 26 / iOS 27 beta.
 */

export const IOS_RUNTIMES = [
  { id: 'ios26', label: 'iOS 26', osMajor: 26, osMinor: 0, safari: '26.0', beta: false },
  { id: 'ios27b', label: 'iOS 27 beta', osMajor: 27, osMinor: 0, safari: '27.0', beta: true }
];

/** Viewport Playwright (altura reducida) por modelo — ancho lógico real en pts. */
export const IPHONE_MODELS = [
  // —— 15 ——
  { label: 'iPhone 15', key: 'iPhone 15', width: 393, pwHeight: 659 },
  { label: 'iPhone 15 Plus', key: 'iPhone 15 Plus', width: 430, pwHeight: 739 },
  { label: 'iPhone 15 Pro', key: 'iPhone 15 Pro', width: 393, pwHeight: 659 },
  { label: 'iPhone 15 Pro Max', key: 'iPhone 15 Pro Max', width: 430, pwHeight: 739 },
  // —— 16 ——
  { label: 'iPhone 16', key: 'iPhone 15', width: 393, pwHeight: 659 },
  { label: 'iPhone 16 Plus', key: 'iPhone 15 Plus', width: 430, pwHeight: 739 },
  { label: 'iPhone 16 Pro', key: 'iPhone 15 Pro', width: 402, pwHeight: 677 },
  { label: 'iPhone 16 Pro Max', key: 'iPhone 15 Pro Max', width: 440, pwHeight: 758 },
  // —— 17 ——
  { label: 'iPhone 17', key: 'iPhone 15', width: 393, pwHeight: 659 },
  { label: 'iPhone 17 Plus', key: 'iPhone 15 Plus', width: 430, pwHeight: 739 },
  { label: 'iPhone 17 Pro', key: 'iPhone 15 Pro', width: 402, pwHeight: 677 },
  { label: 'iPhone 17 Pro Max', key: 'iPhone 15 Pro Max', width: 440, pwHeight: 758 }
];

export const ANDROID_MODELS = [
  { label: 'Pixel 7', key: 'Pixel 7' },
  { label: 'Pixel 5', key: 'Pixel 5' },
  { label: 'Pixel 4', key: 'Pixel 4' },
  { label: 'Pixel 2 XL', key: 'Pixel 2 XL' },
  { label: 'Galaxy S9+', key: 'Galaxy S9+' },
  { label: 'Galaxy S8', key: 'Galaxy S8' },
  { label: 'Galaxy S5', key: 'Galaxy S5' },
  { label: 'Galaxy Note 3', key: 'Galaxy Note 3' },
  { label: 'Moto G4', key: 'Moto G4' },
  { label: 'Nexus 5X', key: 'Nexus 5X' }
];

export const TAB_PATHS = ['/', '/arena', '/cofre', '/tienda', '/perfil'];

export function patchIosUserAgent(userAgent, runtime) {
  const beta = runtime.beta ? ' Beta' : '';
  return userAgent
    .replace(/CPU iPhone OS [\d_]+ like Mac OS X/, `CPU iPhone OS ${runtime.osMajor}_${runtime.osMinor} like Mac OS X`)
    .replace(/Version\/[\d.]+/, `Version/${runtime.safari}${beta}`);
}

function resolveIphoneDevice(devices, model) {
  const base = devices[model.key];
  if (!base) return null;
  return {
    ...base,
    viewport: { width: model.width, height: model.pwHeight }
  };
}

/** 12 iPhone × 2 iOS = 24 perfiles */
export function buildIphoneMatrix(devices) {
  const out = [];
  for (const model of IPHONE_MODELS) {
    const device = resolveIphoneDevice(devices, model);
    if (!device) continue;
    for (const ios of IOS_RUNTIMES) {
      out.push({
        label: `${model.label} · ${ios.label}`,
        device: {
          ...device,
          userAgent: patchIosUserAgent(device.userAgent, ios)
        },
        ios: ios.id
      });
    }
  }
  return out;
}

/** 10 Android variados */
export function buildAndroidMatrix(devices) {
  return ANDROID_MODELS.map((model) => {
    const device = devices[model.key];
    if (!device) return { label: model.label, device: null };
    return { label: model.label, device };
  }).filter((e) => e.device);
}

export async function assertBottomNavAtFloor(page, _label, _path, { immediate = false } = {}) {
  const nav = page.locator('.bottom-nav-bar');
  if (!(await nav.isVisible())) {
    return { ok: false, detail: 'nav no visible' };
  }
  if (!immediate) await page.waitForTimeout(350);
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

/** @deprecated usar buildIphoneMatrix */
export function buildIphoneDeviceMatrix(devices) {
  return buildIphoneMatrix(devices);
}
