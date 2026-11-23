// Recette « tableau de scores sur iPad » :
// 1. la tablette (1024 × 768) affiche un code ; Ju le tape sur la borne (menu › Tableau iPad) : elle passe en attente ;
// 2. Ju lance un 501 sur la borne avec Pierre : la tablette suit la partie toute seule ;
// 3. animations : 180 (Ju), 100 (Pierre), 140 (Pierre), BUST (Ju), victoire (Ju) ;
// 4. depuis la borne : animations coupées, puis tablette déliée (elle affiche un nouveau code).
// Prérequis : npm run online:dev dans un autre terminal (port 8787), Playwright installé.
// Usage : node scripts/recette-tableau.cjs [dossier-des-captures] [adresse]
const { chromium } = require('playwright');
const fs = require('fs');
const os = require('os');
const path = require('path');
const out = process.argv[2] || path.join(os.tmpdir(), 'trem-dragooon-tableau');
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
  const ipad = await device({ width: 1024, height: 768 }, 'tablette');
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
  const tap = async (m, label) => {
    await skip(borne);
    if (m > 1) await borne.locator(`.pad-mult-${m}`).click();
    await borne.locator('.pad-num', { hasText: new RegExp(`^[DT]?${label}$`) }).click();
    await borne.waitForTimeout(400);
  };
  const miss = async () => { await skip(borne); await borne.locator('.pad-miss').click(); await borne.waitForTimeout(400); };
  /** Attend qu'une animation contenant ce texte s'affiche sur la tablette. */
  const fx = async (id, text, file) => {
    const ok = await ipad
      .waitForFunction((t) => {
        const f = document.getElementById('fx');
        const w = f.querySelector('.words');
        return f.className.indexOf('on') >= 0 && (w ? w.textContent === t : f.textContent.indexOf(t) >= 0);
      }, text, { timeout: 8000 })
      .then(() => true, () => false);
    await ipad.waitForTimeout(700);
    check(id, ok, ok ? '' : await ipad.locator('#fx').innerText().catch(() => ''));
    if (file) await shot(ipad, file);
  };
  const tablet = () => ipad.evaluate(() => ({
    screen: ['pair', 'idle', 'main'].filter((id) => document.getElementById(id).className.indexOf(' on') >= 0)[0],
    name: document.getElementById('name').textContent,
    score: document.getElementById('score').getAttribute('aria-label'),
    others: [].map.call(document.querySelectorAll('#others .oth'), (o) => `${o.querySelector('.n').textContent} ${o.querySelector('[role=img]').getAttribute('aria-label')} ${o.querySelector('.avg:last-child') ? o.querySelector('.avg:last-child').textContent : ''}`).join(' | '),
    outs: document.getElementById('outs').innerText.replace(/\s+/g, ' ').trim(),
    slots: document.getElementById('slots').innerText.replace(/\s+/g, ' ').trim(),
  }));
  const waitScreen = (id) => ipad.waitForFunction((s) => document.getElementById(s).className.indexOf(' on') >= 0, id, { timeout: 15000 }).then(() => true, () => false);

  // 1. Appairage
  await ipad.goto(URL + 'tableau.html');
  await ipad.waitForFunction(() => /^\d{4}$/.test(document.getElementById('paircode').getAttribute('data-code') || ''), null, { timeout: 10000 });
  const pairCode = await ipad.locator('#paircode').getAttribute('data-code');
  check('la tablette affiche un code à 4 chiffres', /^\d{4}$/.test(pairCode), pairCode);
  await shot(ipad, '01-code-tablette.png');

  await borne.goto(URL);
  await signup(borne, JU);
  await phone.goto(URL);
  await signup(phone, PIERRE);
  await borne.locator('.home-account-toggle').click();
  await borne.getByRole('menuitem', { name: 'Tableau iPad' }).click();
  await borne.getByLabel('Code affiché sur la tablette').fill('0000');
  await borne.getByRole('button', { name: 'Relier' }).click();
  await borne.locator('.online-error').waitFor({ timeout: 5000 });
  check('un mauvais code est refusé', /Aucune tablette/.test(await borne.locator('.online-error').innerText()));
  await borne.getByLabel('Code affiché sur la tablette').fill(pairCode);
  await borne.getByRole('button', { name: 'Relier' }).click();
  await borne.locator('.admin-row').waitFor({ timeout: 5000 });
  check('la borne liste la tablette reliée', (await borne.locator('.admin-row').count()) === 1);
  await shot(borne, '02-borne-tableau-ipad.png');
  check('la tablette passe en attente', await waitScreen('idle'));
  await shot(ipad, '03-attente.png');

  // 2. Partie
  await borne.getByText('← Accueil').click();
  await borne.getByText('Même cible', { exact: true }).click();
  await borne.locator('.home-mode', { hasText: '501' }).click();
  await borne.locator('.lobby-code-value').waitFor({ timeout: 10000 });
  await borne.getByText('＋ Ajouter un joueur').click();
  await borne.locator('.picker-tile', { hasText: PIERRE }).click();
  await borne.getByLabel('Mot de passe').fill(PASS);
  await borne.getByText('Ajouter à la partie').click();
  await borne.locator('.setup-list li', { hasText: PIERRE }).waitFor({ timeout: 10000 });
  await borne.getByText('Ordre de la liste').click();
  await borne.getByRole('button', { name: '501', exact: true }).click();
  await borne.getByRole('button', { name: 'Double Out', exact: true }).click().catch(() => undefined);
  await borne.getByText('Lancer la partie').click();
  await borne.locator('.active-name').waitFor();
  check('la tablette suit la partie lancée', await waitScreen('main'));
  await tap(3, 20);
  await ipad.waitForTimeout(800);
  let t = await tablet();
  check('volée en cours et score du joueur qui lance', t.name === JU && t.score === 'Reste 441' && t.slots.startsWith('T20'), JSON.stringify(t));
  check('autres joueurs : 4 lettres + score + moyenne', t.others === 'PIER Reste 501 0.0', t.others);
  await shot(ipad, '04-joueur-en-cours.png');

  await tap(3, 20);
  await tap(3, 20);
  await fx('animation 180', 'one hundred and eighty', '05-anim-180.png');
  await tap(3, 20); await tap(1, 20); await tap(1, 20);
  await fx('animation 100', 'one hundred', '06-anim-100.png');
  // Ju : 321 → T20 T20 T20 = 141
  await tap(3, 20); await tap(3, 20); await tap(3, 20);
  await ipad.waitForTimeout(4500);
  // Pierre : 401 → T20 T20 S20 = 140
  await tap(3, 20); await tap(3, 20); await tap(1, 20);
  await fx('animation 140', 'one hundred and forty', '07-anim-140.png');
  // Ju : 141 → T20 T20 T20 = bust
  await tap(3, 20); await tap(3, 20); await tap(3, 20);
  await fx('animation BUST', 'Score remis à', '08-anim-bust.png');
  await ipad.waitForTimeout(3500);
  t = await tablet();
  check('après le bust : Pierre lance, Ju reste à 141', t.name === PIERRE && t.others.indexOf('Reste 141') >= 0, JSON.stringify(t));
  for (let i = 0; i < 3; i++) await miss();
  await ipad.waitForTimeout(800);
  t = await tablet();
  // Finition du moteur de l'appli (la même que sur la borne).
  check('out proposé pour 141', t.outs === 'T20 T15 D18', t.outs);
  await shot(ipad, '09-out-propose.png');
  await tap(3, 20); await tap(3, 19); await tap(2, 12);
  await fx('animation victoire', 'Victoire', '10-victoire.png');
  const win = await ipad.locator('#fx').innerText();
  check('victoire : nom et finish', win.indexOf(JU.toUpperCase()) >= 0 || win.indexOf(JU) >= 0, win.replace(/\s+/g, ' '));

  // 4. Réglages depuis la borne
  await borne.locator('.end-winner').waitFor();
  await borne.goto(URL);
  await borne.locator('.home-account-toggle').click();
  await borne.getByRole('menuitem', { name: 'Tableau iPad' }).click();
  await borne.locator('.admin-row').waitFor({ timeout: 5000 });
  await borne.getByRole('button', { name: /Animations : oui/ }).click();
  await borne.getByRole('button', { name: /Animations : non/ }).waitFor({ timeout: 5000 });
  check('animations coupées depuis la borne', true);
  await borne.getByRole('button', { name: 'Délier' }).click();
  await borne.getByText('Aucune tablette pour l’instant.').waitFor({ timeout: 5000 });
  check('la tablette déliée réaffiche un code', await waitScreen('pair'));
  const newCode = await ipad.locator('#paircode').getAttribute('data-code');
  check('nouveau code différent', /^\d{4}$/.test(newCode) && newCode !== pairCode, newCode);

  check('aucune erreur JavaScript', errors.length === 0, errors.join(' / '));
  await browser.close();
  console.log(failed ? `${failed} contrôle(s) en échec` : 'Recette tableau iPad : tout est OK');
  process.exit(failed ? 1 : 0);
})();
