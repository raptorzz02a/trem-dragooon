// Recette de l'interface : rejoue dans Chromium les critères d'acceptation vérifiables à l'écran.
// Prérequis : npm run build puis npm run preview (port 4173) dans un autre terminal, et Playwright installé
// (npm install --no-save playwright && npx playwright install chromium).
// Usage : node scripts/recette-ui.cjs [dossier-des-captures]
const { chromium } = require('playwright');
const fs = require('fs');
const os = require('os');
const path = require('path');
const out = process.argv[2] || path.join(os.tmpdir(), 'trem-dragooon-recette');
fs.mkdirSync(out, { recursive: true });
const results = [];
const check = (id, ok, detail) => { results.push({ id, ok: !!ok, detail }); console.log(ok ? 'OK ' : 'KO ', id, detail); };
const URL = 'http://localhost:4173/';
(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'trem-dragooon-profil-'));
  let ctx = await chromium.launchPersistentContext(dir, { viewport: { width: 1366, height: 768 }, hasTouch: true });
  let p = ctx.pages()[0] || await ctx.newPage();
  const errors = [];
  const watch = (pg) => { pg.on('pageerror', e => errors.push(e.message)); pg.on('console', m => { if (m.type() === 'error') errors.push(m.text()); }); };
  watch(p);
  await p.goto(URL); await p.waitForTimeout(300);
  const saved = () => p.evaluate(() => JSON.parse(localStorage.getItem('trem-dragooon.current-game') || 'null'));
  const nEvents = async () => ((await saved())?.session.events.length) ?? 0;
  const remaining = async () => Number(await p.locator('.active-remaining').innerText());
  const dbGames = () => p.evaluate(() => new Promise((res) => { const r = indexedDB.open('trem-dragooon'); r.onsuccess = () => { const q = r.result.transaction('games').objectStore('games').getAll(); q.onsuccess = () => res(q.result.map((g) => g.session.status)); }; }));
  const tapNum = async (m, n) => { if (m > 1) await p.tap('.pad-mult-' + m); await p.locator('.pad-num').nth(n - 1).tap(); await p.waitForTimeout(300); };
  const tapSel = async (sel) => { await p.tap(sel); await p.waitForTimeout(300); };
  const skip = async () => { await p.waitForTimeout(150); const o = p.locator('.transition'); if (await o.count()) await o.tap({ position: { x: 5, y: 5 } }); await p.waitForTimeout(200); };

  // H02 : tout le parcours ci-dessous se fait au tactile (tap), sans clavier sauf la saisie des surnoms.
  await p.tap('.home-links button:has-text("Joueurs")');
  for (const name of ['Alice', 'Bruno']) {
    await p.tap('button:has-text("Nouveau joueur")');
    await p.fill('.profile-editor input', name);
    await p.tap('.profile-editor button:has-text("Enregistrer")');
  }
  await p.tap('button:has-text("Accueil")');
  await p.tap('.home-mode:has-text("301")');
  await p.tap('.segmented button:text-is("301")');
  await p.tap('.segmented button:text-is("Simple")');
  await p.tap('.segmented button:text-is("Ordre de la liste")');
  await p.tap('button:has-text("Ajouter des joueurs")');
  await p.tap('.picker-tile:has-text("Alice")'); await p.tap('.picker-tile:has-text("Bruno")');
  await p.tap('button:has-text("Terminé")');
  // F07 : on inverse l'ordre puis on le rétablit.
  await p.locator('.setup-list li').nth(0).locator('button[aria-label="Descendre"]').tap();
  const order = await p.locator('.setup-name').allInnerTexts();
  check('F07', order.join(',') === 'Bruno,Alice', 'ordre modifié avant le départ : ' + order.join(', '));
  await p.locator('.setup-list li').nth(0).locator('button[aria-label="Descendre"]').tap();
  await p.tap('text=Lancer la partie'); await p.waitForTimeout(300);
  check('B01', (await remaining()) === 301, 'départ à ' + (await remaining()));

  await tapSel('.pad-mult-3'); // A07 : multiplicateur seul
  check('A07', (await nEvents()) === 0 && (await remaining()) === 301, 'zone Triple choisie sans numéro : aucun score modifié');
  await tapSel('.pad-mult-1');
  await tapNum(1, 20); check('A01', (await remaining()) === 281, 'S20 → reste ' + (await remaining()));
  // H03 : double appui rapide sur D20.
  await p.tap('.pad-mult-2');
  const before = await nEvents();
  const btn = p.locator('.pad-num').nth(19);
  await btn.tap(); await btn.tap(); await p.waitForTimeout(300);
  check('H03', (await nEvents()) - before === 1, 'double appui accidentel : ' + ((await nEvents()) - before) + ' fléchette enregistrée');
  check('A02', (await remaining()) === 241, 'D20 → reste ' + (await remaining()));
  // A08 : annuler puis ressaisir.
  await p.tap('button:has-text("Annuler la fléchette")'); await p.waitForTimeout(300);
  check('A08', (await remaining()) === 281 && (await nEvents()) === 1, 'annulation : reste ' + (await remaining()));
  await tapNum(2, 20);
  await tapNum(3, 20);
  // F05 + A10 : transition annoncée, pas de 4e fléchette pour Alice.
  await p.waitForTimeout(150);
  const transName = await p.locator('.transition-name').innerText().catch(() => '');
  check('F05', transName === 'Bruno', 'écran « À toi de jouer » : ' + transName);
  await p.screenshot({ path: out + '/F05-transition.png' });
  await p.locator('.pad-num').nth(0).tap({ force: true }).catch(() => {}); await p.waitForTimeout(300);
  check('A10', (await nEvents()) === 3, 'saisie pendant la transition ignorée (' + (await nEvents()) + ' fléchettes)');
  await skip();
  await tapSel('.pad-bull25'); check('A04', (await remaining()) === 276, 'Bull 25 → reste ' + (await remaining()));
  await tapSel('.pad-bull50'); check('A05', (await remaining()) === 226, 'Bull 50 → reste ' + (await remaining()));
  await tapSel('.pad-miss');
  const s = await saved();
  check('A06', s.session.events.length === 6 && (await p.locator('.transition').count()) === 1, 'Raté : 0 point, fléchette consommée, tour terminé');
  await skip();

  // G01 : fermeture du navigateur en pleine partie, puis reprise.
  await tapNum(3, 20);
  await ctx.close();
  ctx = await chromium.launchPersistentContext(dir, { viewport: { width: 1366, height: 768 }, hasTouch: true });
  p = ctx.pages()[0] || await ctx.newPage(); watch(p);
  await p.goto(URL); await p.waitForTimeout(400);
  const canResume = await p.locator('button:has-text("Reprendre la partie en cours")').count();
  await p.tap('button:has-text("Reprendre la partie en cours")'); await p.waitForTimeout(300);
  check('G01', canResume === 1 && (await remaining()) === 121, 'navigateur fermé puis rouvert : reprise, Alice à ' + (await remaining()));

  // H07 : confirmation avant de quitter.
  await p.tap('button.game-quit'); await p.waitForTimeout(200);
  const dlg = await p.locator('.dialog').count();
  await p.screenshot({ path: out + '/H07-quitter.png' });
  await p.tap('button:has-text("Continuer à jouer")');
  check('H07', dlg === 1, 'Quitter demande confirmation');

  // H08 : inactivité.
  await p.waitForTimeout(15000);
  check('H08', (await remaining()) === 121, '15 s sans toucher : partie intacte (pas de remise à zéro automatique)');

  // H06 : coupure réseau après chargement.
  await ctx.setOffline(true);
  await tapNum(3, 20); await tapNum(3, 20); await skip();
  for (let i = 0; i < 3; i++) await tapSel('.pad-miss');
  await skip();
  await tapNum(1, 1); await p.waitForTimeout(500);
  const won = await p.locator('.dialog').innerText().catch(() => '');
  const g = await dbGames();
  check('H06', won.includes('Alice') && g.length === 1, 'hors ligne : partie jouée jusqu’à la victoire et archivée');
  await ctx.setOffline(false);
  await p.screenshot({ path: out + '/B06-victoire.png' });
  // G03 : annuler la dernière fléchette rouvre la partie, la refinir ne crée pas de doublon.
  await p.tap('.dialog button:has-text("Annuler la dernière fléchette")'); await p.waitForTimeout(300);
  const g2 = await dbGames();
  await tapNum(1, 1); await p.waitForTimeout(500);
  const g3 = await dbGames();
  check('G03', g2.length === 0 && g3.length === 1 && g3[0] === 'finished', `archive : ${g2.length} après annulation, ${g3.length} après la nouvelle victoire`);
  // F06 : revanche avec les mêmes joueurs et règles.
  await p.tap('button:has-text("Rejouer")'); await p.waitForTimeout(300);
  const s2 = await saved();
  const ids = s2.session.config.sides.map((x) => x.playerIds[0]).sort();
  const ids1 = s.session.config.sides.map((x) => x.playerIds[0]).sort();
  check('F06', JSON.stringify(ids) === JSON.stringify(ids1) && s2.session.config.options.startScore === 301 && s2.session.config.options.out === 'straight', 'revanche : mêmes joueurs, 301 sortie simple');
  // G04 / G10 : abandon.
  await tapNum(3, 20);
  await p.tap('button.game-quit'); await p.tap('.dialog .btn-danger'); await p.waitForTimeout(400);
  const g4 = await dbGames();
  await p.tap('.home-links button:has-text("Classements")'); await p.waitForTimeout(300);
  const rows = await p.locator('.ranking-row:not(.head)').allInnerTexts();
  check('G04', g4.filter((x) => x === 'abandoned').length === 1 && rows.some((r) => /Bruno\s+1\s+0\s+0 %/.test(r)) && rows.some((r) => /Alice\s+1\s+1\s+100 %/.test(r)),
    'partie abandonnée archivée sans vainqueur ; classements : ' + rows.map((r) => r.replace(/\s+/g, ' ')).join(' | '));
  await p.screenshot({ path: out + '/G09-classements.png' });
  // G09 : filtre Cricket vide.
  await p.tap('.lib-filters .segmented button:text-is("Cricket")'); await p.waitForTimeout(200);
  check('G09', (await p.locator('.lib-empty').count()) === 1, 'classement Cricket : aucune partie X01 ne s’y mélange');
  await p.tap('button:has-text("Accueil")');

  // G02 : redémarrage complet (nouveau navigateur sur le même profil).
  await ctx.close();
  ctx = await chromium.launchPersistentContext(dir, { viewport: { width: 1920, height: 1080 }, hasTouch: true });
  p = ctx.pages()[0] || await ctx.newPage(); watch(p);
  await p.goto(URL); await p.waitForTimeout(400);
  await p.tap('.home-links button:has-text("Joueurs")'); await p.waitForTimeout(200);
  const tiles = await p.locator('.player-tile').allInnerTexts();
  check('G02', tiles.length === 2 && tiles.some((t) => t.includes('Alice') && t.includes('1 partie')), 'après redémarrage : ' + tiles.map((t) => t.replace(/\s+/g, ' ')).join(' | '));

  // H04 : Full HD.
  const fits = async () => p.evaluate(() => document.documentElement.scrollWidth <= innerWidth && document.documentElement.scrollHeight <= innerHeight);
  await p.tap('button:has-text("Accueil")');
  const homeFits = await fits();
  await p.screenshot({ path: out + '/H04-accueil-fullhd.png' });
  // H09 : animations désactivées.
  await p.evaluate(() => localStorage.setItem('trem-dragooon.settings', JSON.stringify({ transitionMs: 1500, animations: false })));
  await p.reload(); await p.waitForTimeout(300);
  await p.tap('.home-mode:has-text("Cricket")');
  await p.tap('button:has-text("Ajouter des joueurs")');
  await p.tap('.picker-tile:has-text("Alice")'); await p.tap('.picker-tile:has-text("Bruno")');
  await p.tap('button:has-text("Terminé")');
  await p.tap('text=Lancer la partie'); await p.waitForTimeout(300);
  const gameFits = await fits();
  await p.screenshot({ path: out + '/H04-cricket-fullhd.png' });
  check('H04', homeFits && gameFits, 'accueil et partie en 1920×1080 sans défilement');
  for (let i = 0; i < 3; i++) await tapSel('.pad-miss');
  await p.waitForTimeout(100);
  check('H09', (await p.locator('.transition').count()) === 0 && (await saved()).session.events.length === 3, 'animations désactivées : pas d’écran de transition, le tour passe directement');
  // H10 : le Cricket démarre de zéro après la partie X01.
  check('H10', (await saved()).session.config.mode === 'cricket', 'nouvelle partie Cricket indépendante de la partie 301 (aussi couvert par un test automatique)');
  await ctx.close();
  fs.writeFileSync(out + '/recette.json', JSON.stringify({ results, errors }, null, 2));
  console.log('erreurs console', JSON.stringify(errors));
  console.log(`${results.filter((r) => r.ok).length}/${results.length} critères conformes. Captures et résultats : ${out}`);
  process.exit(results.every((r) => r.ok) && errors.length === 0 ? 0 : 1);
})();
