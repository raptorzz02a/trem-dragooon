// Recette de l'appli en ligne :
// 1. sur la même cible : la borne (1366x768) ajoute Pierre avec son mot de passe et crée Jacques sur place,
//    saisit pour tout le monde (Cricket arrêté en cours, puis 301 gagné), et la partie arrive dans les stats ;
// 2. à distance : Pierre (téléphone) crée un Shanghai, Ju (PC 13 pouces) le rejoint avec le code ;
// 3. refus : mauvais mot de passe, code inconnu.
// Prérequis : npm run online:dev dans un autre terminal (serveur local sur le port 8787), Playwright installé.
// Usage : node scripts/recette-en-ligne.cjs [dossier-des-captures] [adresse]
const { chromium } = require('playwright');
const fs = require('fs');
const os = require('os');
const path = require('path');
const out = process.argv[2] || path.join(os.tmpdir(), 'trem-dragooon-en-ligne');
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
  const laptop = await device({ width: 1280, height: 720 }, 'PC 13 pouces');
  const shot = (p, file) => p.screenshot({ path: path.join(out, file) });
  // Pseudos uniques à chaque recette : la base locale garde les comptes d'une fois sur l'autre.
  const tag = Date.now().toString(36).slice(-4);
  const JU = `Ju${tag}`;
  const PIERRE = `Pierre${tag}`;
  const JACQUES = `Jacques${tag}`;
  const PASS = 'secret123';

  // Rejoindre avec un code : « En ligne », puis « Rejoindre ».
  const joinWith = async (p, code) => {
    await p.getByText('En ligne', { exact: true }).click();
    await p.locator('.home-remote').getByText('Rejoindre', { exact: true }).click();
    await p.locator('.home-join input').fill(code);
    await p.locator('.home-join button').click();
  };

  const signup = async (p, name) => {
    await p.getByText('Créer un compte').click();
    await p.getByLabel('Pseudo').fill(name);
    await p.getByLabel('Mot de passe').fill(PASS);
    await p.locator('.online-login button').click();
    await p.getByText('Enregistrer').click(); // avatar proposé à la création
    await p.locator('.home-account-name').waitFor({ timeout: 10000 });
  };
  const skip = async (p) => { const o = p.locator('.transition'); if (await o.count()) await o.click({ position: { x: 5, y: 5 } }); await p.waitForTimeout(150); };
  const tap = async (p, m, label) => {
    await skip(p);
    if (m > 1) await p.locator(`.pad-mult-${m}`).click();
    await p.locator('.pad-num', { hasText: new RegExp(`^[DT]?${label}$`) }).click();
    await p.waitForTimeout(450);
  };
  const endTurn = async (p) => {
    await skip(p);
    await p.getByText('Fin de tour', { exact: true }).click();
    await p.waitForTimeout(450);
    await p.getByText('Confirmer la fin du tour').click();
    await p.waitForTimeout(450);
  };
  const active = async (p) => (await p.locator('.active-name').innerText()).trim();

  // --- Comptes ---
  await borne.goto(URL);
  await shot(borne, '01-connexion-borne.png');
  await signup(borne, JU);
  check('compte créé, accueil affiché', (await borne.locator('.home-account-name').innerText()).trim() === JU);
  await phone.goto(URL);
  await signup(phone, PIERRE);
  await shot(borne, '02-accueil-borne.png');
  await shot(phone, '03-accueil-telephone.png');

  // --- Même cible : Cricket ---
  await borne.getByText('Même cible', { exact: true }).click();
  await borne.locator('.home-mode', { hasText: 'Cricket' }).click();
  await borne.locator('.lobby-code-value').waitFor({ timeout: 10000 });
  const code = (await borne.locator('.lobby-code-value').innerText()).trim();
  check('salle d’attente sur le Cricket', (await borne.locator('.setup-rules .segmented button.selected', { hasText: 'Cricket' }).count()) === 1, code);

  await borne.getByText('＋ Ajouter un joueur').click();
  await borne.locator('.picker-tile', { hasText: PIERRE }).click();
  await borne.getByLabel('Mot de passe').fill('mauvais');
  await borne.getByText('Ajouter à la partie').click();
  await borne.locator('.add-player .online-error').waitFor({ timeout: 10000 });
  check('mauvais mot de passe refusé à l’ajout', (await borne.locator('.add-player .online-error').innerText()).includes('incorrect'));
  await borne.getByLabel('Mot de passe').fill(PASS);
  await borne.getByText('Ajouter à la partie').click();
  await borne.locator('.setup-list li', { hasText: PIERRE }).waitFor({ timeout: 10000 });
  check('Pierre ajouté avec son mot de passe', true);

  await borne.getByText('＋ Ajouter un joueur').click();
  await borne.getByLabel('Chercher un pseudo').fill(JACQUES);
  await borne.getByText('Nouveau joueur').click();
  await borne.getByText('Enregistrer').click();
  await borne.getByLabel('Mot de passe').fill(PASS);
  await borne.getByText('Ajouter à la partie').click();
  await borne.locator('.setup-list li', { hasText: JACQUES }).waitFor({ timeout: 10000 });
  check('Jacques créé sur la borne et ajouté', true);

  // Pierre suit la partie sur son téléphone avec le code.
  await joinWith(phone, code);
  await phone.getByText(/En attente du lancement/).waitFor({ timeout: 10000 });
  await shot(borne, '04-salle-attente-borne.png');
  await shot(phone, '05-salle-attente-telephone.png');

  await borne.getByText('Ordre de la liste').click();
  await borne.getByText('Lancer la partie').click();
  await borne.locator('.active-name').waitFor();
  check('la borne saisit pour tout le monde', (await active(borne)) === JU && !(await borne.locator('.pad-num').first().isDisabled()));
  await tap(borne, 3, 20);
  await endTurn(borne);
  await skip(borne);
  check('au tour de Pierre, saisi sur la borne', (await active(borne)) === PIERRE && !(await borne.locator('.pad-num').first().isDisabled()));
  await tap(borne, 2, 19);
  await phone.waitForTimeout(300);
  await skip(phone);
  await shot(borne, '06-cricket-borne.png');
  await shot(phone, '07-cricket-telephone.png');
  await borne.getByText('Quitter', { exact: true }).click();
  await borne.getByText('Arrêter la partie', { exact: true }).click();
  await borne.getByText('Lancer la partie').waitFor({ timeout: 10000 });
  check('partie arrêtée : retour à la salle d’attente', true);

  // --- Même cible : 301 jusqu'à la victoire ---
  await borne.locator('.setup-rules button', { hasText: '301 · 501 · 701' }).click();
  await borne.getByText('301', { exact: true }).click();
  await borne.locator('.setup-rules .segmented button', { hasText: /^Simple$/ }).click();
  await borne.waitForTimeout(300);
  await borne.getByText('Lancer la partie').click();
  await borne.locator('.active-remaining').waitFor();
  for (const n of [20, 20, 20]) await tap(borne, 3, n); // Ju : 121
  await skip(borne);
  await endTurn(borne); // Pierre
  await endTurn(borne); // Jacques
  await tap(borne, 3, 20);
  await tap(borne, 1, 11);
  await skip(borne);
  await borne.locator('.pad-bull50').click();
  await borne.locator('.end-winner').waitFor();
  await phone.locator('.end-winner').waitFor();
  check('victoire de Ju vue sur la borne et le téléphone', (await phone.locator('.end-winner').innerText()).trim() === JU);
  await shot(phone, '08-victoire-telephone.png');
  await borne.getByText('Changer les réglages').click();
  await borne.getByText('Fermer', { exact: true }).click();
  await borne.locator('.home-account-name').waitFor();

  // --- Stats : la partie compte pour Ju, Pierre et Jacques ---
  await borne.getByText('Joueurs et classements').click();
  await borne.locator('.ranking-row', { hasText: PIERRE }).first().click().catch(() => undefined);
  const statsText = await borne.locator('body').innerText();
  check('parties en ligne dans les stats', statsText.includes(PIERRE));
  await shot(borne, '09-stats-borne.png');

  // --- À distance : Pierre crée un Shanghai, Ju le rejoint depuis un PC 13 pouces ---
  await phone.getByText('← Accueil').click().catch(() => undefined);
  await phone.goto(URL);
  await phone.getByText('En ligne', { exact: true }).click();
  await phone.locator('.home-mode', { hasText: 'Shanghai' }).click();
  await phone.locator('.lobby-code-value').waitFor({ timeout: 10000 });
  const remote = (await phone.locator('.lobby-code-value').innerText()).trim();
  await laptop.goto(`${URL}?salon=${remote}`);
  await laptop.getByLabel('Pseudo').fill(JU);
  await laptop.getByLabel('Mot de passe').fill(PASS);
  await laptop.locator('.online-login button').click();
  await laptop.getByText(/En attente du lancement/).waitFor({ timeout: 10000 });
  check('lien partagé : Ju arrive dans la salle de Pierre', true);
  await shot(phone, '10-salle-distance-telephone.png');
  await shot(laptop, '11-salle-distance-pc13.png');
  await phone.getByText('Ordre de la liste').click();
  await phone.waitForTimeout(300);
  await phone.getByText('Lancer la partie').click();
  await laptop.locator('.active-name').waitFor();
  check('à distance, Ju attend son tour', await laptop.locator('.pad-num').first().isDisabled());
  await tap(phone, 1, 1);
  await endTurn(phone);
  await skip(laptop);
  check('puis c’est à Ju de saisir', !(await laptop.locator('.pad-num').first().isDisabled()));
  await shot(laptop, '12-shanghai-pc13.png');
  await shot(phone, '13-shanghai-telephone.png');

  // --- Refus ---
  await laptop.getByText('Quitter', { exact: true }).click();
  await laptop.getByText('Accueil', { exact: true }).last().click();
  await joinWith(laptop, 'ZZZZZZ');
  await laptop.getByText('Aucune partie avec ce code').waitFor({ timeout: 10000 });
  check('code inconnu refusé', true);

  check('aucune erreur JavaScript', errors.length === 0, errors.join(' | '));
  await browser.close();
  console.log(failed ? `${failed} échec(s)` : 'Tout est OK', '— captures dans', out);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
