#!/usr/bin/env node
/**
 * E2E: al tocar una historia en el Hub debe abrir StoryViewerModal.
 */
import { chromium } from 'playwright';

const WEB = process.env.WEB_BASE || 'http://127.0.0.1:3011';
const API = process.env.API_BASE || 'http://127.0.0.1:3010/api';
const ADMIN_USER = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASSWORD || 'Admin123!';

async function loginToken() {
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
  const { token, user } = await loginToken();
  const storiesRes = await fetch(`${API}/game/stories`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const storiesJson = await storiesRes.json();
  const groups = storiesJson.users || [];
  const withStories = groups.filter((g) => g.stories?.length > 0);
  if (!withStories.length) {
    console.log('⚠️  Sin historias en BD — crea una desde la app para E2E completo');
    process.exit(0);
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true
  });
  const page = await context.newPage();

  await page.addInitScript(
    ({ token, user }) => {
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem(`reto_setup_done_${user.id}`, '1');
    },
    { token, user }
  );

  await page.goto(`${WEB}/`, { waitUntil: 'domcontentloaded' });
  await page.locator('.story-bubble').first().waitFor({ state: 'visible', timeout: 20000 });

  const bubble = page.locator('.story-bubble').first();
  await bubble.waitFor({ state: 'visible', timeout: 15000 });
  await bubble.click();

  const viewer = page.locator('.story-viewer[role="dialog"]');
  await viewer.waitFor({ state: 'visible', timeout: 5000 });

  const img = viewer.locator('.story-viewer__img');
  await img.waitFor({ state: 'visible', timeout: 5000 });
  const src = await img.getAttribute('src');
  if (!src) throw new Error('Imagen de historia sin src');

  const imgOk = await page.request.get(new URL(src, WEB).href);
  if (!imgOk.ok()) throw new Error(`Imagen no carga: ${src} → ${imgOk.status()}`);

  const bodyClass = await page.evaluate(() => document.body.classList.contains('story-viewer-open'));
  if (!bodyClass) throw new Error('body.story-viewer-open no aplicado');

  const progressCount = await viewer.locator('.story-viewer__progress-fill').count();
  if (progressCount < 1) throw new Error('Barra de progreso no renderizada');

  await viewer.locator('button[aria-label="Cerrar"]').click();
  await viewer.waitFor({ state: 'hidden', timeout: 5000 });

  console.log('✅ E2E historia: abre, muestra imagen, cierra correctamente');
  await browser.close();
}

main().catch((e) => {
  console.error('❌ E2E historia falló:', e.message || e);
  process.exit(1);
});
