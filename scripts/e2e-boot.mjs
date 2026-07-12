#!/usr/bin/env node
/**
 * E2E arranque — verifica splash + contenido en iOS y Android simulados.
 * Uso: WEB_BASE=http://127.0.0.1:3011 node scripts/e2e-boot.mjs
 */
import { chromium, devices } from 'playwright';
import { buildIphoneMatrix, buildAndroidMatrix } from './e2e-mobile-devices.mjs';

const WEB = process.env.WEB_BASE || 'http://127.0.0.1:3011';
const API = process.env.API_BASE || 'http://127.0.0.1:3010/api';
const ADMIN_USER = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASSWORD || 'Admin123!';

const fail = [];
const pass = [];

function ok(name, detail = '') {
  pass.push(name);
  console.log(`  ✅ ${name}${detail ? ` — ${detail}` : ''}`);
}
function bad(name, detail = '') {
  fail.push({ name, detail });
  console.log(`  ❌ ${name}${detail ? ` — ${detail}` : ''}`);
}

async function loginSession() {
  const res = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: ADMIN_USER, password: ADMIN_PASS })
  });
  const json = await res.json();
  if (!json.token) throw new Error(json.error || 'login failed');
  return { token: json.token, user: json.user };
}

async function assertBootClears(page, label, path) {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error' && !/401|Failed to load resource/i.test(msg.text())) {
      errors.push(msg.text());
    }
  });

  await page.goto(`${WEB}${path}`, { waitUntil: 'commit', timeout: 25000 });

  const splashGone = await page
    .waitForFunction(() => !document.getElementById('boot-splash'), { timeout: 20000 })
    .then(() => true)
    .catch(() => false);

  if (splashGone) ok(`${label} splash desaparece`, path);
  else bad(`${label} splash desaparece`, path);

  const hasContent = await page
    .waitForFunction(
      () => {
        const root = document.getElementById('root');
        if (!root) return false;
        const text = root.innerText.trim();
        const login = document.querySelector('form input');
        const hub = document.querySelector('.hub-layout, .bottom-nav-bar');
        return text.length > 20 || !!login || !!hub;
      },
      { timeout: 25000 }
    )
    .then(() => true)
    .catch(() => false);

  if (hasContent) ok(`${label} contenido visible`, path);
  else bad(`${label} contenido visible`, path);

  const splashOutsideRoot = await page.evaluate(() => {
    const splash = document.getElementById('boot-splash');
    const root = document.getElementById('root');
    return !!splash?.parentElement && splash.parentElement !== root;
  });
  if (splashOutsideRoot || splashGone) ok(`${label} splash fuera de #root o removido`);
  else bad(`${label} splash fuera de #root`);

  if (errors.length) bad(`${label} errores JS`, errors.slice(0, 2).join(' | '));
  else ok(`${label} sin errores JS críticos`);

  return { splashGone, hasContent };
}

async function runDeviceSuite(browser, deviceEntry, session, paths) {
  const ctx = await browser.newContext({
    ...deviceEntry.device,
    locale: 'es-ES',
    serviceWorkers: 'allow'
  });

  for (const { path, authed, label } of paths) {
    const page = await ctx.newPage();
    if (authed && session) {
      await page.addInitScript(({ token, user }) => {
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        localStorage.setItem(`reto_setup_done_${user.id}`, '1');
      }, session);
    }
    await assertBootClears(page, `${deviceEntry.label} ${label}`, path);
    await page.close();
  }

  // Reload tras primera visita (PWA / caché) — solo login público
  {
    const page = await ctx.newPage();
    try {
      await page.goto(`${WEB}/login`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(400);
      const splash = await page.$('#boot-splash');
      if (!splash) ok(`${deviceEntry.label} tras reload: sin splash`);
      else bad(`${deviceEntry.label} tras reload: splash persiste`);
    } catch (e) {
      bad(`${deviceEntry.label} tras reload`, (e).message?.slice(0, 60) || 'error');
    }
    await page.close().catch(() => {});
  }

  await ctx.close();
}

async function main() {
  console.log(`\n🚀 E2E arranque iOS + Android — ${WEB}\n`);

  const iphoneMatrix = buildIphoneMatrix(devices);
  const androidMatrix = buildAndroidMatrix(devices);

  const iphoneTargets = [
    iphoneMatrix.find((e) => e.label === 'iPhone 16 Pro · iOS 27 beta'),
    iphoneMatrix.find((e) => e.label === 'iPhone 15 Pro · iOS 26'),
    iphoneMatrix.find((e) => e.label === 'iPhone 17 Pro Max · iOS 27 beta')
  ].filter(Boolean);

  const androidTargets = [
    androidMatrix.find((e) => e.label === 'Pixel 7'),
    androidMatrix.find((e) => e.label === 'Galaxy S9+'),
    androidMatrix.find((e) => e.label === 'Pixel 5'),
    androidMatrix.find((e) => e.label === 'Moto G4')
  ].filter(Boolean);

  let session = null;
  try {
    session = await loginSession();
    ok('Login API sesión', ADMIN_USER);
  } catch (e) {
    bad('Login API sesión', (e).message || String(e));
  }

  const browser = await chromium.launch({ headless: true });

  console.log('\n  —— iOS ——');
  for (const entry of iphoneTargets) {
    await runDeviceSuite(browser, entry, session, [
      { path: '/login', authed: false, label: 'login' },
      { path: '/', authed: true, label: 'hub' }
    ]);
  }

  console.log('\n  —— Android ——');
  for (const entry of androidTargets) {
    await runDeviceSuite(browser, entry, session, [
      { path: '/login', authed: false, label: 'login' },
      { path: '/', authed: true, label: 'hub' }
    ]);
  }

  await browser.close();

  console.log(`\n✅ PASS: ${pass.length}`);
  console.log(`❌ FAIL: ${fail.length}\n`);
  if (fail.length) {
    for (const f of fail) console.log(`  ❌ ${f.name}: ${f.detail}`);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error('FATAL:', e.message || e);
  process.exit(1);
});
