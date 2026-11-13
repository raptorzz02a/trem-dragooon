// Recette « supprimer une partie en cours » depuis l'accueil (saloon public) :
// 1. Ju crée une partie et revient à l'accueil : il voit la corbeille, Pierre ne la voit pas ;
// 2. Pierre ne peut pas la supprimer par l'API (refus du serveur) ;
// 3. Ju clique la corbeille, annule (rien ne change), puis confirme : la partie disparaît pour tout le monde
//    et Pierre, qui la regardait, est prévenu.
// Prérequis : npm run online:dev dans un autre terminal (port 8787), Playwright installé.
// Usage : node scripts/recette-supprimer-partie.cjs [dossier-des-captures] [adresse]
const { chromium } = require('playwright');
const fs = require('fs');
const os = require('os');
const path = require('path');
const out = process.argv[2] || path.join(os.tmpdir(), 'trem-dragooon-supprimer-partie');
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

  await laptop.goto(URL);
  await signup(laptop, JU);
  await phone.goto(URL);
  await signup(phone, PIERRE);
  await laptop.getByText('Même cible', { exact: true }).click();
  await laptop.locator('.home-mode', { hasText: 'Horloge' }).click();
  await laptop.locator('.lobby-code-value').waitFor({ timeout: 10000 });
  await laptop.getByText('← Accueil').click();
  await row(laptop).waitFor({ timeout: 10000 });
  check('l’hôte voit la corbeille', (await row(laptop).locator('.home-live-delete').count()) === 1);
  await phone.reload();
  await row(phone).waitFor({ timeout: 10000 });
  check('un autre joueur ne voit pas la corbeille', (await row(phone).locator('.home-live-delete').count()) === 0);
  await shot(laptop, '01-corbeille.png');

  // Pierre tente quand même par l'API.
  const refused = await phone.evaluate(async () => {
    const token = localStorage.getItem('trem-dragooon.account.token');
    const r = await fetch('/api/saloons/trem-dragooon/games', { headers: { Authorization: `Bearer ${token}` } }).then((x) => x.json());
    const key = r.games?.[0]?.watchKey;
    const d = await fetch(`/api/saloons/trem-dragooon/games/${key}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    return { status: d.status, body: await d.json() };
  });
  check('le serveur refuse la suppression à un non-hôte', refused.status >= 400 && /hôte/.test(refused.body.error), JSON.stringify(refused));

  // Pierre regarde la partie.
  await row(phone).getByText('Regarder').click();
  await phone.waitForTimeout(1500);

  await row(laptop).locator('.home-live-delete').click();
  await shot(laptop, '02-confirmation.png');
  check('une confirmation est demandée', (await laptop.locator('.home-live-confirm').count()) === 1);
  await row(laptop).getByText('Annuler').click();
  check('annuler garde la partie', (await row(laptop).getByText('Reprendre').count()) === 1);
  await row(laptop).locator('.home-live-delete').click();
  await row(laptop).getByText('Supprimer', { exact: true }).click();
  await laptop.waitForTimeout(1500);
  check('la partie disparaît de la liste de l’hôte', (await row(laptop).count()) === 0);
  check('le bouton « Reprendre la partie » disparaît aussi', (await laptop.locator('.home-resume').count()) === 0);
  await shot(laptop, '03-supprimee.png');
  await phone
    .getByText('Cette partie n’est plus en cours.')
    .first()
    .waitFor({ timeout: 10000 })
    .then(() => check('le spectateur est prévenu', true), () => check('le spectateur est prévenu', false));
  await shot(phone, '04-spectateur.png');
  check('aucune erreur JavaScript', errors.length === 0, errors.join(' ; '));
  await browser.close();
  console.log(failed ? `${failed} échec(s)` : 'Tout est bon', '— captures :', out);
  process.exit(failed ? 1 : 0);
})();
