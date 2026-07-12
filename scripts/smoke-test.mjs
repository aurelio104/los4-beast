#!/usr/bin/env node
/**
 * Smoke test exhaustivo — API + assets frontend.
 * Uso: node scripts/smoke-test.mjs [--api http://127.0.0.1:3010] [--web http://127.0.0.1:3011]
 */
const API_BASE = (process.argv.find((a, i) => process.argv[i - 1] === '--api') || 'http://127.0.0.1:3010') + '/api';
const WEB_BASE = process.argv.find((a, i) => process.argv[i - 1] === '--web') || 'http://127.0.0.1:3011';

const ADMIN_USER = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASSWORD || 'Admin123!';

const results = { pass: [], fail: [], warn: [] };

function pass(name, detail = '') {
  results.pass.push({ name, detail });
}
function fail(name, detail = '') {
  results.fail.push({ name, detail });
}
function warn(name, detail = '') {
  results.warn.push({ name, detail });
}

async function req(method, path, { token, body, form, expectStatus, label } = {}) {
  const url = path.startsWith('http') ? path : `${API_BASE}${path}`;
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body && !form) headers['Content-Type'] = 'application/json';

  const opts = { method, headers };
  if (body) opts.body = form ? body : JSON.stringify(body);

  const res = await fetch(url, opts);
  let json = null;
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('json')) {
    try {
      json = await res.json();
    } catch {
      json = null;
    }
  } else if (method === 'GET') {
    json = { _raw: await res.text().catch(() => '') };
  }

  const statuses = Array.isArray(expectStatus) ? expectStatus : [expectStatus ?? (method === 'GET' ? 200 : [200, 201, 400, 403, 409, 422])];
  const ok = statuses.includes(res.status) || (Array.isArray(statuses[0]) ? false : statuses.flat?.().includes(res.status));
  const flatStatuses = Array.isArray(statuses[0]) ? statuses.flat() : statuses;
  const statusOk = flatStatuses.includes(res.status);

  return { res, json, statusOk, status: res.status, label: label || `${method} ${path}` };
}

async function testPublic() {
  const health = await req('GET', '/health');
  if (health.statusOk && health.json?.ok !== false) pass('GET /health', JSON.stringify(health.json).slice(0, 120));
  else fail('GET /health', `status ${health.status}`);

  const vapid = await req('GET', '/push/vapid-public');
  if (vapid.statusOk && vapid.json?.publicKey) pass('GET /push/vapid-public');
  else if (vapid.statusOk) warn('GET /push/vapid-public', 'sin publicKey (VAPID no configurado)');
  else fail('GET /push/vapid-public', `status ${vapid.status}`);

  const radio = await req('GET', '/game/radio/current');
  if (radio.statusOk) pass('GET /game/radio/current');
  else fail('GET /game/radio/current', `status ${radio.status}`);

  const challenge = await req('GET', '/auth/webauthn/challenge');
  if (challenge.statusOk && challenge.json?.challenge) pass('GET /auth/webauthn/challenge');
  else fail('GET /auth/webauthn/challenge', `status ${challenge.status}`);

  const invite = await req('GET', '/auth/invite/INVALID', { expectStatus: 200 });
  if (invite.statusOk) pass('GET /auth/invite/:code (inválido)', `valid=${invite.json?.valid}`);
  else fail('GET /auth/invite/:code', `status ${invite.status}`);

  const noAuth = await req('GET', '/auth/me', { expectStatus: 401 });
  if (noAuth.status === 401) pass('GET /auth/me sin token → 401');
  else fail('GET /auth/me sin token', `esperaba 401, got ${noAuth.status}`);

  const badLogin = await req('POST', '/auth/login', { body: { identifier: 'x', password: 'y' }, expectStatus: [200, 400, 401] });
  if (badLogin.statusOk && badLogin.json?.success === false) pass('POST /auth/login credenciales inválidas');
  else if (badLogin.status === 401 || badLogin.status === 400) pass('POST /auth/login credenciales inválidas');
  else fail('POST /auth/login inválido', `status ${badLogin.status} success=${badLogin.json?.success}`);
}

async function loginAdmin() {
  const r = await req('POST', '/auth/login', {
    body: { identifier: ADMIN_USER, password: ADMIN_PASS },
    expectStatus: 200
  });
  if (!r.statusOk || !r.json?.token) {
    fail('Login admin', r.json?.error || `status ${r.status} — ¿existe seed? npm run db:seed`);
    return null;
  }
  pass('Login admin', ADMIN_USER);
  return r.json.token;
}

async function testAuthGets(token) {
  const gets = [
    '/auth/me',
    '/auth/players',
    '/auth/invites',
    '/auth/admin/stats',
    '/game/status',
    '/game/hub-snapshot',
    '/game/trivia/questions',
    '/game/events',
    '/game/feed',
    '/game/bribe',
    '/game/votes',
    '/game/alliance',
    '/game/confessions',
    '/game/chest',
    '/game/stories',
    '/game/whatsapp/status',
    '/chat/messages',
    '/push/status',
    '/admin/dashboard',
    '/admin/users',
    '/admin/persistence-health',
    '/whatsapp/status',
    '/whatsapp/persist-health',
    '/whatsapp/messages',
    '/whatsapp/templates'
  ];

  for (const path of gets) {
    const r = await req('GET', path, { token, expectStatus: [200, 403] });
    if (r.status === 403) warn(`GET ${path}`, '403 — requiere MASTER');
    else if (r.statusOk && r.json?.success !== false) pass(`GET ${path}`);
    else if (r.statusOk) pass(`GET ${path}`, 'respuesta OK');
    else fail(`GET ${path}`, `status ${r.status} ${r.json?.error || ''}`);
  }
}

async function testAuthPostsSafe(token) {
  const posts = [
    { path: '/game/continue', body: {}, ok: [200, 400] },
    { path: '/chat/messages', body: { body: `smoke-${Date.now()}` }, ok: [200, 201] },
    { path: '/game/renegotiate', body: { proposal: 'test smoke' }, ok: [200, 400, 409] },
    { path: '/game/confession', body: { message: 'smoke test confesión' }, ok: [200, 400, 409] },
    { path: '/auth/invites', body: {}, ok: [200, 201] },
    { path: '/auth/webauthn/register-options', method: 'GET', ok: [200] },
    { path: '/push/test', body: {}, ok: [200, 400, 500] },
    { path: '/admin/invites', body: {}, ok: [200, 201] },
    { path: '/whatsapp/templates/seed', body: {}, ok: [200, 201] }
  ];

  for (const item of posts) {
    const method = item.method || 'POST';
    const r = await req(method, item.path, {
      token,
      body: method === 'POST' ? (item.body ?? {}) : undefined,
      expectStatus: item.ok
    });
    if (r.statusOk) pass(`${method} ${item.path}`, `status ${r.status}`);
    else fail(`${method} ${item.path}`, `status ${r.status} ${r.json?.error || ''}`);
  }

  const minigames = [
    { path: '/game/minigame/red-light', body: { survived: true } },
    { path: '/game/minigame/trivia', body: { correct: true } },
    { path: '/game/minigame/ddakji', body: { won: true } },
    { path: '/game/minigame/glass-bridge', body: { steps: 3 } },
    { path: '/game/minigame/honeycomb', body: { precision: 0.9 } },
    { path: '/game/minigame/mystery-box', body: { boxIndex: 0 } },
    { path: '/game/minigame/tug-war', body: { taps: 10 } }
  ];

  for (const mg of minigames) {
    const r = await req('POST', mg.path, { token, body: mg.body, expectStatus: [200, 400, 409] });
    if (r.statusOk) pass(`POST ${mg.path}`, r.json?.error ? `lógica: ${r.json.error}` : 'OK');
    else fail(`POST ${mg.path}`, `status ${r.status}`);
  }
}

async function testFrontendAssets() {
  const routes = ['/', '/login', '/join/testcode'];
  for (const route of routes) {
    const res = await fetch(`${WEB_BASE}${route}`);
    const html = await res.text();
    if (res.ok && html.includes('id="root"')) pass(`WEB ${route}`, 'HTML OK');
    else fail(`WEB ${route}`, `status ${res.status}`);
  }

  const assets = [
    '/manifest.webmanifest',
    '/favicon.png',
    '/pwa-192.png',
    '/pwa-512.png',
    '/apple-touch-icon.png',
    '/logoR.png'
  ];
  for (const asset of assets) {
    const res = await fetch(`${WEB_BASE}${asset}`, { method: 'HEAD' }).catch(() => null);
    if (res?.ok) pass(`ASSET ${asset}`);
    else fail(`ASSET ${asset}`, res ? `status ${res.status}` : 'no response');
  }

  const proxyHealth = await fetch(`${WEB_BASE}/api/health`);
  const ph = await proxyHealth.json().catch(() => ({}));
  if (proxyHealth.ok && ph.ok !== false) pass('Vite proxy /api/health');
  else fail('Vite proxy /api/health', `status ${proxyHealth.status}`);
}

async function testJoinFlow(masterToken) {
  const inv = await req('POST', '/admin/invites', { token: masterToken, body: {}, expectStatus: [200, 201] });
  if (!inv.statusOk || !inv.json?.invite?.code) {
    warn('Flujo join', 'no se pudo crear invitación admin');
    return;
  }
  const code = inv.json.invite.code;
  const check = await req('GET', `/auth/invite/${code}`);
  if (check.statusOk && check.json?.valid) pass('Flujo join: invite válido', code);
  else fail('Flujo join: invite válido');

  const username = `smoke_${Date.now().toString(36)}`;
  const join = await req('POST', '/auth/join', {
    body: {
      inviteCode: code,
      username,
      email: `${username}@smoke.local`,
      password: 'SmokeTest123!',
      displayName: 'Smoke Test',
      gender: 'OTHER'
    },
    expectStatus: [200, 201]
  });
  if (join.statusOk && join.json?.token) {
    pass('Flujo join: registro', username);
    const userToken = join.json.token;

    const me = await req('GET', '/auth/me', { token: userToken });
    if (me.statusOk) pass('Flujo join: /me usuario nuevo');

    const hub = await req('GET', '/game/hub-snapshot', { token: userToken });
    if (hub.statusOk) pass('Flujo join: hub-snapshot');

    const del = await req('DELETE', `/admin/users/${join.json.user?.id || me.json?.user?.id}`, {
      token: masterToken,
      expectStatus: [200, 404]
    });
    if (del.statusOk) pass('Flujo join: cleanup usuario smoke');
    else warn('Flujo join: cleanup', `status ${del.status}`);
  } else {
    fail('Flujo join: registro', join.json?.error || `status ${join.status}`);
  }
}

async function testRemainingPosts(token) {
  const coin = await req('POST', '/game/minigame/coin-flip', {
    token,
    body: { choice: 'heads', bet: 1 },
    expectStatus: [200, 400, 409]
  });
  if (coin.statusOk) pass('POST /game/minigame/coin-flip', coin.json?.error || 'OK');

  const profile = await req('PATCH', '/game/profile', {
    token,
    body: { nickname: 'smoke-admin' },
    expectStatus: [200]
  });
  if (profile.statusOk) pass('PATCH /game/profile');

  const notify = await req('POST', '/admin/notify-event', { token, body: {}, expectStatus: [200, 400] });
  if (notify.statusOk) pass('POST /admin/notify-event');

  const waConnect = await req('POST', '/whatsapp/connect', { token, body: {}, expectStatus: [200, 400, 409] });
  if (waConnect.statusOk) pass('POST /whatsapp/connect');

  const waQr = await req('GET', '/whatsapp/qr', { token, expectStatus: [200, 404] });
  if (waQr.statusOk) pass('GET /whatsapp/qr');
}

async function testDistChunks() {
  const { readFileSync, existsSync, readdirSync } = await import('node:fs');
  const { join } = await import('node:path');
  const dist = join(process.cwd(), 'frontend', 'dist');
  if (!existsSync(dist)) {
    warn('Chunks dist', 'sin build');
    return;
  }
  const html = readFileSync(join(dist, 'index.html'), 'utf8');
  const scripts = [...html.matchAll(/src="(\/assets\/[^"]+\.js)"/g)].map((m) => m[1]);
  for (const script of scripts.slice(0, 8)) {
    const res = await fetch(`${WEB_BASE}${script}`);
    if (res.ok) pass(`CHUNK ${script.split('/').pop()}`);
    else fail(`CHUNK ${script}`, `status ${res.status}`);
  }
  const pages = readdirSync(join(dist, 'assets')).filter((f) =>
    /^(Hub|Arena|Chat|Login|Perfil|Setup|Admin|Tienda|Cofre)-/.test(f)
  );
  for (const p of pages) pass(`BUILD chunk página ${p.split('-')[0]}`);
}

async function testMobileReadiness() {
  const { readFileSync, existsSync } = await import('node:fs');
  const { join } = await import('node:path');
  const indexHtml = readFileSync(join(process.cwd(), 'frontend', 'index.html'), 'utf8');
  const checks = [
    ['viewport-fit=cover', /viewport-fit=cover/.test(indexHtml)],
    ['apple-touch-startup-image', /apple-touch-startup-image/.test(indexHtml)],
    ['font-size 16px mobile CSS', /max-width:\s*768px[\s\S]*font-size:\s*16px/.test(readFileSync(join(process.cwd(), 'frontend', 'src', 'index.css'), 'utf8'))],
    ['useModalBackClose hook', readFileSync(join(process.cwd(), 'frontend', 'src', 'hooks', 'useModalBackClose.ts'), 'utf8').includes('pushState')],
    ['openWaMe standalone', readFileSync(join(process.cwd(), 'frontend', 'src', 'lib', 'whatsapp.ts'), 'utf8').includes('isStandalone')],
    ['push iOS standalone guard', readFileSync(join(process.cwd(), 'frontend', 'src', 'hooks', 'usePushNotifications.ts'), 'utf8').includes('needsStandalone')],
    ['push refresh on install', readFileSync(join(process.cwd(), 'frontend', 'src', 'hooks', 'usePushNotifications.ts'), 'utf8').includes('appinstalled')],
    ['push-handler SW', existsSync(join(process.cwd(), 'frontend', 'public', 'push-handler.js'))],
    ['PWA maskable icons', /maskable/.test(readFileSync(join(process.cwd(), 'frontend', 'public', 'manifest.webmanifest'), 'utf8'))],
    ['manifest display_override', readFileSync(join(process.cwd(), 'frontend', 'public', 'manifest.webmanifest'), 'utf8').includes('display_override')],
    ['no interactive-widget viewport', !/interactive-widget/.test(indexHtml)],
    ['Chat flex layout', readFileSync(join(process.cwd(), 'frontend', 'src', 'pages', 'Chat.tsx'), 'utf8').includes('flex flex-col')],
    ['Story viewer portal + dialog', readFileSync(join(process.cwd(), 'frontend', 'src', 'components', 'StoryViewerModal.tsx'), 'utf8').includes('createPortal') && readFileSync(join(process.cwd(), 'frontend', 'src', 'components', 'StoryViewerModal.tsx'), 'utf8').includes('role="dialog"')],
    ['Story strip opens viewer', readFileSync(join(process.cwd(), 'frontend', 'src', 'pages', 'Hub.tsx'), 'utf8').includes('setStoryViewerId') && readFileSync(join(process.cwd(), 'frontend', 'src', 'components', 'StoryStrip.tsx'), 'utf8').includes('onOpenViewer')],
    ['Story viewer no reset on poll', !readFileSync(join(process.cwd(), 'frontend', 'src', 'components', 'StoryViewerModal.tsx'), 'utf8').includes('[initialUserId, groups]')],
    ['Story open guard', readFileSync(join(process.cwd(), 'frontend', 'src', 'components', 'StoryViewerModal.tsx'), 'utf8').includes('OPEN_GUARD_MS')],
    ['Story black background', readFileSync(join(process.cwd(), 'frontend', 'src', 'index.css'), 'utf8').includes('.story-viewer__stage') && readFileSync(join(process.cwd(), 'frontend', 'src', 'index.css'), 'utf8').match(/story-viewer__stage[\s\S]*background:\s*#000/)],
    ['Hub video app-shell-bg', readFileSync(join(process.cwd(), 'frontend', 'src', 'index.css'), 'utf8').includes('.app-shell-bg') && readFileSync(join(process.cwd(), 'frontend', 'src', 'components', 'AppShell.tsx'), 'utf8').includes('app-shell-bg')],
    ['Hub layout transparent', readFileSync(join(process.cwd(), 'frontend', 'src', 'index.css'), 'utf8').includes('hub-layout') && readFileSync(join(process.cwd(), 'frontend', 'src', 'index.css'), 'utf8').includes('background: transparent')],
    ['Video full auto-play', readFileSync(join(process.cwd(), 'frontend', 'src', 'components', 'BeachVideoBackground.tsx'), 'utf8').includes("variant === 'full'")],
    ['Story cleanup body class', readFileSync(join(process.cwd(), 'frontend', 'src', 'pages', 'Hub.tsx'), 'utf8').includes('remove(\'story-viewer-open\')')],
    ['BottomNav component', existsSync(join(process.cwd(), 'frontend', 'src', 'components', 'BottomNav.tsx'))],
    ['MainTabLayout', existsSync(join(process.cwd(), 'frontend', 'src', 'components', 'MainTabLayout.tsx'))],
    ['Hub layout no 100svh height', !readFileSync(join(process.cwd(), 'frontend', 'src', 'index.css'), 'utf8').match(/\.hub-layout\s*\{[^}]*height:\s*100svh/s)],
    ['Bottom nav fixed bottom', readFileSync(join(process.cwd(), 'frontend', 'src', 'index.css'), 'utf8').includes('.bottom-nav-bar') && readFileSync(join(process.cwd(), 'frontend', 'src', 'index.css'), 'utf8').match(/\.bottom-nav-bar\s*\{[^}]*bottom:\s*0/s)],
    ['Bottom nav safe area vars', readFileSync(join(process.cwd(), 'frontend', 'src', 'index.css'), 'utf8').includes('--bottom-nav-total')],
    ['beach wallpaper asset', existsSync(join(process.cwd(), 'frontend', 'public', 'wallpapers', 'beach-poster.jpg')) || existsSync(join(process.cwd(), 'frontend', 'dist', 'wallpapers', 'beach-poster.jpg'))],
    ['no beast URL in backend', !readFileSync(join(process.cwd(), 'backend', 'src', 'lib', 'whatsapp.ts'), 'utf8').includes('beast')]
  ];
  for (const [name, ok] of checks) {
    if (ok) pass(`MOBILE ${name}`);
    else fail(`MOBILE ${name}`);
  }
}

async function testFrontendBuild() {
  const { existsSync } = await import('node:fs');
  const { join } = await import('node:path');
  const dist = join(process.cwd(), 'frontend', 'dist');
  const required = ['index.html', 'manifest.webmanifest', 'sw.js', 'push-handler.js'];
  for (const f of required) {
    if (existsSync(join(dist, f))) pass(`BUILD dist/${f}`);
    else warn(`BUILD dist/${f}`, 'no encontrado — ejecuta npm run build:frontend');
  }
}

async function main() {
  console.log(`\n🔬 Smoke test Reto`);
  console.log(`   API: ${API_BASE}`);
  console.log(`   WEB: ${WEB_BASE}\n`);

  try {
    await testPublic();
    const token = await loginAdmin();
    if (token) {
      await testAuthGets(token);
      await testAuthPostsSafe(token);
      await testRemainingPosts(token);
      await testJoinFlow(token);
    }
    await testFrontendAssets();
    await testDistChunks();
    await testMobileReadiness();
    await testFrontendBuild();
  } catch (e) {
    fail('FATAL', (e).message || String(e));
  }

  console.log(`\n✅ PASS: ${results.pass.length}`);
  console.log(`⚠️  WARN: ${results.warn.length}`);
  console.log(`❌ FAIL: ${results.fail.length}\n`);

  if (results.fail.length) {
    console.log('--- FALLOS ---');
    for (const f of results.fail) console.log(`  ❌ ${f.name}${f.detail ? ` — ${f.detail}` : ''}`);
  }
  if (results.warn.length) {
    console.log('--- AVISOS ---');
    for (const w of results.warn) console.log(`  ⚠️  ${w.name}${w.detail ? ` — ${w.detail}` : ''}`);
  }

  process.exit(results.fail.length ? 1 : 0);
}

main();
