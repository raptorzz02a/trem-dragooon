// Recette « vues par jeu » de la tablette, sans serveur : la page reçoit des tableaux préparés à la main
// (Cricket, Horloge, Cible du tour, Halve-it, Killer, jeu sans vue dédiée, X01) et on vérifie ce qu'elle affiche.
// Usage : node scripts/recette-tableau-vues.cjs [dossier-des-captures]
const { chromium } = require('playwright');
const fs = require('fs');
const os = require('os');
const path = require('path');
const out = process.argv[2] || path.join(os.tmpdir(), 'trem-dragooon-tableau-vues');
fs.mkdirSync(out, { recursive: true });
const html = fs.readFileSync(path.join(__dirname, '..', 'public', 'tableau.html'), 'utf8');
let failed = 0;
const check = (id, ok, detail = '') => { if (!ok) failed++; console.log(ok ? 'OK ' : 'KO ', id, detail); };
const expectations = {
  cricket: (d) => ['Cricket : trait, croix et rond', d.marks === '1:5 2:4 3:9', d.marks],
  clock: (d) => ['Horloge : cible 14, cadran et autres joueurs', d.target === 'À viser 14' && d.ringCur === '14' && d.ringDone === 13 && d.others === 4, JSON.stringify(d)],
  targets: (d) => ['Cible du tour : cible 17 en cours, manche 5/10', d.target === 'Cible 17' && d.tgCur === '17' && d.round === 'Manche 5 / 10', JSON.stringify(d)],
  halveit: (d) => ['Halve-it : double 7', d.target === 'Cible D7' && d.tgCur === 'D7', JSON.stringify(d)],
  killer: (d) => ['Killer : 6 cartes, 1 éliminé', d.cards === 6 && d.gone === 1 && d.score === 'Numéro 16', JSON.stringify(d)],
  plain: (d) => ['jeu sans vue dédiée : score et autres joueurs, sans out', d.score === 'Score 312' && d.others === 2 && !d.outsVisible, JSON.stringify(d)],
  training: (d) => ['Entraînement : dernière volée à la place de l’out', d.outlab === 'Dernière volée · 66' && d.outs === 'T20 S5 S1' && d.score === 'Score 412', JSON.stringify(d)],
  x01: (d) => ['X01 inchangé : reste et out proposé', d.score === 'Reste 137' && d.outsVisible && d.outlab === 'Out proposé' && d.outs === 'T20 T19 D10', JSON.stringify(d)],
};
const S = (name, value, avg = null) => ({ name, color: '#f00', value, avg });
const base = { status: 'playing', game: 'g1', round: 6, current: 0, darts: ['S20', 'T19'], checkout: [], last: null, winner: null };
const boards = {
  cricket: { ...base, title: 'Cricket', sides: [S('Ju', 86), S('Pierre', 40), S('Jacques', 57), S('Manon', 15)],
    view: { kind: 'cricket', targets: ['20','19','18','17','16','15','Bull'], marks: [[3,3,2,3,1,0,1],[3,1,3,0,2,0,0],[3,2,1,3,0,1,0],[3,0,0,2,3,0,0]], points: [86,40,57,15] } },
  clock: { ...base, title: 'Horloge · 1 → 20', darts: ['S12','—'].slice(0,1), sides: [S('Ju', 13), S('Pierre', 9), S('Jacques', 17), S('Manon', 4), S('Luca', 11)],
    view: { kind: 'clock', steps: [...Array.from({length:20},(_,i)=>String(i+1)), 'Bull'], progress: [13, 8, 16, 3, 10], darts: [39, 24, 45, 15, 30] } },
  targets: { ...base, title: 'Chiffre aléatoire', sides: [S('Ju', 189), S('Pierre', 142), S('Jacques', 201), S('Manon', 96), S('Luca', 160)],
    view: { kind: 'targets', targets: ['6','11','3','20','17','Bull','9','14','1','8'], index: 4 } },
  halveit: { ...base, title: 'Halve-it', darts: [], sides: [S('Ju', 120), S('Pierre', 64)],
    view: { kind: 'targets', targets: ['15','16','D7','17','18','T10','19','20','Bull'], index: 2 } },
  killer: { ...base, title: 'Killer', darts: ['D7','S3'], sides: ['Ju','Pierre','Jacques','Manon','Luca','Sophie'].map((n) => S(n, 0)),
    view: { kind: 'killer', numbers: ['16','7','11','3','19','Bull'], lives: [3,2,1,0,3,2], maxLives: 3, killer: [true,true,false,true,false,true], out: [false,false,false,true,false,false] } },
  plain: { ...base, title: 'High score', sides: [S('Ju', 312), S('Pierre', 280), S('Jacques', 199)], view: null },
  training: { ...base, title: 'Entraînement', sides: [S('Ju', 412, 51.5)], view: { kind: 'training', darts: ['T20', 'S5', 'S1'], total: 66 } },
  x01: { ...base, title: '501 · Double out', checkout: ['T20','T19','D10'], sides: [S('Ju', 137, 62.4), S('Pierre', 241, 51)], view: null },
};
(async () => {
  const browser = await chromium.launch();
  const errors = [];
  for (const [name, board] of Object.entries(boards)) {
    const ctx = await browser.newContext({ viewport: { width: 1024, height: 768 } });
    const p = await ctx.newPage();
    p.on('pageerror', (e) => errors.push(name + ': ' + e.message));
    await p.addInitScript(() => { localStorage.setItem('trem-tableau-secret', 's'); window.WebSocket = undefined; });
    await p.route('**/*', (r) => {
      const u = new URL(r.request().url());
      if (u.pathname === '/tableau.html') return r.fulfill({ contentType: 'text/html', body: html });
      if (u.pathname === '/api/display') return r.fulfill({ contentType: 'application/json', body: JSON.stringify({ paired: true, settings: { dim: true, animations: true, reload: 0 }, game: 'ABC' }) });
      if (u.pathname === '/api/display/board') return r.fulfill({ contentType: 'application/json', body: JSON.stringify({ board }) });
      return r.abort();
    });
    await p.goto('http://tab.local/tableau.html');
    await p.waitForFunction(() => document.getElementById('main').className.indexOf(' on') >= 0, null, { timeout: 8000 });
    await p.waitForTimeout(300);
    await p.screenshot({ path: path.join(out, `${name}.png`) });
    const d = await p.evaluate(() => {
      const q = (s) => document.querySelectorAll(s);
      const marks = {};
      [].forEach.call(q('.mk'), (m) => { const k = m.className.slice(-1); marks[k] = (marks[k] || 0) + 1; });
      const label = (el) => (el ? el.getAttribute('aria-label') : null);
      const tg = document.querySelector('.tg.cur');
      const cur = document.querySelector('#ring .dot.cur');
      return {
        marks: Object.keys(marks).sort().map((k) => k + ':' + marks[k]).join(' '),
        target: label(document.querySelector('#mid .digits')),
        ringCur: cur ? cur.textContent : null,
        ringDone: q('#ring .dot.done').length,
        tgCur: tg ? tg.textContent : null,
        round: document.getElementById('round').textContent,
        cards: q('.card').length,
        gone: q('.card.gone').length,
        score: label(document.getElementById('score')),
        others: q('#others .oth').length,
        outsVisible: document.getElementById('outz').offsetWidth > 0,
        outlab: document.getElementById('outlab').textContent,
        outs: [].map.call(q('#outs .out'), (o) => o.textContent).join(' '),
      };
    });
    const [id, ok, detail] = expectations[name](d);
    check(id, ok, ok ? '' : detail);
    await ctx.close();
  }
  check('aucune erreur JavaScript', errors.length === 0, errors.join(' / '));
  await browser.close();
  console.log(failed ? `${failed} contrôle(s) en échec` : 'Recette vues par jeu : tout est OK');
  process.exit(failed ? 1 : 0);
})();
