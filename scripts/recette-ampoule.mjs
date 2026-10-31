// Recette du pont Yeelight avec une fausse ampoule : node scripts/recette-ampoule.mjs
// Vérifie le chemin complet appli → pont HTTP → commandes TCP, puis la remise en état.

import net from 'node:net';
import { Bulb, createServer, flowDuration, flowFor, Player } from '../bridge/pont-yeelight.mjs';

const ORIGIN = 'https://trem-dragooon.julien-charrier01.workers.dev';
let failures = 0;
const check = (label, ok) => {
  console.log(`${ok ? 'ok ' : 'KO '} ${label}`);
  if (!ok) failures++;
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// Fausse ampoule : allumée en blanc chaud, répond « ok » à tout et envoie des notifications parasites.
const received = [];
let quota = false;
const fake = net.createServer((socket) => {
  socket.setEncoding('utf8');
  let buf = '';
  socket.on('data', (chunk) => {
    buf += chunk;
    let end;
    while ((end = buf.indexOf('\n')) >= 0) {
      const cmd = JSON.parse(buf.slice(0, end));
      buf = buf.slice(end + 1);
      received.push(cmd);
      socket.write(JSON.stringify({ method: 'props', params: { power: 'on' } }) + '\r\n');
      if (quota) {
        socket.write(JSON.stringify({ id: cmd.id, error: { code: -1, message: 'client quota exceeded' } }) + '\r\n');
        continue;
      }
      const result = cmd.method === 'get_prop' ? ['on', '80', '2', '16777215', '2700', '0', '0'] : ['ok'];
      socket.write(JSON.stringify({ id: cmd.id, result }) + '\r\n');
    }
  });
});
await new Promise((r) => fake.listen(0, '127.0.0.1', r));

const bulb = new Bulb('127.0.0.1', fake.address().port);
const player = new Player(bulb);
const server = createServer({ player });
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;
const post = (body, origin = ORIGIN) =>
  fetch(`${base}/effet`, { method: 'POST', headers: { 'Content-Type': 'text/plain', Origin: origin }, body: JSON.stringify(body) });

// La Color 1S ignore sans répondre une suite d'états trop longue : on en garde au plus 8.
for (const effect of ['strobe', 'wave', 'red', 'victory']) {
  const flow = flowFor({ effect, color: '#3DA5FF' });
  check(`effet ${effect} court (${flow?.states.length} états)`, flow?.states.length > 0 && flow.states.length <= 8);
}
const victory = flowFor({ effect: 'victory', color: '#3DA5FF' });
check('victoire : 10 flashs puis couleur tenue', victory.count === 20 && victory.hold?.color === '#3DA5FF');
check('stroboscope : environ 2 s', Math.abs(flowDuration(flowFor({ effect: 'strobe' })) - 1920) < 1);
check('rouge : environ 1 s', Math.abs(flowDuration(flowFor({ effect: 'red' })) - 1050) < 1);

const pre = await fetch(`${base}/effet`, { method: 'OPTIONS', headers: { Origin: ORIGIN } });
check('préflight CORS accepté avec réseau privé', pre.status === 204 && pre.headers.get('access-control-allow-private-network') === 'true');
check('autre site refusé', (await post({ effect: 'red' }, 'https://exemple.com')).status === 403);
check('effet inconnu refusé', (await post({ effect: 'disco' })).status === 400);

check('rouge accepté', (await post({ effect: 'red' })).status === 202);
await wait(200);
check('état noté puis effet lancé', received[0]?.method === 'get_prop' && received[1]?.method === 'set_scene' && received[1].params[0] === 'cf');

// Un double juste après : l'état d'origine n'est pas relu, l'effet remplace le rouge.
check('vague acceptée', (await post({ effect: 'wave' })).status === 202);
await wait(200);
check('enchaînement sans relire l’état', received.length === 3 && received[2].method === 'set_scene');

await wait(flowDuration(flowFor({ effect: 'wave' })) + 400);
const last = received.at(-1);
check('remise en blanc 2700 K à 80 %', received.length === 4 && last.method === 'set_scene' && last.params.join() === 'ct,2700,80');

// Victoire : flashs en boucle courte, couleur tenue, puis remise en état.
const before = received.length;
check('victoire acceptée', (await post({ effect: 'victory', color: '#3DA5FF' })).status === 202);
await wait(flowDuration(victory) + 400);
const held = received.at(-1);
check('couleur du gagnant tenue après les flashs', held.method === 'set_scene' && held.params.join() === `color,${0x3da5ff},100`);
await wait(victory.hold.ms + 300);
check('puis remise en état', received.length === before + 4 && received.at(-1).params.join() === 'ct,2700,80');

// Deux fenêtres de l'appli ouvertes : le même effet arrive deux fois, il n'est joué qu'une fois.
const beforeDouble = received.length;
await post({ effect: 'red' });
await post({ effect: 'red' });
await wait(300);
check('effet en double joué une seule fois', received.length === beforeDouble + 2);
await wait(flowDuration(flowFor({ effect: 'red' })) + 400);

// Plafond de l'ampoule (60 commandes/minute) : au-delà de 50, les effets sont sautés.
bulb.sent = Array.from({ length: 47 }, () => Date.now());
const beforeQuota = received.length;
check('effet accepté près du plafond', (await post({ effect: 'strobe' })).status === 202);
await wait(300);
check('effet sauté près du plafond', received.length === beforeQuota);
bulb.sent = [];

// L'ampoule refuse (« client quota exceeded ») : une minute de pause sans rien lui envoyer.
quota = true;
await post({ effect: 'wave' });
await wait(300);
const afterRefusal = received.length;
quota = false;
await post({ effect: 'strobe' });
await wait(300);
check('après un refus de quota, pause : rien n’est envoyé', received.length === afterRefusal && player.pausedUntil > Date.now());
player.pausedUntil = 0;

const state = await (await fetch(`${base}/etat`, { headers: { Origin: ORIGIN } })).json();
check('état du pont', state.ok === true);

bulb.close();
server.close();
fake.close();
console.log(failures ? `${failures} échec(s)` : 'Recette ampoule : tout est ok');
process.exit(failures ? 1 : 0);
