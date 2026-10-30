// Recette de la saisie par caméra, avec un faux Dart Sense (même API que dart-sense/trem_sense.py sur le port 55445) :
// 1. la borne ouverte avec « ?camera=1 » montre le voyant caméra sur l'écran de jeu ;
// 2. T20 puis S5 vus par la caméra sont saisis, le retrait complète la volée par un raté et passe à la manche suivante ;
// 3. en « Saisie manuelle », les fléchettes de la caméra sont ignorées.
// Prérequis : npm run online:dev dans un autre terminal (port 8787), Playwright installé, port 55445 libre.
// Usage : node scripts/recette-dart-sense.cjs [dossier-des-captures] [adresse]
const { chromium } = require('playwright');
const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');
const out = process.argv[2] || path.join(os.tmpdir(), 'trem-dragooon-dart-sense');
const URL = process.argv[3] || 'http://localhost:8787/';
fs.mkdirSync(out, { recursive: true });
let failed = 0;
const check = (id, ok, detail = '') => { if (!ok) failed++; console.log(ok ? 'OK ' : 'KO ', id, detail); };

// --- Faux Dart Sense ---
const events = [];
let waiters = [];
let visit = 1;
const emit = (type, data) => {
  events.push({ id: events.length + 1, type, volee: visit, ...data });
  waiters.forEach((w) => w());
  waiters = [];
};
const dart = (code, segment, multiplier) => emit('flechette', { rang: 0, code, flechette: { segment, multiplier } });
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

(async () => {
  await new Promise((r) => server.listen(55445, '127.0.0.1', r));
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 }, hasTouch: true, serviceWorkers: 'block' });
  const p = await ctx.newPage();
  const errors = [];
  p.on('pageerror', (e) => errors.push(e.message));
  const shot = (file) => p.screenshot({ path: path.join(out, file) });
  const name = 'Ju' + Date.now().toString(36).slice(-4);

  // Événement d'avant la partie : jamais saisi.
  dart('T20', 20, 3);

  await p.goto(URL + '?camera=1');
  await p.getByText('Créer un compte').click();
  await p.getByLabel('Pseudo').fill(name);
  await p.getByLabel('Mot de passe').fill('secret123');
  await p.locator('.online-login button').click();
  await p.getByText('J’ai noté mon code').click();
  await p.getByText('Enregistrer').click();
  await p.locator('.home-account-name').waitFor({ timeout: 10000 });
  await p.getByText('Même cible', { exact: true }).click();
  await p.locator('.home-mode', { hasText: '301' }).click();
  await p.getByText('Lancer la partie').click();
  await p.locator('.game-sense').waitFor({ timeout: 10000 });
  await p.waitForTimeout(500);
  check('voyant caméra affiché', (await p.locator('.game-sense').innerText()).includes('Caméra'));
  const remaining = () => p.locator('.active-remaining').innerText();
  const start = Number(await remaining());
  const left = String(start - 65);
  check('rien saisi au départ', [301, 501, 701].includes(start), String(start));

  dart('T20', 20, 3);
  await p.locator('.volley-slot.filled').first().waitFor({ timeout: 5000 });
  dart('S5', 5, 1);
  await p.waitForFunction(() => document.querySelectorAll('.volley-slot.filled').length === 2, null, { timeout: 5000 });
  check('T20 + S5 saisis', (await remaining()) === left, await remaining());
  await shot('01-volee-camera.png');
  takeout();
  await p.getByText('Manche 2').waitFor({ timeout: 5000 }).catch(() => {});
  check('retrait : un raté complète la volée, manche suivante', (await p.getByText('Manche 2').count()) === 1 && (await p.locator('.volley-slot.filled').count()) === 0);
  check('score inchangé par le raté', (await remaining()) === left);

  // Saisie manuelle : la caméra est ignorée.
  await p.locator('.game-sense').click();
  check('bouton en saisie manuelle', (await p.locator('.game-sense').innerText()).includes('manuelle'));
  dart('D20', 20, 2);
  await p.waitForTimeout(1500);
  check('fléchette ignorée en saisie manuelle', (await remaining()) === left);
  await shot('02-saisie-manuelle.png');

  check('aucune erreur JavaScript', errors.length === 0, errors.join(' | '));
  await browser.close();
  server.close();
  console.log(failed ? `${failed} échec(s)` : 'Recette Dart Sense : tout est OK');
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
