#!/usr/bin/env node
/**
 * Smoke test producción — Vercel frontend + Koyeb backend.
 * Uso: node scripts/smoke-production.mjs
 */
const WEB = process.env.WEB_BASE || 'https://los4-beast.vercel.app';
const API = process.env.API_BASE || 'https://los4-game-aurelio104-6f5cac3b.koyeb.app/api';
const KOYEB = API.replace(/\/api$/, '');

const results = { pass: [], fail: [], warn: [] };
function pass(n, d = '') { results.pass.push({ n, d }); }
function fail(n, d = '') { results.fail.push({ n, d }); }
function warn(n, d = '') { results.warn.push({ n, d }); }

async function head(url) {
  try {
    const res = await fetch(url, { method: 'HEAD', redirect: 'follow' });
    return res;
  } catch (e) {
    return { ok: false, status: 0, error: (e).message };
  }
}

async function get(url, opts = {}) {
  try {
    const res = await fetch(url, { ...opts, redirect: 'follow' });
    const text = await res.text();
    let json = null;
    try { json = JSON.parse(text); } catch { /* */ }
    return { res, text, json };
  } catch (e) {
    return { res: { ok: false, status: 0 }, text: '', json: null, error: (e).message };
  }
}

async function main() {
  console.log(`\n🌐 Smoke producción Reto`);
  console.log(`   WEB: ${WEB}`);
  console.log(`   API: ${API}\n`);

  // URLs incorrectas que reportan usuarios
  for (const bad of ['https://i--beast.vercel.app', 'https://i-beast.vercel.app']) {
    const r = await head(`${bad}/`);
    if (r.status === 404 || r.headers?.get?.('x-vercel-error') === 'DEPLOYMENT_NOT_FOUND') {
      fail(`URL inválida ${bad}`, 'DEPLOYMENT_NOT_FOUND — usar https://los4-beast.vercel.app');
    } else if (r.ok) {
      warn(`URL legacy ${bad}`, `responde ${r.status}`);
    }
  }

  const health = await get(`${API}/health`);
  if (health.res.ok && health.json?.ok) pass('Koyeb /api/health', health.json.app);
  else fail('Koyeb /api/health', `status ${health.res.status}`);

  const persist = await get(`${API}/admin/persistence-health`, {
    headers: { Authorization: 'Bearer x' }
  });
  if (persist.res.status === 401 || persist.res.status === 403) pass('Koyeb persistence-health protegido');
  else if (persist.json?.success) pass('Koyeb persistence-health', persist.json.summary || 'OK');
  else warn('Koyeb persistence-health', `status ${persist.res.status}`);

  const cors = await fetch(`${API}/health`, {
    method: 'OPTIONS',
    headers: {
      Origin: WEB,
      'Access-Control-Request-Method': 'GET'
    }
  });
  const acao = cors.headers.get('access-control-allow-origin');
  if (acao === WEB || acao === '*') pass('CORS Koyeb ← Vercel', acao);
  else fail('CORS Koyeb ← Vercel', acao || 'sin header');

  const webauthn = await get(`${API}/auth/webauthn/challenge`, { headers: { Origin: WEB } });
  if (webauthn.json?.challenge && webauthn.json?.rpId) {
    if (webauthn.json.rpId.includes('los4-beast.vercel.app')) pass('WebAuthn rpId', webauthn.json.rpId);
    else fail('WebAuthn rpId', webauthn.json.rpId);
  } else fail('WebAuthn challenge');

  const index = await get(`${WEB}/`);
  if (!index.res.ok) {
    fail('Vercel index.html', `status ${index.res.status}`);
  } else {
    pass('Vercel index.html', `status ${index.res.status}`);
    if (index.text.includes('id="root"')) pass('HTML root');
    else fail('HTML root');
    if (index.text.includes('boot-recover') || index.text.includes('data-boot-recover') || index.text.includes('reto_boot_reload')) {
      pass('Boot recovery inline');
    } else {
      fail('Boot recovery inline', 'falta script de recuperación — desplegar rama fix-ios');
    }
    const scripts = [...index.text.matchAll(/src="(\/assets\/[^"]+\.js)"/g)].map((m) => m[1]);
    for (const s of scripts.slice(0, 6)) {
      const c = await head(`${WEB}${s}`);
      if (c.ok) pass(`Chunk ${s.split('/').pop()}`);
      else fail(`Chunk ${s}`, `status ${c.status}`);
    }
    const hubLazy = /Hub-[^"]+\.js/.test(index.text);
    if (!hubLazy) pass('Hub en bundle principal (no lazy en HTML)');
    else warn('Hub lazy chunk', 'aún separado en HTML');
  }

  const proxy = await get(`${WEB}/api/health`);
  if (proxy.res.ok && proxy.json?.ok) pass('Vercel proxy /api/health');
  else fail('Vercel proxy /api/health', `status ${proxy.res.status} ${proxy.json?.error || ''}`);

  for (const asset of ['/manifest.webmanifest', '/sw.js', '/push-handler.js', '/logoR.png', '/pwa-192.png']) {
    const r = await head(`${WEB}${asset}`);
    if (r.ok) pass(`Asset ${asset}`);
    else fail(`Asset ${asset}`, `status ${r.status}`);
  }

  const sw = await get(`${WEB}/sw.js`);
  if (sw.res.ok) {
    const precache = [...sw.text.matchAll(/url:"([^"]+)"/g)].map((m) => m[1]);
    const indexHash = [...sw.text.matchAll(/index-[^"]+\.js/g)][0]?.[0];
    const htmlHash = index.text.match(/index-[^"]+\.js/)?.[0];
    if (indexHash && htmlHash && indexHash === htmlHash) pass('SW ↔ index hash alineados', htmlHash);
    else fail('SW ↔ index hash', `sw=${indexHash || '?'} html=${htmlHash || '?'}`);
    for (const u of precache.filter((p) => p.endsWith('.js')).slice(0, 8)) {
      const url = u.startsWith('http') ? u : `${WEB}${u.startsWith('/') ? '' : '/'}${u}`;
      const c = await head(url);
      if (c.ok) pass(`SW precache ${u.split('/').pop()}`);
      else fail(`SW precache ${u}`, `status ${c.status}`);
    }
  } else fail('SW.js');

  const login = await get(`${WEB}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'nope', password: 'nope' })
  });
  if (login.json?.success === false) pass('Login proxy POST');
  else fail('Login proxy POST', JSON.stringify(login.json).slice(0, 80));

  console.log(`\n✅ PASS: ${results.pass.length}`);
  console.log(`⚠️  WARN: ${results.warn.length}`);
  console.log(`❌ FAIL: ${results.fail.length}\n`);
  if (results.fail.length) {
    for (const f of results.fail) console.log(`  ❌ ${f.n}${f.d ? ` — ${f.d}` : ''}`);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error('FATAL', e);
  process.exit(1);
});
