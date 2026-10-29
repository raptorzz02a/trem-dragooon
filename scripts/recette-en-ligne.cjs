// Recette du mode en ligne : deux appareils (une borne 1366x768 et un téléphone) créent leur compte,
// jouent une partie de 301, puis la retrouvent dans les stats des joueurs en ligne.
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
  const host = await device({ width: 1366, height: 768 }, 'borne');
  const guest = await device({ width: 390, height: 844 }, 'téléphone');
  const shot = (p, file) => p.screenshot({ path: path.join(out, file) });
  // Pseudos uniques à chaque recette : la base locale garde les comptes d'une fois sur l'autre.
  const tag = Date.now().toString(36).slice(-4);
  const JU = `Ju${tag}`;
  const MAX = `Max${tag}`;
  const login = async (p, name, password, signup) => {
    if (signup) await p.getByText('Créer un compte').click();
    await p.getByLabel('Pseudo').fill(name);
    await p.getByLabel('Mot de passe').fill(password);
    await p.locator('.online-login button').click();
    if (signup) await p.getByText('Enregistrer').click(); // avatar proposé à la création
    await p.locator('.online-me-name').waitFor({ timeout: 10000 });
  };
  const newPlayer = (p, name) => login(p, name, 'secret123', true);

  // Hôte : crée son compte puis un salon.
  await host.goto(URL);
  await host.getByText('Jouer en ligne').click();
  await newPlayer(host, JU);
  check('compte créé et connecté', (await host.locator('.online-me-name').innerText()).trim() === JU);
  await host.getByText('Créer une partie').click();
  const code = (await host.locator('.online-code').innerText({ timeout: 10000 })).trim();
  check('code affiché', /^[A-Z2-9]{6}$/.test(code), code);

  // Invité : arrive par le lien partagé, sans retaper le code.
  await guest.goto(`${URL}?salon=${code}`);
  await newPlayer(guest, MAX);
  check('code prérempli', (await guest.locator('.online-join input').inputValue()) === code);
  await shot(guest, '1-rejoindre-telephone.png');
  await guest.getByText('Rejoindre', { exact: true }).click();
  await host.locator('.online-players li').nth(1).waitFor();
  check('l’hôte voit l’invité', (await host.locator('.online-players').innerText()).includes(MAX));
  check('l’invité attend l’hôte', await guest.getByText('En attente du lancement').isVisible());

  await host.getByText('301', { exact: true }).click();
  await guest.getByText(/^301 ·/).waitFor();
  check('réglage reçu par l’invité', true);
  await shot(host, '2-salle-attente-borne.png');
  await shot(guest, '3-salle-attente-telephone.png');

  // Partie : l'ordre est tiré au sort, on suit qui doit jouer.
  await host.getByText('Lancer la partie').click();
  await host.locator('.active-remaining').waitFor();
  await guest.locator('.active-remaining').waitFor();
  const skip = async (p) => { const o = p.locator('.transition'); if (await o.count()) await o.click({ position: { x: 5, y: 5 } }); };
  const active = async () => (await host.locator('.active-name').innerText()).trim();
  const tap = async (p, m, n) => {
    await skip(p);
    if (m > 1) await p.locator(`.pad-mult-${m}`).click();
    await p.locator('.pad-num').nth(n - 1).click();
    await p.waitForTimeout(450);
  };
  const devices = { [JU]: host, [MAX]: guest };
  const first = await active();
  const other = first === JU ? MAX : JU;
  check('le pavé est bloqué pour celui qui attend', await devices[other].locator('.pad-num').first().isDisabled());
  await skip(devices[first]);
  await shot(guest, '4-partie-telephone.png');
  await tap(devices[first], 3, 20);
  await devices[other].waitForTimeout(300);
  check('la fléchette apparaît chez l’autre', (await devices[other].locator('.active-remaining').innerText()).trim() === '241');
  await tap(devices[first], 3, 20);
  await tap(devices[first], 3, 20); // reste 121, fin de volée
  await skip(host); await skip(guest);
  check('le tour passe', (await active()) === other);
  for (let i = 0; i < 3; i++) await tap(devices[other], 1, 1);
  await skip(host); await skip(guest);
  await tap(devices[first], 3, 20);
  await tap(devices[first], 1, 11);
  await skip(devices[first]);
  await devices[first].locator('.pad-bull50').click(); // 121 : victoire sur le Bull
  await host.locator('.end-winner').waitFor();
  await guest.locator('.end-winner').waitFor();
  check('victoire vue sur les deux appareils', (await guest.locator('.end-winner').innerText()).trim() === first);
  check('seul l’hôte peut relancer', (await host.getByText('Rejouer').count()) === 1 && (await guest.getByText('Rejouer').count()) === 0);
  await shot(guest, '5-victoire-telephone.png');

  // Coupure : l'invité recharge la page et revient dans le salon.
  await host.getByText('Salle d’attente').click();
  await host.getByText('Lancer la partie').waitFor();
  await guest.reload();
  await guest.getByText(/Revenir dans le salon en ligne/).click();
  await guest.getByText('En attente du lancement').waitFor({ timeout: 10000 });
  check('reprise après rechargement', (await host.locator('.online-players li').count()) === 2);

  // La partie terminée est enregistrée : elle apparaît dans les stats des joueurs en ligne.
  const third = await device({ width: 390, height: 844 }, 'intrus');
  await third.goto(URL);
  await third.getByText('Jouer en ligne').click();
  await third.getByText('Stats et classements des joueurs en ligne').click();
  await third.locator('.ranking-row', { hasText: JU }).click();
  await third.locator('.profile-head').waitFor();
  check('fiche d’un autre joueur sans modification', (await third.getByText('Supprimer').count()) === 0);
  check('partie en ligne dans ses stats', (await third.locator('.profile-content').innerText()).includes('1'));
  await shot(third, '6-stats-en-ligne.png');
  await third.getByText('← Classements').click();
  await third.getByText('← Retour').click();

  // Mauvais mot de passe, puis connexion depuis un autre appareil.
  await third.getByLabel('Pseudo').fill(MAX);
  await third.getByLabel('Mot de passe').fill('mauvais');
  await third.locator('.online-login button').click();
  await third.getByText('Pseudo ou mot de passe incorrect').waitFor({ timeout: 10000 });
  check('mauvais mot de passe refusé', true);
  await third.getByText('Se déconnecter').count();
  const leo = `Leo${tag}`;
  await newPlayer(third, leo);

  // Mauvais code.
  await third.locator('.online-join input').fill('ZZZZZZ');
  await third.getByText('Rejoindre', { exact: true }).click();
  await third.getByText('Aucune partie avec ce code').waitFor({ timeout: 10000 });
  check('code inconnu refusé', true);

  check('aucune erreur JavaScript', errors.length === 0, errors.join(' | '));
  await browser.close();
  console.log(failed ? `${failed} échec(s)` : 'Tout est OK', '— captures dans', out);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
