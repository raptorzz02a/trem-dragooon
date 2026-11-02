// Recette de la heat map, avec un faux Dart Sense (même API que dart-sense/trem_sense.py sur le port 55445) :
// 1. un Entraînement où la caméra voit 45 fléchettes groupées autour du T20 (positions en mm), plus une volée tapée au pavé ;
// 2. « Mes stats » > « Heat map » montre les 45 impacts de la caméra, pas les 3 saisies à la main, qui comptent quand même dans les stats ;
// 3. toucher une zone donne son détail.
// Prérequis : npm run online:dev dans un autre terminal (port 8787), Playwright installé, port 55445 libre.
// Usage : node scripts/recette-heatmap.cjs [dossier-des-captures] [adresse]
const { chromium } = require('playwright');
const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');
const out = process.argv[2] || path.join(os.tmpdir(), 'trem-dragooon-heatmap');
const URL = process.argv[3] || 'http://localhost:8787/';
fs.mkdirSync(out, { recursive: true });
let failed = 0;
const check = (id, ok, detail = '') => { if (!ok) failed++; console.log(ok ? 'OK ' : 'KO ', id, detail); };

// Zone d'un point (mm depuis le centre, y vers le bas), comme get_scores.py de Dart Sense.
const ORDER = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];
function zone(x, y) {
  const r = Math.hypot(x, y);
  if (r <= 7.15) return { segment: 25, multiplier: 2 };
  if (r <= 16.7) return { segment: 25, multiplier: 1 };
  if (r > 170) return { segment: 0, multiplier: 1 };
  const deg = ((Math.atan2(x, -y) * 180) / Math.PI + 360 + 9) % 360;
  const segment = ORDER[Math.floor(deg / 18)];
  const multiplier = r > 160 ? 2 : r > 97.4 && r <= 107.4 ? 3 : 1;
  return { segment, multiplier };
}
// Tirage reproductible, groupé autour du T20 (écart-type 14 mm).
let seed = 7;
const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const gauss = () => Math.sqrt(-2 * Math.log(rand() || 1e-9)) * Math.cos(2 * Math.PI * rand());

// --- Faux Dart Sense ---
const events = [];
let waiters = [];
let visit = 1;
const emit = (type, data) => {
  events.push({ id: events.length + 1, type, volee: visit, ...data });
  waiters.forEach((w) => w());
  waiters = [];
};
const takeout = () => { emit('retrait', { flechettes: 0 }); visit++; };
const server = http.createServer((req, res) => {
  const headers = {
    'Access-Control-Allow-Origin': req.headers.origin ?? '*',
    'Access-Control-Allow-Private-Network': 'true',
    'Content-Type': 'application/json',
  };
  const url = new globalThis.URL(req.url, 'http://x');
  const reply = (body) => res.writeHead(200, headers).end(JSON.stringify(body));
  if (req.method === 'OPTIONS') return res.writeHead(204, headers).end();
  if (url.pathname === '/etat') return reply({ ok: true, camera: 'ok', dernier: events.length });
  if (url.pathname === '/flechettes') {
    const after = Number(url.searchParams.get('apres'));
    const send = () => reply({ evenements: events.filter((e) => e.id > after), dernier: events.length });
    if (events.length > after) return send();
    const timer = setTimeout(send, 15000);
    waiters.push(() => { clearTimeout(timer); send(); });
    return;
  }
  res.writeHead(404, headers).end();
});

const dart = (x, y) => {
  const pos = { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 };
  emit('flechette', { rang: 0, code: '', flechette: zone(pos.x, pos.y), position: pos });
};

(async () => {
  await new Promise((r) => server.listen(55445, '127.0.0.1', r));
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 }, hasTouch: true, serviceWorkers: 'block' });
  const p = await ctx.newPage();
  const errors = [];
  p.on('pageerror', (e) => errors.push(e.message));
  const shot = (file) => p.screenshot({ path: path.join(out, file) });
  const name = 'Ju' + Date.now().toString(36).slice(-4);
  const skip = async () => {
    const h = p.locator('.held-next');
    if (await h.count()) { await h.click(); await p.waitForTimeout(100); }
    const o = p.locator('.transition');
    if (await o.count()) await o.click({ position: { x: 5, y: 5 } });
    await p.waitForTimeout(150);
  };
  const thrown = () => p.evaluate(() => document.querySelectorAll('.volley-slot.filled').length);

  await p.goto(URL + '?camera=1');
  await p.getByText('Créer un compte').click();
  await p.getByLabel('Pseudo').fill(name);
  await p.getByLabel('Mot de passe').fill('secret123');
  await p.locator('.online-login button').click();
  await p.getByText('J’ai noté mon code').click();
  await p.getByText('Enregistrer').click();
  await p.locator('.home-account-name').waitFor({ timeout: 10000 });
  await p.getByText('Même cible', { exact: true }).click();
  await p.locator('.home-mode', { hasText: 'Entraînement' }).click();
  await p.getByText('Lancer la partie').click();
  await p.locator('.game-sense').waitFor({ timeout: 10000 });
  await p.waitForTimeout(800);

  for (let v = 0; v < 15; v++) {
    await skip();
    for (let k = 0; k < 3; k++) {
      dart(gauss() * 14, -102 + gauss() * 14);
      await p.waitForFunction((n) => document.querySelectorAll('.volley-slot.filled').length >= n || !!document.querySelector('.held-next'), k + 1, { timeout: 5000 }).catch(() => {});
    }
    if (v === 0) await shot('01-volee-camera.png');
    takeout();
    await p.waitForTimeout(300);
  }
  // Une volée tapée à la main : comptée dans les stats, pas sur la carte.
  await skip();
  for (let k = 0; k < 3; k++) {
    await skip();
    await p.locator('.pad-num', { hasText: /^1$/ }).click();
    await p.waitForTimeout(400);
  }
  await skip();
  await p.locator('.game-finish').click();
  await p.getByText('Terminer', { exact: true }).click();
  await p.locator('.end-winner').waitFor();
  await p.getByText('Changer les réglages').click();
  await p.getByText('Fermer', { exact: true }).click();
  await p.locator('.home-account-name').waitFor();

  await p.getByText('Mes stats').first().click();
  await p.locator('.profile-screen').waitFor({ timeout: 10000 });
  await p.waitForTimeout(800);
  const card = await p.locator('.stat-card', { hasText: 'Entraînement' }).innerText().catch(() => '');
  check('les 48 fléchettes comptent dans les stats', /48/.test(card), card.replace(/\n/g, ' | '));
  await p.locator('.segmented button', { hasText: 'Heat map' }).click();
  await p.locator('.heatmap svg').waitFor({ timeout: 5000 });
  const dots = await p.locator('.hm-dots circle').count();
  check('45 impacts caméra sur la carte, pas les saisies à la main', dots === 45, String(dots));
  const tiles = await p.locator('.profile-content').innerText();
  check('3 saisies à la main signalées', tiles.includes('3 fléchettes saisies à la main'), tiles.replace(/\n/g, ' | '));
  await shot('02-heatmap.png');
  await p.locator('.hm-zone.hm-ring').first().click();
  const tip = await p.locator('.heatmap .chart-tip').innerText();
  check('toucher le T20 donne son détail', /^T20 : \d+ fléchettes? \(\d+ %\)$/.test(tip), tip);
  await shot('03-heatmap-t20.png');
  await p.setViewportSize({ width: 390, height: 844 });
  await p.waitForTimeout(300);
  await shot('04-heatmap-telephone.png');

  check('aucune erreur JavaScript', errors.length === 0, errors.join(' | '));
  await browser.close();
  server.close();
  console.log(failed ? `${failed} échec(s)` : 'Recette heat map : tout est OK');
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
