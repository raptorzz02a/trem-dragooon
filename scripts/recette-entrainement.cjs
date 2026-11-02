// Recette du mode Entraînement :
// 1. la borne (1366x768) lance un Entraînement sur la même cible avec Ju et Pierre (ajouté avec son mot de passe) ;
// 2. on additionne les points sans limite (pause de 3 s après chaque volée), seul l'hôte peut terminer ; Pierre suit sur son téléphone ;
// 3. « Terminer l'entraînement » enregistre la partie : elle apparaît dans « Mes stats » (carte Entraînement), sans victoire.
// Prérequis : npm run online:dev dans un autre terminal (serveur local sur le port 8787), Playwright installé.
// Usage : node scripts/recette-entrainement.cjs [dossier-des-captures] [adresse]
const { chromium } = require('playwright');
const fs = require('fs');
const os = require('os');
const path = require('path');
const out = process.argv[2] || path.join(os.tmpdir(), 'trem-dragooon-entrainement');
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
  // Pause après la volée (« Joueur suivant → »), puis écran de transition : on passe les deux.
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
    await p.waitForTimeout(450);
  };
  const scores = async (p) => (await p.locator('.board-score').allInnerTexts()).map((s) => Number(s.trim()));

  await borne.goto(URL);
  await signup(borne, JU);
  await phone.goto(URL);
  await signup(phone, PIERRE);
  await shot(borne, '01-accueil-borne.png');
  await shot(phone, '02-accueil-telephone.png');
  check('jeu Entraînement proposé à l’accueil', (await borne.locator('.home-mode', { hasText: 'Entraînement' }).count()) === 1);

  await borne.getByText('Même cible', { exact: true }).click();
  await borne.locator('.home-mode', { hasText: 'Entraînement' }).click();
  await borne.locator('.lobby-code-value').waitFor({ timeout: 10000 });
  const code = (await borne.locator('.lobby-code-value').innerText()).trim();
  await borne.getByText('＋ Ajouter un joueur').click();
  await borne.locator('.picker-tile', { hasText: PIERRE }).click();
  await borne.getByLabel('Mot de passe').fill(PASS);
  await borne.getByText('Ajouter à la partie').click();
  await borne.locator('.setup-list li', { hasText: PIERRE }).waitFor({ timeout: 10000 });
  await borne.getByText('Ordre de la liste').click();
  await shot(borne, '03-salle-attente.png');

  await phone.getByText('En ligne', { exact: true }).click();
  await phone.locator('.home-remote').getByText('Rejoindre', { exact: true }).click();
  await phone.locator('.home-join input').fill(code);
  await phone.locator('.home-join button').click();
  await phone.getByText(/En attente du lancement/).waitFor({ timeout: 10000 });

  await borne.getByText('Lancer la partie').click();
  await borne.locator('.active-name').waitFor();
  check('on part de 0', (await scores(borne)).every((s) => s === 0));
  check('Terminer grisé tant que rien n’est lancé', await borne.locator('.game-finish').isDisabled());
  // Ju : T20 T20 T20 = 180 ; Pierre : 25 D10 S1 = 46 ; Ju : 50 puis on termine en pleine volée.
  for (const n of [20, 20, 20]) await tap(borne, 3, n);
  // Pause de 3 s après la 3e fléchette : la volée reste affichée, le pavé est bloqué.
  check('pause après la 3e fléchette : volée affichée, pavé bloqué',
    (await borne.locator('.held-next').count()) === 1 && (await borne.locator('.volley-slot.filled').count()) === 3 && (await borne.locator('.pad-num').first().isDisabled()));
  await shot(borne, '04a-pause-volee.png');
  await borne.waitForTimeout(3300);
  check('passage tout seul au joueur suivant après 3 s', (await borne.locator('.held-next').count()) === 0 && (await borne.locator('.transition').count()) === 1);
  await skip(borne);
  await borne.locator('.pad-bull25').click();
  await borne.waitForTimeout(400);
  await tap(borne, 2, 10);
  await tap(borne, 1, 1);
  await skip(borne);
  await borne.locator('.pad-bull50').click();
  await borne.waitForTimeout(400);
  check('les points s’additionnent sans limite', JSON.stringify(await scores(borne)) === JSON.stringify([230, 46]), JSON.stringify(await scores(borne)));
  await phone.waitForTimeout(300);
  await skip(phone);
  check('le téléphone n’a pas le bouton Terminer', (await phone.locator('.game-finish').count()) === 0);
  await shot(borne, '04-entrainement-borne.png');
  await shot(phone, '05-entrainement-telephone.png');

  await borne.locator('.game-finish').click();
  await shot(borne, '06-confirmer.png');
  await borne.getByText('Terminer', { exact: true }).click();
  await borne.locator('.end-winner').waitFor();
  await phone.locator('.end-winner').waitFor();
  const endText = await borne.locator('.dialog.end').innerText();
  check('fin : entraînement terminé, classé sur les points', /entraînement terminé/i.test(endText) && endText.includes('230 pts'), endText.replace(/\n/g, ' | '));
  await shot(borne, '07-fin-borne.png');
  await shot(phone, '08-fin-telephone.png');
  await borne.getByText('Changer les réglages').click();
  await borne.getByText('Fermer', { exact: true }).click();
  await borne.locator('.home-account-name').waitFor();

  // --- Stats de Ju ---
  await borne.getByText('Mes stats').first().click();
  await borne.locator('.profile-screen').waitFor({ timeout: 10000 });
  await borne.waitForTimeout(800);
  const card = borne.locator('.stat-card', { hasText: 'Entraînement' });
  await card.waitFor({ timeout: 10000 }).catch(() => undefined);
  const cardText = (await card.count()) ? await card.innerText() : '';
  check('carte Entraînement dans Mes stats', cardText.includes('Fléchettes lancées') && cardText.includes('230'), cardText.replace(/\n/g, ' | '));
  const wins = (await borne.locator('.tile', { hasText: 'Victoires' }).locator('.tile-value').innerText()).trim();
  const played = (await borne.locator('.tile', { hasText: 'Parties terminées' }).locator('.tile-value').innerText()).trim();
  check('1 partie terminée, pas de victoire comptée', played === '1' && wins === '0', `${played} partie(s), ${wins} victoire(s)`);
  const thrown = (await borne.locator('.tile', { hasText: 'Fléchettes lancées' }).locator('.tile-value').innerText()).trim();
  const cardDarts = (cardText.match(/Fléchettes lancées\s*\|?\s*(\d+)/) || [])[1];
  check('résumé tout confondu : fléchettes lancées', thrown !== '0' && thrown === cardDarts, `${thrown} (carte : ${cardDarts})`);
  await shot(borne, '09-mes-stats.png');
  await borne.locator('.segmented button', { hasText: 'Entraînement' }).first().click();
  await borne.locator('.segmented button', { hasText: 'Scores' }).first().click();
  await borne.waitForTimeout(500);
  await shot(borne, '10-scores-entrainement.png');
  await borne.locator('.segmented button', { hasText: 'Historique' }).first().click();
  await borne.waitForTimeout(300);
  check('historique : total de l’entraînement', (await borne.locator('.history-list').innerText()).includes('230 pts'));
  await shot(borne, '11-historique.png');

  check('aucune erreur JavaScript', errors.length === 0, errors.join(' / '));
  await browser.close();
  console.log(failed ? `${failed} contrôle(s) en échec` : 'Recette entraînement : tout est OK');
  process.exit(failed ? 1 : 0);
})();
