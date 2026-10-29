// Recette des parties dans un saloon (avenant multi-groupes, lot 3) :
// 1. Ju (borne) crée un saloon et y invite Pierre (téléphone) ; Jacques (PC 13 pouces) n'en est pas membre ;
// 2. Ju lance une partie « Même cible » : Jacques est refusé à l'ajout, Paul créé sur la borne entre dans le saloon ;
// 3. Ju garde ses réglages (701) par défaut pour le saloon ;
// 4. Pierre voit la partie dans « Parties en cours » (point vert), la regarde en spectateur, Ju voit l'œil ;
// 5. Jacques est refusé même avec le code ; une nouvelle partie de Pierre reprend le 701 ;
// 6. Ju fixe le saloon sur la borne : plus de sélecteur.
// Prérequis : npm run online:dev dans un autre terminal (port 8787), Playwright installé.
// Usage : node scripts/recette-saloons-parties.cjs [dossier-des-captures] [adresse]
const { chromium } = require('playwright');
const fs = require('fs');
const os = require('os');
const path = require('path');
const out = process.argv[2] || path.join(os.tmpdir(), 'trem-dragooon-saloons-parties');
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
  const tag = Date.now().toString(36).slice(-4);
  const PASS = 'secret123';
  const [JU, PIERRE, JACQUES, PAUL] = ['Ju', 'Pierre', 'Jacques', 'Paul'].map((n) => n + tag);
  const SALOON = `Cave ${tag}`;

  const signup = async (p, name) => {
    await p.getByText('Créer un compte').click();
    await p.getByLabel('Pseudo').fill(name);
    await p.getByLabel('Mot de passe').fill(PASS);
    await p.locator('.online-login button').click();
    await p.getByText('Enregistrer').click();
    await p.locator('.home-account-name').waitFor({ timeout: 10000 });
  };
  const skip = async (p) => { const o = p.locator('.transition'); if (await o.count()) await o.click({ position: { x: 5, y: 5 } }); await p.waitForTimeout(150); };

  // --- 1. Saloon, invitation ---
  await borne.goto(URL);
  await signup(borne, JU);
  await borne.locator('.saloon-rail-add').click();
  await borne.getByText('Créer', { exact: true }).click();
  await borne.getByLabel('Nom du saloon').fill(SALOON);
  await borne.getByLabel('Mot de passe du saloon').fill('biere');
  await borne.getByText('Créer le saloon').click();
  const link = await borne.getByLabel("Lien d'invitation").inputValue();
  await borne.getByRole('button', { name: 'Fermer', exact: true }).click();
  await phone.goto(link);
  await signup(phone, PIERRE);
  await phone.locator('.online-banner').waitFor({ timeout: 10000 });
  await laptop.goto(URL);
  await signup(laptop, JACQUES);

  // --- 2. Partie « Même cible » dans le saloon ---
  await borne.getByText('Même cible', { exact: true }).click();
  await borne.locator('.home-mode', { hasText: '301' }).click();
  await borne.locator('.lobby-code-value').waitFor({ timeout: 10000 });
  const code = (await borne.locator('.lobby-code-value').innerText()).trim();
  await borne.getByText('＋ Ajouter un joueur').click();
  await borne.getByLabel('Chercher un pseudo').fill(JACQUES);
  await borne.locator('.picker-tile', { hasText: JACQUES }).click();
  await borne.getByLabel('Mot de passe').fill(PASS);
  await borne.getByText('Ajouter à la partie').click();
  await borne.locator('.add-player .online-error').waitFor({ timeout: 10000 });
  check('non-membre refusé à l’ajout', /pas membre/.test(await borne.locator('.add-player .online-error').innerText()));
  await borne.locator('.add-player').getByText('Retour', { exact: true }).click();
  await borne.getByLabel('Chercher un pseudo').fill(PAUL);
  await borne.getByText('Nouveau joueur').click();
  await borne.getByText('Enregistrer').click();
  await borne.getByLabel('Mot de passe').fill(PASS);
  await borne.getByText('Ajouter à la partie').click();
  await borne.locator('.setup-list li', { hasText: PAUL }).waitFor({ timeout: 10000 });
  check('nouveau joueur créé sur la borne et ajouté', true);

  // --- 3. Réglages par défaut du saloon ---
  await borne.getByText('701', { exact: true }).click();
  await borne.waitForTimeout(300);
  await borne.locator('.lobby-defaults').click();
  await borne.getByText(/Réglages enregistrés/).waitFor({ timeout: 10000 });
  check('réglages gardés pour le saloon', true);
  await shot(borne, '01-salle-attente-defauts.png');
  await borne.getByText('Ordre de la liste').click();
  await borne.getByText('Lancer la partie').click();
  await borne.locator('.active-name').waitFor();

  // --- 4. Parties en cours, spectateur ---
  await phone.reload();
  await phone.locator('.home-live-row').waitFor({ timeout: 20000 });
  const row = await phone.locator('.home-live-row').first().innerText();
  check('partie listée sans son code', row.includes('En jeu') && row.includes(PAUL) && !row.includes(code), row.replace(/\n/g, ' | '));
  check('point vert sur le saloon', (await phone.locator('.saloon-header-toggle .saloon-live').count()) === 1);
  await shot(phone, '02-parties-en-cours.png');
  await phone.locator('.home-live-row').first().getByText('Regarder').click();
  await phone.locator('.active-name').waitFor({ timeout: 10000 });
  check('spectateur : la partie s’affiche', true);
  check('spectateur : rien à saisir', await phone.locator('.pad-num').first().isDisabled().catch(() => true));
  await borne.locator('.watch-badge').waitFor({ timeout: 10000 });
  check('l’hôte voit l’œil', /1 spectateur/.test(await borne.locator('.watch-badge').innerText()));
  await skip(borne);
  await borne.locator('.pad-mult-3').click();
  await borne.locator('.pad-num', { hasText: /^T?20$/ }).click();
  await phone.waitForTimeout(800);
  check('le spectateur suit les fléchettes', (await phone.locator('body').innerText()).includes('641'));
  await shot(phone, '03-spectateur.png');
  await shot(borne, '04-hote-oeil.png');

  // --- 5. Non-membre refusé avec le code ; défauts repris ---
  await laptop.getByText('En ligne', { exact: true }).click();
  await laptop.locator('.home-remote').getByText('Rejoindre', { exact: true }).click();
  await laptop.locator('.home-join input').fill(code);
  await laptop.locator('.home-join button').click();
  await laptop.getByText(/pas membre/).waitFor({ timeout: 10000 });
  check('non-membre refusé même avec le code', true);
  await phone.goto(URL);
  await phone.getByText('Même cible', { exact: true }).click();
  await phone.locator('.home-mode', { hasText: '301' }).click();
  await phone.locator('.lobby-code-value').waitFor({ timeout: 10000 });
  check('nouvelle partie du saloon en 701', (await phone.locator('.setup-rules .segmented button.selected', { hasText: /^701$/ }).count()) === 1);

  // --- 6. Saloon fixé sur la borne ---
  await borne.goto(URL);
  await borne.locator('.home-account-toggle').click();
  await borne.getByText('Fixer ce saloon sur cet appareil (borne)').click();
  check('saloon fixé : plus de colonne', !(await borne.locator('.saloon-rail').count()));
  await shot(borne, '05-borne-saloon-fixe.png');
  await borne.reload();
  await borne.locator('.saloon-header-static').waitFor();
  check('saloon fixé après redémarrage', (await borne.locator('.saloon-header-static').innerText()).includes(SALOON) && !(await borne.locator('.saloon-rail').count()));

  check('aucune erreur JavaScript', errors.length === 0, errors.join(' | '));
  await browser.close();
  console.log(failed ? `${failed} échec(s)` : 'Recette parties des saloons : tout est OK');
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
