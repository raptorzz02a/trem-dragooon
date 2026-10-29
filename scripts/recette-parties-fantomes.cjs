// Recette des parties fantômes (saloon public) :
// 1. Ju crée une partie puis revient à l'accueil : elle apparaît avec « Reprendre » pour lui, « Regarder » pour Pierre ;
// 2. Ju la reprend depuis un autre appareil (rien en mémoire) : il revient dans sa salle d'attente, toujours hôte ;
// 3. Ju ferme la salle : Pierre, spectateur, est prévenu, et la partie sort de la liste ;
// 4. Ju lance une partie avec Pierre puis l'arrête : Pierre est prévenu, la partie ne compte pas dans les stats.
// Prérequis : npm run online:dev dans un autre terminal (port 8787), Playwright installé.
// Usage : node scripts/recette-parties-fantomes.cjs [dossier-des-captures] [adresse]
const { chromium } = require('playwright');
const fs = require('fs');
const os = require('os');
const path = require('path');
const out = process.argv[2] || path.join(os.tmpdir(), 'trem-dragooon-parties-fantomes');
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
  const laptop = await device({ width: 1280, height: 720 }, 'PC');
  const phone = await device({ width: 390, height: 844 }, 'téléphone');
  const shot = (p, file) => p.screenshot({ path: path.join(out, file) });
  const tag = Date.now().toString(36).slice(-4);
  const PASS = 'secret123';
  const [JU, PIERRE] = ['Ju', 'Pierre'].map((n) => n + tag);

  const signup = async (p, name) => {
    await p.getByText('Créer un compte').click();
    await p.getByLabel('Pseudo').fill(name);
    await p.getByLabel('Mot de passe').fill(PASS);
    await p.locator('.online-login button').click();
    await p.getByText('J’ai noté mon code').click();
    await p.getByText('Enregistrer').click();
    await p.locator('.home-account-name').waitFor({ timeout: 10000 });
  };
  const row = (p) => p.locator('.home-live-row', { hasText: JU });

  // --- 1. Partie laissée en salle d'attente ---
  await laptop.goto(URL);
  await signup(laptop, JU);
  await phone.goto(URL);
  await signup(phone, PIERRE);
  await laptop.getByText('Même cible', { exact: true }).click();
  await laptop.locator('.home-mode', { hasText: 'Horloge' }).click();
  await laptop.locator('.lobby-code-value').waitFor({ timeout: 10000 });
  const code = (await laptop.locator('.lobby-code-value').innerText()).trim();
  await laptop.getByText('← Accueil').click();
  await row(laptop).waitFor({ timeout: 10000 });
  check('l’hôte voit « Reprendre »', (await row(laptop).getByText('Reprendre').count()) === 1);
  await phone.reload();
  await row(phone).waitFor({ timeout: 10000 });
  check('un autre joueur voit « Regarder » seulement', (await row(phone).getByText('Regarder').count()) === 1 && !(await row(phone).getByText('Reprendre').count()));
  await shot(laptop, '01-reprendre.png');

  // --- 2. Reprise depuis un autre appareil ---
  const other = await device({ width: 1366, height: 768 }, 'borne');
  await other.goto(URL);
  await other.getByLabel('Pseudo').fill(JU);
  await other.getByLabel('Mot de passe').fill(PASS);
  await other.locator('.online-login button[type=submit]').click();
  await row(other).getByText('Reprendre').click();
  await other.locator('.lobby-code-value').waitFor({ timeout: 10000 });
  check('reprise sur un autre appareil, même partie', (await other.locator('.lobby-code-value').innerText()).trim() === code);
  check('toujours hôte', (await other.getByText('Fermer', { exact: true }).count()) === 1);

  // --- 3. L'hôte ferme la salle ---
  await row(phone).getByText('Regarder').click();
  await phone.waitForTimeout(1000);
  await other.getByText('Fermer', { exact: true }).click();
  await phone.getByText('Cette partie n’est plus en cours.').first().waitFor({ timeout: 10000 }).then(() => check('le spectateur est prévenu', true), () => check('le spectateur est prévenu', false));
  await laptop.reload();
  await laptop.locator('.home-account-name').waitFor();
  await laptop.waitForTimeout(1000);
  check('la salle fermée sort de la liste', (await row(laptop).count()) === 0);

  // --- 4. Partie arrêtée en cours de route ---
  await laptop.getByText('En ligne', { exact: true }).click();
  await laptop.locator('.home-remote').getByText('Créer', { exact: true }).click();
  await laptop.locator('.home-mode', { hasText: '301' }).click();
  await laptop.locator('.lobby-code-value').waitFor({ timeout: 10000 });
  const code2 = (await laptop.locator('.lobby-code-value').innerText()).trim();
  await phone.goto(URL);
  await phone.getByText('En ligne', { exact: true }).click();
  await phone.locator('.home-remote').getByText('Rejoindre', { exact: true }).click();
  await phone.locator('.home-join input').fill(code2);
  await phone.locator('.home-join button').click();
  await laptop.locator('.setup-list li', { hasText: PIERRE }).waitFor({ timeout: 10000 });
  await laptop.getByText('Lancer la partie').click();
  await laptop.locator('.game-quit').waitFor({ timeout: 10000 });
  await laptop.locator('.game-quit').click();
  check('message de suppression', (await laptop.locator('.dialog').innerText()).includes('supprimée'));
  await laptop.getByRole('button', { name: 'Arrêter la partie' }).click();
  await phone.getByText('L’hôte a supprimé la partie.').waitFor({ timeout: 10000 }).then(() => check('le joueur est prévenu', true), () => check('le joueur est prévenu', false));
  await shot(phone, '02-partie-supprimee.png');
  await laptop.locator('.home-account-name').waitFor({ timeout: 10000 });
  const games = await laptop.evaluate(async () => {
    const token = localStorage.getItem('trem-dragooon.account.token');
    const me = JSON.parse(localStorage.getItem('trem-dragooon.account') ?? '{}');
    const r = await fetch(`/api/players/${me.id}`, { headers: { Authorization: `Bearer ${token}` } });
    return (await r.json()).games?.length ?? -1;
  });
  check('la partie arrêtée ne compte pas dans les stats', games === 0, `${games} partie(s)`);
  check('aucune erreur JavaScript', errors.length === 0, errors.join(' | '));
  await browser.close();
  console.log(failed ? `${failed} échec(s)` : 'Recette parties fantômes : tout est OK');
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
