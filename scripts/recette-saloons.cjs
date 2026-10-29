// Recette des saloons (avenant multi-groupes, lot 1) :
// 1. Ju (borne 1366x768) crée un saloon, l'interface prend sa couleur, il récupère le lien d'invitation ;
// 2. Pierre (téléphone) ouvre le lien sans compte : il crée son compte et entre directement dans le saloon ;
// 3. Jacques (PC 13 pouces) rejoint avec le nom et le mot de passe (refusé d'abord avec un mauvais mot de passe) ;
// 4. une partie créée dans le saloon démarre ; Jacques quitte le saloon ; un nouveau lien rend l'ancien inutilisable.
// Prérequis : npm run online:dev dans un autre terminal (port 8787), Playwright installé.
// Usage : node scripts/recette-saloons.cjs [dossier-des-captures] [adresse]
const { chromium } = require('playwright');
const fs = require('fs');
const os = require('os');
const path = require('path');
const out = process.argv[2] || path.join(os.tmpdir(), 'trem-dragooon-saloons');
const URL = process.argv[3] || 'http://localhost:8787/';
fs.mkdirSync(out, { recursive: true });
let failed = 0;
const check = (id, ok, detail = '') => { if (!ok) failed++; console.log(ok ? 'OK ' : 'KO ', id, detail); };

(async () => {
  const browser = await chromium.launch();
  const errors = [];
  const device = async (viewport, name) => {
    const ctx = await browser.newContext({ viewport, hasTouch: true, serviceWorkers: 'block' });
    await ctx.grantPermissions(['clipboard-read', 'clipboard-write']).catch(() => undefined);
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
  const SALOON = `Potes ${tag}`;
  const SALOON_PASS = 'biere';

  const signup = async (p, name) => {
    await p.getByText('Créer un compte').click();
    await p.getByLabel('Pseudo').fill(name);
    await p.getByLabel('Mot de passe').fill(PASS);
    await p.locator('.online-login button').click();
    await p.getByText('Enregistrer').click();
    await p.locator('.home-account-name').waitFor({ timeout: 10000 });
  };
  // Nom du saloon ouvert, sans son icône.
  const header = (p) =>
    p.locator('.saloon-header-name').filter({ visible: true }).first().evaluate((el) => [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join('').trim());
  const green = (p) => p.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--green-bright').trim());

  // --- 1. Création ---
  await borne.goto(URL);
  await signup(borne, `Ju${tag}`);
  await borne.waitForTimeout(500);
  check('saloon public ouvert par défaut', (await header(borne)) === 'TREM-DRAGOOON');
  check('colonne d’icônes sur PC', await borne.locator('.saloon-rail').isVisible());
  await shot(borne, '01-accueil-saloon-public.png');
  await borne.locator('.saloon-rail-add').click();
  await borne.getByText('Créer', { exact: true }).click();
  await borne.getByLabel('Nom du saloon').fill(SALOON);
  await borne.getByLabel('Mot de passe du saloon').fill(SALOON_PASS);
  await borne.getByLabel('Couleur #3d7fd9').click();
  await borne.getByText('🍺').click();
  await shot(borne, '02-creer-saloon.png');
  await borne.getByText('Créer le saloon').click();
  const linkInput = borne.getByLabel("Lien d'invitation");
  await linkInput.waitFor({ timeout: 10000 });
  const link = await linkInput.inputValue();
  check('lien d’invitation affiché', /\?invitation=[0-9a-f]{32}$/.test(link), link);
  await shot(borne, '03-saloon-cree-lien.png');
  await borne.getByText('Fermer', { exact: true }).click();
  check('saloon créé ouvert', (await header(borne)) === SALOON);
  check('interface à la couleur du saloon', (await green(borne)) === '#3d7fd9', await green(borne));
  await shot(borne, '04-accueil-saloon-prive.png');

  // --- 2. Invitation ---
  await phone.goto(link);
  await signup(phone, `Pierre${tag}`);
  await phone.locator('.online-banner').waitFor({ timeout: 10000 });
  check('invité entré sans mot de passe', (await header(phone)) === SALOON);
  check('menu déroulant sur téléphone', await phone.locator('.saloon-header-toggle').isVisible());
  await shot(phone, '05-telephone-invite.png');
  await phone.locator('.saloon-header-toggle').click();
  await shot(phone, '06-telephone-menu-saloons.png');
  await phone.locator('.saloon-menu').getByText('TREM-DRAGOOON').click();
  check('changement de saloon sur téléphone', (await header(phone)) === 'TREM-DRAGOOON');

  // --- 3. Nom + mot de passe ---
  await laptop.goto(URL);
  await signup(laptop, `Jacques${tag}`);
  await laptop.locator('.saloon-rail-add').click();
  await laptop.getByLabel('Nom du saloon').fill(SALOON.toUpperCase());
  await laptop.getByLabel('Mot de passe du saloon').fill('mauvais');
  await laptop.getByText('Entrer', { exact: true }).click();
  await laptop.locator('.saloon-dialog .online-error').waitFor({ timeout: 10000 });
  check('mauvais mot de passe refusé', /incorrect/.test(await laptop.locator('.saloon-dialog .online-error').innerText()));
  await laptop.getByLabel('Mot de passe du saloon').fill(SALOON_PASS);
  await laptop.getByText('Entrer', { exact: true }).click();
  await laptop.locator('.saloon-dialog').waitFor({ state: 'detached', timeout: 10000 });
  check('entrée avec nom + mot de passe', (await header(laptop)) === SALOON);
  await borne.reload();
  await borne.locator('.saloon-header-info').waitFor();
  check('3 membres vus par le propriétaire', /3 membres/.test(await borne.locator('.saloon-header-info').innerText()));

  // --- 4. Partie, départ, nouveau lien ---
  await laptop.locator('.home-mode').first().click();
  await laptop.waitForTimeout(1500);
  check('partie créée dans le saloon', !(await laptop.locator('.home-mode').count()));
  await shot(laptop, '07-partie-dans-le-saloon.png');
  await laptop.goto(URL);
  await laptop.locator('.saloon-header-info').click();
  await laptop.getByText('Quitter le saloon').click();
  await laptop.getByText('Confirmer : quitter').click();
  await laptop.waitForTimeout(800);
  check('saloon quitté, retour au saloon public', (await header(laptop)) === 'TREM-DRAGOOON');
  await borne.locator('.saloon-header-info').click();
  await borne.getByRole('button', { name: 'Nouveau lien' }).click();
  await borne.waitForTimeout(800);
  check('nouveau lien différent', (await borne.getByLabel("Lien d'invitation").inputValue()) !== link);
  await laptop.goto(link);
  await laptop.locator('.online-banner-error').waitFor({ timeout: 10000 });
  check('ancien lien refusé', /plus valable/.test(await laptop.locator('.online-banner-error').innerText()));

  check('aucune erreur JavaScript', errors.length === 0, errors.join(' | '));
  await browser.close();
  console.log(failed ? `${failed} échec(s)` : 'Recette saloons : tout est OK');
  process.exit(failed ? 1 : 0);
})();
