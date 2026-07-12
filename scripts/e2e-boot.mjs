#!/usr/bin/env node
/**
 * E2E arranque — verifica que la app sale del splash en iOS/Android simulados.
 * Uso: WEB_BASE=https://los4-beast.vercel.app node scripts/e2e-boot.mjs
 */
import { chromium, devices } from 'playwright';
import { buildIphoneMatrix } from './e2e-mobile-devices.mjs';

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

async function assertBootClears(page, label, path, authed = false) {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  await page.goto(`${WEB}${path}`, { waitUntil: 'commit', timeout: 25000 });

  const splashGone = await page
    .waitForFunction(() => !document.getElementById('boot-splash'), { timeout: 20000 })
    .then(() => true)
    .catch(() => false);

  if (splashGone) ok(`${label} splash desaparece`, path);
  else bad(`${label} splash desaparece`, path);

  const hasContent = await page.waitForFunction(
    () => {
      const root = document.getElementById('root');
      if (!root) return false;
      const text = root.innerText.trim();
      const login = document.querySelector('form input');
      const hub = document.querySelector('.hub-layout, .bottom-nav-bar');
      return text.length > 20 || !!login || !!hub;
    },
    { timeout: 25000 }
  ).then(() => true).catch(() => false);

  if (hasContent) ok(`${label} contenido visible`, path);
  else bad(`${label} contenido visible`, path);

  if (errors.length) bad(`${label} errores JS`, errors.slice(0, 2).join(' | '));
  else ok(`${label} sin errores JS`, path);

  return { splashGone, hasContent };
}

async function main() {
  console.log(`\n🚀 E2E arranque — ${WEB}\n`);

  const browser = await chromium.launch({ headless: true });
  const iphone16Pro = buildIphoneMatrix(devices).find((e) => e.label.startsWith('iPhone 16 Pro · iOS 27'));
  const ctx = await browser.newContext({
    ...(iphone16Pro?.device || devices['iPhone 15 Pro']),
    locale: 'es-ES',
    serviceWorkers: 'allow'
  });

  // Login público
  {
    const page = await ctx.newPage();
    await assertBootClears(page, 'iPhone 16 Pro iOS27', '/login', false);
    await page.close();
  }

  // Hub autenticado
  try {
    const { token, user } = await loginSession();
    const page = await ctx.newPage();
    await page.addInitScript(({ token, user }) => {
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem(`reto_setup_done_${user.id}`, '1');
    }, { token, user });
    await assertBootClears(page, 'iPhone 16 Pro iOS27 authed', '/', true);
    await page.close();
  } catch (e) {
    bad('Hub autenticado', (e).message || String(e));
  }

  // PWA con SW — simular segunda visita
  {
    const page = await ctx.newPage();
    await page.goto(`${WEB}/login`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.reload({ waitUntil: 'domcontentloaded' });
    const splash = await page.$('#boot-splash');
    if (!splash) ok('Tras reload: sin splash');
    else bad('Tras reload: splash persiste');
    await page.close();
  }

  await ctx.close();
  await browser.close();

  console.log(`\n✅ ${pass.length}  ❌ ${fail.length}\n`);
  if (fail.length) {
    for (const f of fail) console.log(`  ❌ ${f.name}: ${f.detail}`);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error('FATAL:', e.message || e);
  process.exit(1);
});
