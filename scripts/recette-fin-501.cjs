// Recette de l'écran de fin de 501 : nombre de fléchettes pour finir.
// La borne (1366x768) lance un 501 Double Out sur la même cible avec Ju et Pierre ; Pierre suit sur son téléphone.
// Ju finit en 9 fléchettes (T20 T20 T20, T20 T20 T20, T20 T19 D12) ; Pierre rate tout.
// Prérequis : npm run online:dev dans un autre terminal (serveur local sur le port 8787), Playwright installé.
// Usage : node scripts/recette-fin-501.cjs [dossier-des-captures] [adresse]
const { chromium } = require('playwright');
const fs = require('fs');
const os = require('os');
const path = require('path');
const out = process.argv[2] || path.join(os.tmpdir(), 'trem-dragooon-fin-501');
const URL = process.argv[3] || 'http://localhost:8787/';
fs.mkdirSync(out, { recursive: true });
let failed = 0;
const check = (id, ok, detail = '') => { if (!ok) failed++; console.log(ok ? 'OK ' : 'KO ', id, detail); };

(async () => {
  const browser = await chromium.launch();
  const errors = [];
  const device = async (viewport, name) => {
    const ctx = await browser.newContext({ viewport, hasTouch: true, serviceWorkers: 'block' });
    const p = await ctx.newPage();
    p.on('pageerror', (e) => errors.push(`${name}: ${e.message}`));
    return p;
  };
  const borne = await device({ width: 1366, height: 768 }, 'borne');
  const phone = await device({ width: 390, height: 844 }, 'téléphone');
  const shot = (p, file) => p.screenshot({ path: path.join(out, file) });
  const tag = Date.now().toString(36).slice(-4);
  const JU = `Ju${tag}`;
  const PIERRE = `Pierre${tag}`;
  const PASS = 'secret123';

  const signup = async (p, name) => {
    await p.getByText('Créer un compte').click();
    await p.getByLabel('Pseudo').fill(name);
    await p.getByLabel('Mot de passe').fill(PASS);
    await p.locator('.online-login button').click();
    await p.getByText('J’ai noté mon code').click();
    await p.getByText('Enregistrer').click();
    await p.locator('.home-account-name').waitFor({ timeout: 10000 });
  };
  const skip = async (p) => {
    const h = p.locator('.held-next');
    if (await h.count()) { await h.click(); await p.waitForTimeout(100); }
    const o = p.locator('.transition');
    if (await o.count()) await o.click({ position: { x: 5, y: 5 } });
    await p.waitForTimeout(150);
  };
  const tap = async (p, m, label) => {
    await skip(p);
    if (m > 1) await p.locator(`.pad-mult-${m}`).click();
    await p.locator('.pad-num', { hasText: new RegExp(`^[DT]?${label}$`) }).click();
    await p.waitForTimeout(400);
  };
  const miss = async (p) => { await skip(p); await p.locator('.pad-miss').click(); await p.waitForTimeout(400); };

  await borne.goto(URL);
  await signup(borne, JU);
  await phone.goto(URL);
  await signup(phone, PIERRE);

  await borne.getByText('Même cible', { exact: true }).click();
  await borne.locator('.home-mode', { hasText: '501' }).click();
  await borne.locator('.lobby-code-value').waitFor({ timeout: 10000 });
  const code = (await borne.locator('.lobby-code-value').innerText()).trim();
  await borne.getByText('＋ Ajouter un joueur').click();
  await borne.locator('.picker-tile', { hasText: PIERRE }).click();
  await borne.getByLabel('Mot de passe').fill(PASS);
  await borne.getByText('Ajouter à la partie').click();
  await borne.locator('.setup-list li', { hasText: PIERRE }).waitFor({ timeout: 10000 });
  await borne.getByText('Ordre de la liste').click();
  await borne.getByRole('button', { name: '501', exact: true }).click();
  await borne.getByRole('button', { name: 'Double Out', exact: true }).click().catch(() => undefined);

  await phone.getByText('En ligne', { exact: true }).click();
  await phone.locator('.home-remote').getByText('Rejoindre', { exact: true }).click();
  await phone.locator('.home-join input').fill(code);
  await phone.locator('.home-join button').click();
  await phone.getByText(/En attente du lancement/).waitFor({ timeout: 10000 });

  await borne.getByText('Lancer la partie').click();
  await borne.locator('.active-name').waitFor();
  for (const n of [20, 20, 20]) await tap(borne, 3, n);
  for (let i = 0; i < 3; i++) await miss(borne);
  for (const n of [20, 20, 20]) await tap(borne, 3, n);
  for (let i = 0; i < 3; i++) await miss(borne);
  await tap(borne, 3, 20);
  await tap(borne, 3, 19);
  await tap(borne, 2, 12);
  await borne.locator('.end-winner').waitFor();
  await phone.locator('.end-winner').waitFor({ timeout: 10000 });
  await borne.waitForTimeout(500);
  const summary = await borne.locator('.end-darts').innerText();
  check('fin : fléchettes pour finir', /Fini en 9 fléchettes · 3 volées · finition T20 T19 D12 en 3 fléchettes/.test(summary), summary);
  const ranking = await borne.locator('.end-ranking').innerText();
  check('classement : fléchettes de chacun', ranking.includes('fini · 9 fl.') && ranking.includes('reste 501 · 6 fl.'), ranking.replace(/\n/g, ' | '));
  await shot(borne, 'fin-501-borne.png');
  await shot(phone, 'fin-501-telephone.png');

  check('aucune erreur JavaScript', errors.length === 0, errors.join(' / '));
  await browser.close();
  console.log(failed ? `${failed} contrôle(s) en échec` : 'Recette fin de 501 : tout est OK');
  process.exit(failed ? 1 : 0);
})();
