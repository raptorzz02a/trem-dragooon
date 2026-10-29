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

for (const effect of ['strobe', 'wave', 'red']) check(`effet ${effect} défini`, flowFor({ effect })?.length > 0);
check('victoire : 10 flashs', flowFor({ effect: 'victory', color: '#3DA5FF' }).filter((s) => s.endsWith(',1')).length === 10);
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

const state = await (await fetch(`${base}/etat`, { headers: { Origin: ORIGIN } })).json();
check('état du pont', state.ok === true);

bulb.close();
server.close();
fake.close();
console.log(failures ? `${failures} échec(s)` : 'Recette ampoule : tout est ok');
process.exit(failures ? 1 : 0);
