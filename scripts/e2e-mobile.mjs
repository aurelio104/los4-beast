#!/usr/bin/env node
/**
 * E2E móvil — rutas, navegación, historias, hub, chat.
 * Requiere: dev server + build opcional. Uso: node scripts/e2e-mobile.mjs
 */
import { chromium, devices } from 'playwright';

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

async function main() {
  console.log('\n📱 E2E móvil Reto\n');
  const { token, user } = await loginSession();

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    ...devices['iPhone 13'],
    locale: 'es-ES'
  });

  const seedPage = async () => {
    const page = await context.newPage();
    await page.addInitScript(
      ({ token, user }) => {
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        localStorage.setItem(`reto_setup_done_${user.id}`, '1');
      },
      { token, user }
    );
    return page;
  };

  // --- Hub + video fondo ---
  {
    const page = await seedPage();
    await page.goto(`${WEB}/`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);
    const hasShellBg = await page.locator('.app-shell-bg').count();
    if (hasShellBg) ok('Hub: capa app-shell-bg');
    else bad('Hub: capa app-shell-bg');
    const poster = await page.locator('.app-shell-bg img[src*="beach-poster"]').count();
    const video = await page.locator('.app-shell-bg video').count();
    if (poster || video) ok('Hub: fondo playa (poster/video)', `${poster ? 'poster' : ''}${video ? ' video' : ''}`);
    else bad('Hub: fondo playa');
    const hubLayout = await page.locator('.hub-layout').isVisible();
    if (hubLayout) ok('Hub: layout visible');
    else bad('Hub: layout visible');
    const nav = await page.locator('.bottom-nav-bar').isVisible();
    if (nav) ok('Hub: bottom nav');
    else bad('Hub: bottom nav');
    const navBottom = await page.locator('.bottom-nav-bar').evaluate((el) => getComputedStyle(el).bottom);
    if (navBottom === '0px') ok('Hub: nav pegada al fondo');
    else bad('Hub: nav pegada al fondo', navBottom);
    await page.close();
  }

  // --- Historias abrir/cerrar ---
  {
    const page = await seedPage();
    await page.goto(`${WEB}/`, { waitUntil: 'domcontentloaded' });
    await page.locator('.story-bubble').first().waitFor({ state: 'visible', timeout: 15000 });
    await page.locator('.story-bubble').first().click();
    await page.waitForTimeout(600);
    const viewer = page.locator('.story-viewer[role="dialog"]');
    if (await viewer.isVisible()) ok('Historias: visor abre');
    else bad('Historias: visor abre');
    const bodyOpen = await page.evaluate(() => document.body.classList.contains('story-viewer-open'));
    if (bodyOpen) ok('Historias: body.story-viewer-open');
    else bad('Historias: body.story-viewer-open');
    const bgVisible = await page.evaluate(() => {
      const bg = document.querySelector('.app-shell-bg');
      return bg ? getComputedStyle(bg).visibility !== 'hidden' : false;
    });
    if (bgVisible) ok('Historias: video hub no oculto detrás');
    else bad('Historias: video hub oculto incorrectamente');
    const stageBg = await viewer.locator('.story-viewer__stage').evaluate((el) => getComputedStyle(el).backgroundColor);
    if (stageBg === 'rgb(0, 0, 0)' || stageBg.includes('0, 0, 0')) ok('Historias: fondo negro stage');
    else bad('Historias: fondo stage', stageBg);
    await viewer.locator('button[aria-label="Cerrar"]').click();
    await page.waitForTimeout(400);
    if (!(await viewer.isVisible())) ok('Historias: visor cierra');
    else bad('Historias: visor cierra');
    if (!(await page.evaluate(() => document.body.classList.contains('story-viewer-open')))) ok('Historias: cleanup body class');
    else bad('Historias: cleanup body class');
    await page.close();
  }

  // --- Navegación bottom nav ---
  const routes = [
    { path: '/arena', label: 'Arena', hint: 'Arena' },
    { path: '/cofre', label: 'Cofre', hint: 'Cofre' },
    { path: '/tienda', label: 'Tienda', hint: 'Tienda' },
    { path: '/perfil', label: 'Perfil', hint: 'Perfil' },
    { path: '/', label: 'Hub', hint: 'Hub' }
  ];

  for (const route of routes) {
    const page = await seedPage();
    await page.goto(`${WEB}${route.path}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(800);
    if (page.url().includes(route.path === '/' ? WEB : route.path)) ok(`Nav: ${route.label}`, route.path);
    else bad(`Nav: ${route.label}`, page.url());
    const navVisible = await page.locator('.bottom-nav-bar').isVisible().catch(() => false);
    if (navVisible || route.path === '/chat') ok(`Nav: ${route.label} shell`);
    else if (route.path !== '/chat') bad(`Nav: ${route.label} sin nav`);
    await page.close();
  }

  // --- Chat ---
  {
    const page = await seedPage();
    await page.goto(`${WEB}/chat`, { waitUntil: 'domcontentloaded' });
    const input = page.getByPlaceholder('Escribe al grupo...');
    await input.waitFor({ state: 'visible', timeout: 15000 });
    if (page.url().includes('/chat')) ok('Chat: ruta carga');
    else bad('Chat: ruta carga');
    if (await input.isVisible()) ok('Chat: input mensaje');
    else bad('Chat: input mensaje');
    await page.close();
  }

  // --- Login público ---
  {
    const page = await context.newPage();
    await page.goto(`${WEB}/login`, { waitUntil: 'domcontentloaded' });
    await page.getByPlaceholder('tu@correo.com').waitFor({ state: 'visible', timeout: 15000 });
    const hasForm = await page.locator('form input').count();
    if (hasForm >= 2) ok('Login: formulario');
    else bad('Login: formulario', `inputs=${hasForm}`);
    await page.close();
  }

  // --- PWA assets ---
  {
    const page = await context.newPage();
    const manifest = await page.request.get(`${WEB}/manifest.webmanifest`);
    if (manifest.ok()) {
      const m = await manifest.json();
      if (m.name === 'Reto' && m.display === 'standalone') ok('PWA: manifest Reto standalone');
      else bad('PWA: manifest', JSON.stringify(m).slice(0, 80));
    } else bad('PWA: manifest', String(manifest.status()));
    const sw = await page.request.get(`${WEB}/sw.js`);
    if (sw.ok()) ok('PWA: service worker');
    else bad('PWA: service worker');
    await page.close();
  }

  // --- Multi-dispositivo: barra pegada al fondo en todas las rutas con tab bar ---
  const DEVICE_MATRIX = [
    { label: 'iPhone SE', key: 'iPhone SE' },
    { label: 'iPhone 13', key: 'iPhone 13' },
    { label: 'iPhone 14 Pro Max', key: 'iPhone 14 Pro Max' },
    { label: 'Pixel 5', key: 'Pixel 5' },
    { label: 'Galaxy S9+', key: 'Galaxy S9+' }
  ];
  const TAB_PATHS = ['/', '/arena', '/cofre', '/tienda', '/perfil'];

  for (const { label, key } of DEVICE_MATRIX) {
    const device = devices[key];
    if (!device) {
      bad(`Dispositivo ${label}`, 'no encontrado en Playwright');
      continue;
    }
    const ctx = await browser.newContext({ ...device, locale: 'es-ES' });
    for (const path of TAB_PATHS) {
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
      await page.waitForTimeout(600);
      const nav = page.locator('.bottom-nav-bar');
      if (!(await nav.isVisible())) {
        bad(`${label} ${path}: nav visible`);
        await page.close();
        continue;
      }
      const metrics = await nav.evaluate((el) => {
        const style = getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        const vh = window.innerHeight;
        return {
          bottom: style.bottom,
          position: style.position,
          gap: Math.round(vh - rect.bottom)
        };
      });
      if (metrics.position === 'fixed' && metrics.bottom === '0px' && metrics.gap <= 2) {
        ok(`${label} ${path}: nav al fondo`, `gap=${metrics.gap}px`);
      } else {
        bad(`${label} ${path}: nav al fondo`, JSON.stringify(metrics));
      }
      await page.close();
    }
    await ctx.close();
  }

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
