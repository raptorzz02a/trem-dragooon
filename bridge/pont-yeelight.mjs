// Pont local entre l'appli TREM-DRAGOOON et une ampoule Yeelight (testé pour la Color 1S).
// À lancer sur le PC de la borne : node bridge/pont-yeelight.mjs [--ip 192.168.1.42] [--port 55444]
// L'appli envoie POST http://127.0.0.1:55444/effet {"effect": "strobe" | "wave" | "red" | "victory", "color": "#RRGGBB"}
// et le pont joue l'effet en « contrôle LAN » (TCP 55443), puis remet l'ampoule comme elle était.
// Aucune dépendance : Node 18 ou plus suffit.

import dgram from 'node:dgram';
import fs from 'node:fs';
import http from 'node:http';
import net from 'node:net';
import os from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';

const DEFAULT_PORT = 55444;
const BULB_PORT = 55443;
const DEFAULT_ORIGINS = ['https://trem-dragooon.julien-charrier01.workers.dev'];

// ---------------------------------------------------------------------------
// Effets : suites d'états « durée,mode,valeur,luminosité » du start_cf Yeelight.
// mode 1 = couleur RVB, 7 = pause. Durée minimale 50 ms.

const rgb = (hex) => parseInt(hex.replace('#', ''), 16);
const step = (ms, color, bright) => `${ms},1,${rgb(color)},${bright}`;
const pause = (ms) => `${ms},7,0,0`;

const STROBE_COLORS = ['#FF0000', '#0000FF', '#00FF00', '#FFFF00', '#FF00FF', '#00FFFF'];
const WAVE_COLORS = ['#00BFFF', '#8A2BE2', '#FF1493', '#FFA500', '#00FF7F', '#00BFFF'];

/** Liste des états de l'effet, ou null si l'effet est inconnu. */
export function flowFor(request) {
  switch (request?.effect) {
    case 'strobe':
      // Deux tours de six couleurs, chacune allumée puis presque éteinte : environ 2 s.
      return [...STROBE_COLORS, ...STROBE_COLORS].flatMap((c) => [step(50, c, 100), step(50, c, 1), pause(60)]);
    case 'wave':
      return WAVE_COLORS.map((c) => step(400, c, 100));
    case 'red':
      return [step(50, '#FF0000', 100), pause(1000)];
    case 'victory': {
      const color = /^#[0-9a-f]{6}$/i.test(request.color ?? '') ? request.color : '#FFD24D';
      const flashes = Array.from({ length: 10 }, () => [step(150, color, 100), pause(100), step(150, color, 1), pause(100)]);
      return [...flashes.flat(), step(200, color, 100), pause(4000)];
    }
    default:
      return null;
  }
}

/** Durée totale de l'effet, en millisecondes. */
export function flowDuration(flow) {
  return flow.reduce((ms, s) => ms + Number(s.split(',')[0]), 0);
}

// ---------------------------------------------------------------------------
// Ampoule : une connexion TCP gardée ouverte, une commande JSON par ligne.

export class Bulb {
  constructor(host, port = BULB_PORT) {
    this.host = host;
    this.port = port;
    this.socket = null;
    this.nextId = 1;
    this.pending = new Map();
    this.buffer = '';
  }

  connect() {
    if (this.socket) return this.socket;
    const socket = net.createConnection({ host: this.host, port: this.port });
    socket.setEncoding('utf8');
    socket.setKeepAlive(true, 10_000);
    socket.on('data', (chunk) => {
      this.buffer += chunk;
      let end;
      while ((end = this.buffer.indexOf('\n')) >= 0) {
        const line = this.buffer.slice(0, end).trim();
        this.buffer = this.buffer.slice(end + 1);
        if (!line) continue;
        let msg;
        try {
          msg = JSON.parse(line);
        } catch {
          continue;
        }
        // Les notifications « props » de l'ampoule n'ont pas d'id : ignorées.
        const wait = this.pending.get(msg.id);
        if (!wait) continue;
        this.pending.delete(msg.id);
        if (msg.error) wait.reject(new Error(msg.error.message ?? 'erreur ampoule'));
        else wait.resolve(msg.result);
      }
    });
    const drop = (err) => {
      if (this.socket !== socket) return;
      this.socket = null;
      this.buffer = '';
      for (const wait of this.pending.values()) wait.reject(err ?? new Error('connexion fermée'));
      this.pending.clear();
    };
    socket.on('error', drop);
    socket.on('close', () => drop());
    this.socket = socket;
    return socket;
  }

  send(method, params) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`pas de réponse à ${method}`));
        this.socket?.destroy();
      }, 3000);
      this.pending.set(id, {
        resolve: (v) => (clearTimeout(timer), resolve(v)),
        reject: (e) => (clearTimeout(timer), reject(e)),
      });
      this.connect().write(JSON.stringify({ id, method, params }) + '\r\n');
    });
  }

  close() {
    this.socket?.destroy();
    this.socket = null;
  }
}

/** Adresses IPv4 de ce PC sur le réseau local (cartes virtuelles comprises). */
function localAddresses() {
  return Object.values(os.networkInterfaces())
    .flat()
    .filter((a) => a && a.family === 'IPv4' && !a.internal)
    .map((a) => a.address);
}

/**
 * Cherche une ampoule Yeelight par SSDP (port 1982), en interrogeant depuis chaque carte réseau :
 * sous Windows, une carte virtuelle (VPN, Hyper-V, WSL) peut sinon capter la requête.
 */
function discoverSsdp(timeoutMs) {
  const search = 'M-SEARCH * HTTP/1.1\r\nHOST: 239.255.255.250:1982\r\nMAN: "ssdp:discover"\r\nST: wifi_bulb\r\n\r\n';
  return new Promise((resolve) => {
    const sockets = [];
    const done = (ip) => {
      clearTimeout(timer);
      for (const socket of sockets) {
        try {
          socket.close();
        } catch {
          // déjà fermée
        }
      }
      resolve(ip);
    };
    const timer = setTimeout(() => done(null), timeoutMs);
    for (const address of localAddresses()) {
      const socket = dgram.createSocket({ type: 'udp4', reuseAddr: true });
      sockets.push(socket);
      socket.on('message', (msg) => {
        const match = /Location:\s*yeelight:\/\/([\d.]+):\d+/i.exec(msg.toString());
        if (match) done(match[1]);
      });
      socket.on('error', () => {});
      socket.bind(0, address, () => {
        try {
          socket.setMulticastInterface(address);
          socket.send(search, 1982, '239.255.255.250');
        } catch {
          // carte sans multicast
        }
      });
    }
  });
}

/** Le port de contrôle Yeelight répond-il à cette adresse ? */
export function probe(ip, port = BULB_PORT, timeoutMs = 600) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host: ip, port });
    const done = (ok) => {
      socket.destroy();
      resolve(ok);
    };
    socket.setTimeout(timeoutMs, () => done(false));
    socket.on('connect', () => done(true));
    socket.on('error', () => done(false));
  });
}

/**
 * Plan B quand le pare-feu bloque les réponses SSDP : essaie le port 55443 sur tout le réseau
 * local (adresses x.y.z.1 à 254 de chaque carte). Seules des connexions sortantes, que Windows laisse passer.
 */
async function discoverScan() {
  const candidates = [];
  for (const address of localAddresses()) {
    const prefix = address.split('.').slice(0, 3).join('.');
    for (let i = 1; i < 255; i++) {
      const ip = `${prefix}.${i}`;
      if (ip !== address && !candidates.includes(ip)) candidates.push(ip);
    }
  }
  let found = null;
  let next = 0;
  const worker = async () => {
    while (!found && next < candidates.length) {
      const ip = candidates[next++];
      if (await probe(ip)) found ??= ip;
    }
  };
  await Promise.all(Array.from({ length: 64 }, worker));
  return found;
}

const LAST_IP_FILE = fileURLToPath(new URL('./.ampoule-ip', import.meta.url));

/** Trouve l'ampoule : dernière adresse connue, puis SSDP, puis balayage du réseau local. Résout son IP ou null. */
export async function discover(timeoutMs = 3000) {
  let last = null;
  try {
    last = fs.readFileSync(LAST_IP_FILE, 'utf8').trim();
  } catch {
    // premier lancement
  }
  const ip = (last && (await probe(last)) ? last : null) ?? (await discoverSsdp(timeoutMs)) ?? (await discoverScan());
  if (ip && ip !== last) {
    try {
      fs.writeFileSync(LAST_IP_FILE, ip);
    } catch {
      // adresse non mémorisée, on cherchera de nouveau au prochain lancement
    }
  }
  return ip;
}

// ---------------------------------------------------------------------------
// Lecteur d'effets : note l'état de l'ampoule avant le premier effet, enchaîne les effets
// (un nouvel effet remplace celui en cours) et remet l'état d'origine à la fin du dernier.

export class Player {
  constructor(bulb, log = () => {}) {
    this.bulb = bulb;
    this.log = log;
    this.saved = null;
    this.restoreTimer = null;
    this.queue = Promise.resolve();
  }

  play(request) {
    const flow = flowFor(request);
    if (!flow) return false;
    this.queue = this.queue.then(() => this.run(flow, request.effect)).catch((e) => this.log(`Ampoule : ${e.message}`));
    return true;
  }

  async run(flow, name) {
    if (!this.saved) {
      const [power, bright, mode, color, ct, hue, sat] = await this.bulb.send('get_prop', [
        'power', 'bright', 'color_mode', 'rgb', 'ct', 'hue', 'sat',
      ]);
      this.saved = { power, bright: Number(bright), mode: Number(mode), rgb: Number(color), ct: Number(ct), hue: Number(hue), sat: Number(sat) };
    }
    clearTimeout(this.restoreTimer);
    // set_scene « cf » allume l'ampoule si elle est éteinte, contrairement à start_cf.
    await this.bulb.send('set_scene', ['cf', flow.length, 1, flow.join(',')]);
    this.log(`Effet ${name}`);
    this.restoreTimer = setTimeout(() => {
      this.queue = this.queue.then(() => this.restore()).catch((e) => this.log(`Ampoule : ${e.message}`));
    }, flowDuration(flow) + 100);
  }

  async restore() {
    const s = this.saved;
    if (!s) return;
    this.saved = null;
    if (s.power !== 'on') await this.bulb.send('set_power', ['off', 'smooth', 300]);
    else if (s.mode === 2) await this.bulb.send('set_scene', ['ct', s.ct, s.bright]);
    else if (s.mode === 3) await this.bulb.send('set_scene', ['hsv', s.hue, s.sat, s.bright]);
    else await this.bulb.send('set_scene', ['color', s.rgb, s.bright]);
  }
}

// ---------------------------------------------------------------------------
// Serveur HTTP local, joignable seulement depuis ce PC (127.0.0.1).

export function createServer({ player, origins = DEFAULT_ORIGINS, status = () => ({}) }) {
  const allowed = (origin) => !origin || origins.includes(origin) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
  return http.createServer((req, res) => {
    const origin = req.headers.origin;
    if (!allowed(origin)) {
      res.writeHead(403).end();
      return;
    }
    const headers = {
      'Access-Control-Allow-Origin': origin ?? '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      // Chrome / Edge : autorise une page en ligne à joindre ce PC.
      'Access-Control-Allow-Private-Network': 'true',
      Vary: 'Origin',
    };
    if (req.method === 'OPTIONS') {
      res.writeHead(204, headers).end();
      return;
    }
    if (req.method === 'GET' && req.url === '/etat') {
      res.writeHead(200, { ...headers, 'Content-Type': 'application/json' }).end(JSON.stringify({ ok: true, ...status() }));
      return;
    }
    if (req.method === 'POST' && req.url === '/effet') {
      let body = '';
      req.on('data', (c) => {
        body += c;
        if (body.length > 1000) req.destroy();
      });
      req.on('end', () => {
        let request = null;
        try {
          request = JSON.parse(body);
        } catch {
          // corps illisible
        }
        const ok = player.play(request);
        res.writeHead(ok ? 202 : 400, headers).end();
      });
      return;
    }
    res.writeHead(404, headers).end();
  });
}

function argValue(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const port = Number(argValue('port') ?? process.env.PONT_PORT ?? DEFAULT_PORT);
  const extraOrigin = argValue('origine');
  let ip = argValue('ip') ?? process.env.YEELIGHT_IP;
  while (!ip) {
    console.log('Recherche de l’ampoule Yeelight sur le réseau…');
    ip = await discover();
    if (!ip) {
      console.log('Aucune ampoule trouvée. Vérifie le « Contrôle LAN » dans l’appli Yeelight, ou donne son adresse : --ip 192.168.x.y. Nouvel essai dans 10 s.');
      await new Promise((r) => setTimeout(r, 10_000));
    }
  }
  const bulbPort = Number(argValue('port-ampoule') ?? BULB_PORT);
  const bulb = new Bulb(ip, bulbPort);
  const player = new Player(bulb, (line) => console.log(`${new Date().toLocaleTimeString()} ${line}`));
  const origins = extraOrigin ? [...DEFAULT_ORIGINS, extraOrigin] : DEFAULT_ORIGINS;
  createServer({ player, origins, status: () => ({ ampoule: ip }) }).listen(port, '127.0.0.1', () => {
    console.log(`Pont prêt : ampoule ${ip}, appli → http://127.0.0.1:${port}`);
  });
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) main();
