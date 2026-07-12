#!/usr/bin/env node
/**
 * E2E móvil — iPhone 15/16/17 (todos) × iOS 26/27 beta + Android variado.
 * Uso: node scripts/e2e-mobile.mjs
 */
import { chromium, devices } from 'playwright';
import {
  buildIphoneMatrix,
  buildAndroidMatrix,
  assertBottomNavAtFloor,
  TAB_PATHS,
  IPHONE_MODELS,
  ANDROID_MODELS,
  IOS_RUNTIMES
} from './e2e-mobile-devices.mjs';

const WEB = process.env.WEB_BASE || 'http://127.0.0.1:3011';
const API = process.env.API_BASE || 'http://127.0.0.1:3010/api';
const ADMIN_USER = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASSWORD || 'Admin123!';

const results = { pass: [], fail: [] };
function ok(name, detail = '') {
  results.pass.push({ name, detail });
  console.log(`  ✅ ${name}${detail ? ` — ${detail}` : ''}`);
}
function bad(name, detail = '') {
  results.fail.push({ name, detail });
  console.log(`  ❌ ${name}${detail ? ` — ${detail}` : ''}`);
}

async function loginSession() {
  const res = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: ADMIN_USER, password: ADMIN_PASS })
  });
  const json = await res.json();
  if (!json.token) throw new Error(`Login falló: ${json.error || res.status}`);
  return { token: json.token, user: json.user };
}

async function seedContext(browser, device, token, user) {
  const ctx = await browser.newContext({ ...device, locale: 'es-ES' });
  return ctx;
}

async function openAuthedPage(ctx, token, user, path) {
  const page = await ctx.newPage();
  await page.addInitScript(
    ({ token, user }) => {
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem(`reto_setup_done_${user.id}`, '1');
    },
    { token, user }
  );
  await page.goto(`${WEB}${path}`, { waitUntil: 'domcontentloaded' });
  return page;
}

async function runNavMatrix(browser, matrix, token, user, prefix) {
  for (const entry of matrix) {
    if (!entry.device) {
      bad(`${prefix} ${entry.label}`, 'dispositivo no disponible');
      continue;
    }
    const ctx = await seedContext(browser, entry.device, token, user);
    for (const path of TAB_PATHS) {
      const page = await openAuthedPage(ctx, token, user, path);
      const instant = await assertBottomNavAtFloor(page, entry.label, path, { immediate: true });
      if (instant.ok) ok(`${entry.label} ${path}: nav abajo al abrir`, instant.detail);
      else bad(`${entry.label} ${path}: nav abajo al abrir`, instant.detail);
      const settled = await assertBottomNavAtFloor(page, entry.label, path);
      if (settled.ok) ok(`${entry.label} ${path}: nav al fondo`, settled.detail);
      else bad(`${entry.label} ${path}: nav al fondo`, settled.detail);
      await page.close();
    }
    await ctx.close();
  }
}

async function main() {
  const iphoneMatrix = buildIphoneMatrix(devices);
  const androidMatrix = buildAndroidMatrix(devices);

  console.log('\n📱 E2E móvil Reto');
  console.log(`   iPhone: ${IPHONE_MODELS.length} modelos × ${IOS_RUNTIMES.length} OS = ${iphoneMatrix.length} perfiles`);
  console.log(`   Android: ${androidMatrix.length} dispositivos`);
  console.log(`   Rutas tab: ${TAB_PATHS.join(', ')}\n`);

  const { token, user } = await loginSession();
  const browser = await chromium.launch({ headless: true });

  // Login público primero (sin sesión) — lazy chunk; no aborta la matriz si tarda
  {
    const ctx = await browser.newContext({ locale: 'es-ES' });
    const page = await ctx.newPage();
    try {
      await page.goto(`${WEB}/login`, { waitUntil: 'commit', timeout: 20000 });
      const ready = await page.waitForFunction(
        () => document.querySelectorAll('form input').length >= 2,
        { timeout: 30000 }
      );
      if (ready) ok('Login: formulario');
      else bad('Login: formulario', 'inputs insuficientes');
    } catch (e) {
      bad('Login: formulario', (e).message?.slice(0, 80) || 'timeout');
    }
    await ctx.close();
  }

  {
    const page = await browser.newPage();
    const manifest = await page.request.get(`${WEB}/manifest.webmanifest`);
    if (manifest.ok()) {
      const m = await manifest.json();
      if (m.name === 'Reto' && m.display === 'standalone') ok('PWA: manifest Reto standalone');
      else bad('PWA: manifest');
    } else bad('PWA: manifest');
    if ((await page.request.get(`${WEB}/sw.js`)).ok()) ok('PWA: service worker');
    else bad('PWA: service worker');
    await page.close();
  }

  const baseline = iphoneMatrix.find((e) => e.label.startsWith('iPhone 15 Pro · iOS 26')) ?? iphoneMatrix[0];
  const baselineCtx = await seedContext(browser, baseline.device, token, user);

  const seedPage = async () => openAuthedPage(baselineCtx, token, user, '/');

  // --- Flujos críticos (iPhone 15 Pro · iOS 26) ---
  {
    const page = await openAuthedPage(baselineCtx, token, user, '/');
    await page.waitForTimeout(1200);
    if (await page.locator('.app-shell-bg').count()) ok('Hub: capa app-shell-bg');
    else bad('Hub: capa app-shell-bg');
    const poster = await page.locator('.app-shell-bg img[src*="beach-poster"]').count();
    const video = await page.locator('.app-shell-bg video').count();
    if (poster || video) ok('Hub: fondo playa', `${poster ? 'poster' : ''}${video ? ' video' : ''}`);
    else bad('Hub: fondo playa');
    if (await page.locator('.hub-layout').isVisible()) ok('Hub: layout visible');
    else bad('Hub: layout visible');
    if (await page.locator('.bottom-nav-bar').isVisible()) ok('Hub: bottom nav');
    else bad('Hub: bottom nav');
    await page.close();
  }

  {
    const page = await openAuthedPage(baselineCtx, token, user, '/');
    await page.locator('.story-bubble').first().waitFor({ state: 'visible', timeout: 15000 });
    await page.locator('.story-bubble').first().click();
    await page.waitForTimeout(600);
    const viewer = page.locator('.story-viewer[role="dialog"]');
    if (await viewer.isVisible()) ok('Historias: visor abre');
    else bad('Historias: visor abre');
    await viewer.locator('button[aria-label="Cerrar"]').click();
    await page.waitForTimeout(400);
    if (!(await viewer.isVisible())) ok('Historias: visor cierra');
    else bad('Historias: visor cierra');
    await page.close();
  }

  for (const route of [
    { path: '/arena', label: 'Arena' },
    { path: '/cofre', label: 'Cofre' },
    { path: '/tienda', label: 'Tienda' },
    { path: '/perfil', label: 'Perfil' },
    { path: '/', label: 'Hub' }
  ]) {
    const page = await openAuthedPage(baselineCtx, token, user, route.path);
    await page.waitForTimeout(500);
    if (await page.locator('.bottom-nav-bar').isVisible()) ok(`Nav: ${route.label}`, route.path);
    else bad(`Nav: ${route.label}`, route.path);
    await page.close();
  }

  {
    const page = await openAuthedPage(baselineCtx, token, user, '/chat');
    const input = page.getByPlaceholder('Escribe al grupo...');
    await input.waitFor({ state: 'visible', timeout: 15000 });
    if (await input.isVisible()) ok('Chat: input mensaje');
    else bad('Chat: input mensaje');
    await page.close();
  }

  await baselineCtx.close();

  console.log('\n  —— iPhone 15/16/17 · iOS 26 + iOS 27 beta ——');
  await runNavMatrix(browser, iphoneMatrix, token, user, 'iPhone');

  console.log('\n  —— Android variado ——');
  await runNavMatrix(browser, androidMatrix, token, user, 'Android');

  await browser.close();

  console.log(`\n✅ PASS: ${results.pass.length}`);
  console.log(`❌ FAIL: ${results.fail.length}\n`);
  if (results.fail.length) {
    for (const f of results.fail) console.log(`  ❌ ${f.name}: ${f.detail}`);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error('FATAL:', e.message || e);
  process.exit(1);
});
