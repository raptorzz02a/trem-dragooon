// Recette des stats par saloon et du mot de passe oublié (avenant multi-groupes, lot 4) :
// 1. à la création du compte, le code de secours est montré une fois ;
// 2. Ju crée le saloon Cave et y invite Pierre ; Jacques reste dans le seul saloon public ;
// 3. Ju bat Pierre au 301 dans Cave, puis Jacques au 301 dans le saloon public ;
// 4. classements par saloon (membres et parties du saloon), minimum de parties réglé par l'admin du saloon ;
// 5. fiches : « Mes stats » avec le filtre Saloon, fiche d'un autre limitée aux saloons partagés ;
// 6. mot de passe oublié avec le code de secours ; sans code, demande à l'admin, vue dans Administration.
// Prérequis : serveur local neuf (port 8787), avec l'administrateur « admin » et Ju admin du saloon public :
//   npm run build && npx wrangler dev -c server/wrangler.toml --persist-to <dossier vide> --var PUBLIC_ADMINS:Ju<TAG>
// Usage : TAG=abcd node scripts/recette-saloons-stats.cjs [dossier-des-captures] [adresse]
const { chromium } = require('playwright');
const fs = require('fs');
const os = require('os');
const path = require('path');
const out = process.argv[2] || path.join(os.tmpdir(), 'trem-dragooon-saloons-stats');
const URL = process.argv[3] || 'http://localhost:8787/';
fs.mkdirSync(out, { recursive: true });
let failed = 0;
const check = (id, ok, detail = '') => { if (!ok) failed++; console.log(ok ? 'OK ' : 'KO ', id, detail); };

(async () => {
  const browser = await chromium.launch();
  const errors = [];
  const device = async (viewport, name) => {
    const ctx = await browser.newContext({ viewport, hasTouch: true, serviceWorkers: 'block', permissions: ['clipboard-read', 'clipboard-write'] });
    const p = await ctx.newPage();
    p.on('pageerror', (e) => errors.push(`${name}: ${e.message}`));
    return p;
  };
  const borne = await device({ width: 1366, height: 768 }, 'borne');
  const phone = await device({ width: 390, height: 844 }, 'téléphone');
  const laptop = await device({ width: 1280, height: 720 }, 'PC 13 pouces');
  const shot = (p, file) => p.screenshot({ path: path.join(out, file) });
  const tag = process.env.TAG || Date.now().toString(36).slice(-4);
  const PASS = 'secret123';
  const [JU, PIERRE, JACQUES] = ['Ju', 'Pierre', 'Jacques'].map((n) => n + tag);
  const SALOON = `Cave ${tag}`;

  /** Création du compte : renvoie le code de secours montré une fois. */
  const signup = async (p, name) => {
    await p.getByText('Créer un compte').click();
    await p.getByLabel('Pseudo').fill(name);
    await p.getByLabel('Mot de passe').fill(PASS);
    await p.locator('.online-login button').click();
    await p.locator('.recovery-code').waitFor({ timeout: 10000 });
    const code = (await p.locator('.recovery-code').innerText()).trim();
    await p.getByText('J’ai noté mon code').click();
    await p.getByText('Enregistrer').click();
    await p.locator('.home-account-name').waitFor({ timeout: 10000 });
    return code;
  };
  const login = async (p, name, password) => {
    await p.getByLabel('Pseudo').fill(name);
    await p.getByLabel('Mot de passe').fill(password);
    await p.locator('.online-login button[type=submit]').click();
    await p.locator('.home-account-name').waitFor({ timeout: 10000 });
  };
  const logout = async (p) => {
    await p.locator('.home-account-toggle').click();
    await p.getByRole('menuitem', { name: 'Déconnexion' }).click();
    await p.getByText('Créer un compte').waitFor();
  };
  const menu = async (p, name) => {
    await p.locator('.home-account-toggle').click();
    await p.getByRole('menuitem', { name }).click();
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
  /** Ju (sur la borne) bat `other` au 301 simple, dans le saloon ouvert. */
  const play301 = async (other) => {
    await borne.getByText('Même cible', { exact: true }).click();
    await borne.locator('.home-mode', { hasText: '301' }).click();
    await borne.locator('.lobby-code-value').waitFor({ timeout: 10000 });
    await borne.getByText('＋ Ajouter un joueur').click();
    await borne.getByLabel('Chercher un pseudo').fill(other);
    await borne.locator('.picker-tile', { hasText: other }).click();
    await borne.getByLabel('Mot de passe').fill(PASS);
    await borne.getByText('Ajouter à la partie').click();
    await borne.locator('.setup-list li', { hasText: other }).waitFor({ timeout: 10000 });
    await borne.getByText('301', { exact: true }).click();
    await borne.locator('.setup-rules .segmented button', { hasText: /^Simple$/ }).click();
    await borne.waitForTimeout(300);
    await borne.getByText('Ordre de la liste').click().catch(() => undefined);
    await borne.getByText('Lancer la partie').click();
    await borne.locator('.active-remaining').waitFor();
    for (const n of [20, 20, 20]) await tap(borne, 3, n); // Ju : 121
    await endTurn(borne);
    await tap(borne, 3, 20);
    await tap(borne, 1, 11);
    await skip(borne);
    await borne.locator('.pad-bull50').click();
    await borne.locator('.end-winner').waitFor();
    await borne.getByText('Changer les réglages').click();
    await borne.getByText('Fermer', { exact: true }).click();
    await borne.locator('.home-account-name').waitFor();
  };
  const finished = async (p) => Number((await p.locator('.tile', { hasText: 'Parties terminées' }).locator('.tile-value').innerText()).trim());
  const rankingNames = async (p) => (await p.locator('.ranking-row:not(.head) .ranking-name').allInnerTexts()).map((t) => t.trim());

  // --- 1. Code de secours à la création ---
  await borne.goto(URL);
  const juCode = await signup(borne, JU);
  check('code de secours montré à la création', /^[A-Z2-9]{4}(-[A-Z2-9]{4}){3}$/.test(juCode), juCode);

  // --- 2. Saloon Cave, invitation ---
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
  const jacquesCode = await signup(laptop, JACQUES);

  // --- 3. Une partie dans Cave, une dans le saloon public ---
  await play301(PIERRE);
  check('partie gagnée dans Cave', true);
  await borne.locator('.saloon-rail-item').first().click(); // saloon public
  await borne.waitForTimeout(300);
  await play301(JACQUES);
  check('partie gagnée dans le saloon public', true);

  // --- 4. Classements par saloon ---
  await borne.getByText('Classement du saloon').click();
  await borne.locator('.rankings-screen').waitFor();
  const publicNames = await rankingNames(borne);
  check('classement public : Ju et Jacques', publicNames.includes(JU) && publicNames.includes(JACQUES), publicNames.join(', '));
  check('classement public : pas la partie de Cave', !publicNames.includes(PIERRE));
  check('classement public = mondial', /Classement mondial/.test(await borne.locator('.rankings-note').innerText()));
  await shot(borne, '01-classement-public.png');
  await borne.getByText('← Retour').click();
  await borne.locator('.saloon-rail-item', { hasText: '🍺' }).click();
  await borne.waitForTimeout(300);
  await borne.getByText('Classement du saloon').click();
  await borne.locator('.rankings-screen').waitFor();
  const caveNames = await rankingNames(borne);
  check('classement de Cave : Ju et Pierre, pas Jacques', caveNames.includes(JU) && caveNames.includes(PIERRE) && !caveNames.includes(JACQUES), caveNames.join(', '));
  check('Cave : moins de 5 parties, pas encore classés', await borne.getByText('Moins de 5 parties').isVisible());
  await shot(borne, '02-classement-cave-5.png');
  await borne.getByText('← Retour').click();

  // Ju, propriétaire, classe à partir d'1 partie.
  await borne.locator('.saloon-header-info').click();
  await borne.getByLabel('Parties minimum pour être classé').fill('1');
  await borne.locator('.saloon-ranking').getByText('Enregistrer').click();
  await borne.locator('.saloon-ranking').getByText('Enregistré.').waitFor();
  await shot(borne, '03-reglage-classement.png');
  await borne.getByRole('button', { name: 'Fermer', exact: true }).click();
  await borne.getByText('Classement du saloon').click();
  await borne.locator('.rankings-screen').waitFor();
  check('Cave : classé dès 1 partie', !(await borne.getByText(/pas encore classés/).count()));
  const firstPos = (await borne.locator('.ranking-row:not(.head) .ranking-pos').first().innerText()).trim();
  check('Cave : Ju premier', firstPos === '1' && (await rankingNames(borne))[0] === JU);
  await shot(borne, '04-classement-cave-1.png');
  await borne.getByText('← Retour').click();

  // Pierre (membre) ne voit pas le réglage.
  await phone.reload();
  await phone.locator('.home-account-name').waitFor();
  await phone.locator('.saloon-header-info').click();
  check('membre : pas de réglage du classement', !(await phone.locator('.saloon-ranking').count()));
  await phone.getByRole('button', { name: 'Fermer', exact: true }).click();

  // --- 5. Fiches ---
  await menu(borne, 'Mes stats');
  await borne.locator('.profile-screen').waitFor();
  check('Mes stats : Tous saloons par défaut, 2 parties', (await finished(borne)) === 2);
  const filter = borne.locator('.lib-filters', { hasText: 'Saloon' });
  check('Mes stats : filtre Saloon', (await filter.locator('button').allInnerTexts()).length === 3, (await filter.locator('button').allInnerTexts()).join(' | '));
  await filter.getByText(SALOON).click();
  check('Mes stats : Cave seul, 1 partie', (await finished(borne)) === 1);
  await shot(borne, '05-mes-stats-cave.png');
  await borne.getByText('← Accueil').click();

  // Pierre ouvre la fiche de Ju depuis Cave : d'abord Cave, puis les saloons partagés (public compris).
  await phone.getByText('Classement du saloon').click();
  await phone.locator('.ranking-row', { hasText: JU }).click();
  await phone.locator('.profile-screen').waitFor();
  check('fiche d’un autre : saloon ouvert par défaut', (await finished(phone)) === 1);
  await phone.getByText('Saloons en commun').click();
  check('fiche d’un autre : saloons en commun', (await finished(phone)) === 2);
  await shot(phone, '06-fiche-ju-par-pierre.png');
  await phone.getByText('← Classement').click();
  await phone.getByText('← Retour').click();

  // Jacques ne partage que le saloon public avec Ju : la partie de Cave reste privée.
  await laptop.reload();
  await laptop.locator('.home-account-name').waitFor();
  await laptop.getByText('Classement du saloon').click();
  await laptop.locator('.ranking-row', { hasText: JU }).click();
  await laptop.locator('.profile-screen').waitFor();
  check('fiche de Ju vue par Jacques : 1 partie (saloon public)', (await finished(laptop)) === 1);
  check('fiche de Ju vue par Jacques : Cave n’apparaît pas', !(await laptop.getByText(SALOON).count()));
  await shot(laptop, '07-fiche-ju-par-jacques.png');
  await laptop.getByText('← Classement').click();
  await laptop.getByText('← Retour').click();

  // Ju, admin du saloon public (PUBLIC_ADMINS), peut régler son classement.
  await borne.locator('.saloon-rail-item').first().click();
  await borne.waitForTimeout(300);
  await borne.locator('.saloon-header-info').click();
  check('Ju admin du saloon public : réglage du classement', (await borne.locator('.saloon-ranking').count()) === 1);
  await borne.getByRole('button', { name: 'Fermer', exact: true }).click();

  // --- 6. Mot de passe oublié ---
  await logout(laptop);
  await laptop.getByText('Mot de passe oublié ?').click();
  await laptop.getByLabel('Pseudo').fill(JACQUES);
  await laptop.getByLabel('Code de secours').fill('AAAA-BBBB-CCCC-DDDD');
  await laptop.getByLabel('Nouveau mot de passe').fill('nouveau456');
  await laptop.getByText('Changer mon mot de passe').click();
  await laptop.locator('.online-error').waitFor();
  check('mauvais code refusé', /code de secours incorrect/.test(await laptop.locator('.online-error').innerText()));
  await laptop.getByLabel('Code de secours').fill(jacquesCode.toLowerCase().replace(/-/g, ' '));
  await laptop.getByText('Changer mon mot de passe').click();
  await laptop.locator('.recovery-code').waitFor({ timeout: 10000 });
  const newCode = (await laptop.locator('.recovery-code').innerText()).trim();
  check('code de secours : connecté, nouveau code donné', newCode !== jacquesCode && /^[A-Z2-9]{4}(-[A-Z2-9]{4}){3}$/.test(newCode));
  await shot(laptop, '08-nouveau-code.png');
  await laptop.getByText('J’ai noté mon code').click();
  await logout(laptop);
  await login(laptop, JACQUES, 'nouveau456');
  check('connexion avec le nouveau mot de passe', true);
  await logout(laptop);
  await laptop.getByText('Mot de passe oublié ?').click();
  await laptop.getByLabel('Pseudo').fill(JACQUES);
  await laptop.getByLabel('Code de secours').fill(jacquesCode);
  await laptop.getByLabel('Nouveau mot de passe').fill('encore789');
  await laptop.getByText('Changer mon mot de passe').click();
  await laptop.locator('.online-error').waitFor();
  check('l’ancien code ne sert qu’une fois', true);
  await laptop.getByText('← Connexion').last().click();

  // Nouveau code depuis le menu du compte.
  await menu(borne, 'Code de secours');
  await borne.getByLabel('Mot de passe').fill(PASS);
  await borne.getByRole('button', { name: 'Nouveau code' }).click();
  await borne.locator('.recovery-code').waitFor();
  check('nouveau code depuis le menu', (await borne.locator('.recovery-code').innerText()).trim() !== juCode);
  await borne.getByText('J’ai noté mon code').click();

  // Sans code : demande à l'admin.
  await logout(phone);
  await phone.getByText('Mot de passe oublié ?').click();
  await phone.getByLabel('Pseudo').fill(PIERRE);
  await phone.getByText('Demander à un admin').click();
  await phone.getByText(/Demande envoyée/).waitFor();
  await shot(phone, '09-demande-admin.png');
  check('demande à un admin envoyée', true);

  // L'administrateur la voit et crée un mot de passe provisoire.
  await laptop.getByText('Créer un compte').click();
  await laptop.getByLabel('Pseudo').fill('admin');
  await laptop.getByLabel('Mot de passe').fill(PASS);
  await laptop.locator('.online-login button').click();
  const adminReady = await laptop.locator('.recovery-code').waitFor({ timeout: 5000 }).then(() => true, () => false);
  if (!adminReady) {
    console.log('-- compte « admin » déjà pris sur ce serveur : partie Administration non vérifiée');
  } else {
    await laptop.getByText('J’ai noté mon code').click();
    await laptop.getByText('Enregistrer').click();
    await menu(laptop, 'Administration');
    const request = laptop.locator('.admin-requests .admin-row', { hasText: PIERRE });
    await request.waitFor({ timeout: 10000 });
    check('demande listée dans Administration', true);
    await shot(laptop, '10-administration-demande.png');
    await request.getByText('Mot de passe provisoire').click();
    await laptop.getByText('Créer le mot de passe').click();
    const result = await laptop.locator('.admin-result').innerText();
    const temp = /: ([a-z2-9]{8})/.exec(result)?.[1];
    check('mot de passe provisoire créé', !!temp);
    await laptop.getByText('OK', { exact: true }).click();
    check('demande traitée : retirée de la liste', !(await laptop.locator('.admin-requests').count()));
    await phone.getByText('← Connexion').click();
    await login(phone, PIERRE, temp);
    check('Pierre se connecte avec le mot de passe provisoire', true);
  }

  check('aucune erreur JavaScript', errors.length === 0, errors.join(' | '));
  await browser.close();
  console.log(failed ? `${failed} contrôle(s) en échec` : 'Tous les contrôles sont OK', '· captures :', out);
  process.exit(failed ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
