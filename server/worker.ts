import { DurableObject } from 'cloudflare:workers';
import { isValidCode, normalizeCode, randomCode, type ClientMessage, type ServerMessage } from '../src/online/protocol';
import { cleanSetup } from '../src/game-setup/setup';
import { addLocalPlayer, applyMessage, archiveChange, createRoom, joinRoom, liveSummary, roomView, setConnected, type Room } from '../src/online/room';
import { PUBLIC_SALOON_ID } from '../src/online/saloons';
import { AccountsObject, type AccountsEnv } from './accounts';

export { AccountsObject };

// Serveur de salons en ligne : un Durable Object par code de partie.
// Il garde l'état du salon, arbitre chaque action avec le moteur de l'appli et la renvoie à tous les joueurs.

interface Env extends AccountsEnv {
  ROOMS: DurableObjectNamespace<RoomObject>;
  ACCOUNTS: DurableObjectNamespace<AccountsObject>;
  ASSETS: Fetcher;
}

/** La base des comptes : une seule instance pour tout le monde. */
const accounts = (env: Env) => env.ACCOUNTS.get(env.ACCOUNTS.idFromName('accounts'));

const bearer = (request: Request) => request.headers.get('Authorization')?.replace(/^Bearer /, '') ?? '';

/** Corps JSON d'une requête, limité en taille. */
async function body(request: Request, max = 8192): Promise<Record<string, unknown>> {
  const text = await request.text();
  if (text.length > max) throw new Error('Requête trop longue.');
  const data = JSON.parse(text || '{}');
  return data && typeof data === 'object' ? data : {};
}

/** Routes des comptes : création, connexion, profil, joueurs et parties en ligne. */
async function accountRoute(request: Request, env: Env, path: string): Promise<Response | null> {
  const db = accounts(env);
  const method = request.method;
  try {
    if (path === '/api/account/signup' && method === 'POST') {
      const b = await body(request);
      return json(await db.signup(String(b.name ?? ''), String(b.password ?? ''), b.color, b.avatar));
    }
    if (path === '/api/account/login' && method === 'POST') {
      const b = await body(request);
      return json(await db.login(String(b.name ?? ''), String(b.password ?? '')));
    }
    if (path === '/api/account/logout' && method === 'POST') {
      await db.logout(bearer(request));
      return json({ ok: true });
    }
    if (path === '/api/account' && method === 'GET') {
      const opened = await db.open(bearer(request));
      return opened ? json(opened) : json({ error: 'Session expirée : reconnecte-toi.' }, 401);
    }
    if (path === '/api/account' && method === 'PUT') {
      const b = await body(request);
      return json({ account: await db.update(bearer(request), b.name, b.color, b.avatar) });
    }
    if (path === '/api/account/password' && method === 'POST') {
      const b = await body(request);
      return json({ token: await db.changePassword(bearer(request), b.current, b.next) });
    }
    if (path === '/api/admin/accounts' && method === 'GET') return json({ accounts: await db.adminList(bearer(request)) });
    const admin = /^\/api\/admin\/accounts\/([^/]+)(\/[a-z-]+)?$/.exec(path);
    if (admin && method === 'POST') {
      const id = decodeURIComponent(admin[1]!);
      if (admin[2] === '/reset-stats') return json({ games: await db.adminResetStats(bearer(request), id) });
      if (admin[2] === '/reset-password') return json({ password: await db.adminResetPassword(bearer(request), id) });
    }
    if (admin && !admin[2] && method === 'DELETE') {
      await db.adminDelete(bearer(request), decodeURIComponent(admin[1]!));
      return json({ ok: true });
    }
    if (path === '/api/account/import' && method === 'POST') {
      // Parties de la borne : jusqu'à IMPORT_BATCH parties complètes par envoi.
      const b = await body(request, 4_000_000);
      return json({ imported: await db.importGames(bearer(request), b.localId, b.games) });
    }
    if (path === '/api/community' && method === 'GET') return json(await db.community());
    if (path === '/api/saloons' && method === 'GET') return json({ saloons: await db.saloons(bearer(request)) });
    if (path === '/api/saloons' && method === 'POST') {
      const b = await body(request);
      return json({ saloon: await db.createSaloon(bearer(request), b.name, b.password, b.color, b.icon) });
    }
    if (path === '/api/saloons/join' && method === 'POST') {
      const b = await body(request);
      const saloon = b.invite !== undefined ? await db.joinByInvite(bearer(request), b.invite) : await db.joinSaloon(bearer(request), b.name, b.password);
      return json({ saloon });
    }
    const one = /^\/api\/saloons\/([^/]+)$/.exec(path);
    if (one && one[1] !== 'join') {
      const id = decodeURIComponent(one[1]!);
      if (method === 'PUT') {
        const b = await body(request);
        await db.updateSaloon(bearer(request), id, b.name, b.password, b.color, b.icon);
        return json({ ok: true });
      }
      if (method === 'DELETE') {
        const b = await body(request);
        await db.deleteSaloon(bearer(request), id, b.confirm);
        return json({ ok: true });
      }
    }
    const members = /^\/api\/saloons\/([^/]+)\/members(?:\/([^/]+)\/([a-z]+))?$/.exec(path);
    if (members && !members[2] && method === 'GET') return json(await db.saloonMembers(bearer(request), decodeURIComponent(members[1]!)));
    if (members && members[2] && method === 'POST') {
      await db.manageMember(bearer(request), decodeURIComponent(members[1]!), decodeURIComponent(members[2]), members[3]);
      return json({ ok: true });
    }
    const games = /^\/api\/saloons\/([^/]+)\/(games|defaults)$/.exec(path);
    if (games?.[2] === 'games' && method === 'GET') return json({ games: await db.saloonGames(bearer(request), decodeURIComponent(games[1]!)) });
    if (games?.[2] === 'defaults' && method === 'PUT') {
      const b = await body(request);
      await db.setSaloonDefaults(bearer(request), decodeURIComponent(games[1]!), cleanSetup(b.setup));
      return json({ ok: true });
    }
    if (path === '/api/admin/saloons' && method === 'GET') return json({ saloons: await db.adminSaloons(bearer(request)) });
    const saloon = /^\/api\/saloons\/([^/]+)\/(leave|invite)$/.exec(path);
    if (saloon && method === 'POST') {
      const id = decodeURIComponent(saloon[1]!);
      if (saloon[2] === 'leave') {
        await db.leaveSaloon(bearer(request), id);
        return json({ ok: true });
      }
      return json({ saloon: await db.renewInvite(bearer(request), id) });
    }
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'Requête refusée.' }, 400);
  }
  return null;
}

/** Un salon sans activité est effacé au bout de ce délai (le code redevient libre). */
const ROOM_TTL_MS = 12 * 60 * 60 * 1000;
/** Taille maximale d'un message reçu : bien au-dessus de tout message légitime. */
const MAX_MESSAGE_BYTES = 4096;

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } });

/**
 * La borne peut servir l'appli elle-même (http://localhost:4173) en appelant ce serveur : c'est ce qui lui permet
 * de lire ses anciennes stats, rangées par le navigateur sous cette adresse, pour les reprendre en ligne.
 */
const LOCAL_ORIGINS = new Set(['http://localhost:4173', 'http://127.0.0.1:4173']);

function cors(request: Request, response: Response): Response {
  const origin = request.headers.get('Origin');
  if (!origin || !LOCAL_ORIGINS.has(origin) || response.status === 101) return response;
  const out = new Response(response.body, response);
  out.headers.set('Access-Control-Allow-Origin', origin);
  out.headers.set('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  out.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  out.headers.set('Vary', 'Origin');
  return out;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') return cors(request, new Response(null, { status: 204 }));
    return cors(request, await route(request, env));
  },
} satisfies ExportedHandler<Env>;

async function route(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);

  if (url.pathname === '/api/rooms' && request.method === 'POST') {
    // Le salon naît avec le jeu et le lieu choisis à l'accueil ; l'hôte peut tout changer ensuite.
    const b = await body(request).catch(() => ({}) as Record<string, unknown>);
    const place = b.place === 'same' ? 'same' : 'remote';
    // Une partie se joue dans un saloon dont le créateur est membre ; sans saloon précisé, dans le saloon public.
    const saloonId = typeof b.saloonId === 'string' && b.saloonId ? b.saloonId : PUBLIC_SALOON_ID;
    const db = accounts(env);
    if (!(await db.inSaloon(bearer(request), saloonId))) return json({ error: 'Tu n’es pas membre de ce saloon.' }, 403);
    // Le mode vient de l'accueil ; les options, des réglages par défaut du saloon s'il en a.
    const asked = cleanSetup(b.setup);
    const defaults = await db.saloonDefaults(saloonId);
    const setup = defaults ? cleanSetup({ ...(defaults as object), mode: asked.mode }) : asked;
    // Quelques essais au cas où le code tiré serait déjà pris par un salon actif.
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = randomCode(() => crypto.getRandomValues(new Uint32Array(1))[0]! / 2 ** 32);
      const stub = env.ROOMS.get(env.ROOMS.idFromName(code));
      if (await stub.init(code, place, setup, saloonId)) return json({ code });
    }
    return json({ error: 'Impossible de créer la partie, réessaie.' }, 503);
  }

  // Regarder une partie du saloon depuis la liste « Parties en cours », sans en connaître le code.
  const watch = /^\/api\/saloons\/([^/]+)\/games\/([^/]+)\/ws$/.exec(url.pathname);
  if (watch) {
    if (request.headers.get('Upgrade') !== 'websocket') return json({ error: 'WebSocket attendu.' }, 426);
    const code = await accounts(env).watchCode(url.searchParams.get('token') ?? '', decodeURIComponent(watch[1]!), decodeURIComponent(watch[2]!));
    if (!code) return json({ error: 'Partie introuvable.' }, 404);
    return env.ROOMS.get(env.ROOMS.idFromName(code)).fetch(new Request(`https://partie/${code}?watch=1`, request));
  }

  const ws = /^\/api\/rooms\/([^/]+)\/ws$/.exec(url.pathname);
  if (ws) {
    const code = normalizeCode(ws[1]!);
    if (!isValidCode(code)) return json({ error: 'Code invalide.' }, 400);
    if (request.headers.get('Upgrade') !== 'websocket') return json({ error: 'WebSocket attendu.' }, 426);
    return env.ROOMS.get(env.ROOMS.idFromName(code)).fetch(request);
  }

  const answered = url.pathname.startsWith('/api/') ? await accountRoute(request, env, url.pathname) : null;
  if (answered) return answered;

  if (url.pathname.startsWith('/api/')) return json({ error: 'Introuvable.' }, 404);
  return env.ASSETS.fetch(request);
}

interface Attachment {
  playerId: string | null;
  /** Spectateur venu de la liste « Parties en cours » : il reçoit la partie, sans rien pouvoir y faire. */
  watcher?: boolean;
}

export class RoomObject extends DurableObject<Env> {
  /** Crée le salon ; false si ce code est déjà utilisé. */
  async init(code: string, place: Room['place'], setup: Room['setup'], saloonId: string): Promise<boolean> {
    if (await this.load()) return false;
    // Clé de la partie dans la liste « Parties en cours » : elle permet de la regarder, pas d'y jouer.
    await this.ctx.storage.put('watchKey', crypto.randomUUID().replace(/-/g, ''));
    await this.commit(createRoom(code, place, setup, saloonId));
    return true;
  }

  async fetch(request: Request): Promise<Response> {
    const pair = new WebSocketPair();
    const [client, server] = [pair[0], pair[1]];
    const watcher = new URL(request.url).searchParams.get('watch') === '1';
    // Mode « hibernation » : la partie ne consomme rien entre deux fléchettes.
    this.ctx.acceptWebSocket(server);
    server.serializeAttachment({ playerId: null, watcher } satisfies Attachment);
    const room = await this.load();
    if (!room) {
      this.send(server, { type: 'error', message: 'Aucune partie avec ce code. Vérifie le code ou demande-le à l’hôte.' });
      server.close(4404, 'Partie inconnue');
    } else if (watcher) {
      // Un spectateur de plus : tout le monde voit le compteur changer.
      await this.publish(room);
    }
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(socket: WebSocket, data: string | ArrayBuffer): Promise<void> {
    const room = await this.load();
    if (!room) return void socket.close(4404, 'Partie inconnue');
    const text = typeof data === 'string' ? data : new TextDecoder().decode(data);
    if (text.length > MAX_MESSAGE_BYTES) return void socket.close(1009, 'Message trop long');

    const { playerId, watcher } = socket.deserializeAttachment() as Attachment;
    try {
      if (watcher) throw new Error('Tu regardes la partie : pour jouer, rejoins-la avec son code.');
      const message = JSON.parse(text) as ClientMessage;
      if (message.type === 'hello') {
        if (playerId) throw new Error('Déjà connecté.');
        const db = accounts(this.env);
        const account = await db.me(String(message.account ?? ''));
        if (!account) throw new Error('Connecte-toi à ton compte pour jouer en ligne.');
        // Seuls les membres du saloon jouent ses parties (un joueur déjà dans la partie la retrouve toujours).
        if (room.saloonId && !room.players.some((p) => p.id === account.id) && !(await db.isMember(account.id, room.saloonId))) {
          throw new Error('Cette partie se joue dans un saloon dont tu n’es pas membre.');
        }
        const identity = { name: account.name, color: account.color, avatar: account.avatar };
        const joined = joinRoom(room, message.token, identity, () => crypto.randomUUID(), account.id);
        socket.serializeAttachment({ playerId: joined.player.id } satisfies Attachment);
        this.send(socket, { type: 'welcome', playerId: joined.player.id, token: joined.player.token });
        await this.commit(joined.room);
        return;
      }
      if (!playerId) throw new Error('Présente-toi d’abord.');
      if (message.type === 'addPlayer' || message.type === 'createPlayer') {
        if (room.hostId !== playerId) throw new Error('Seul l’hôte peut ajouter un joueur.');
        const db = accounts(this.env);
        const name = String(message.name ?? '');
        const password = String(message.password ?? '');
        const account =
          message.type === 'addPlayer'
            ? await db.check(name, password)
            : (await db.signup(name, password, message.color, message.avatar)).account;
        if (room.saloonId) {
          // Un nouveau compte créé ici entre dans le saloon ; un compte existant doit déjà en être membre.
          if (message.type === 'createPlayer') await db.addFromGame(account.id, room.saloonId);
          else if (!(await db.isMember(account.id, room.saloonId))) throw new Error(`${account.name} n’est pas membre de ce saloon.`);
        }
        // Le salon a pu changer pendant la vérification du mot de passe.
        const latest = (await this.load()) ?? room;
        await this.commit(addLocalPlayer(latest, playerId, account, () => crypto.randomUUID()));
        return;
      }
      const next = applyMessage(room, playerId, message);
      await this.commit(next);
      await this.archive(room, next);
      if (message.type === 'leave') {
        socket.serializeAttachment({ playerId: null } satisfies Attachment);
        socket.close(1000, 'Parti');
      }
    } catch (e) {
      this.send(socket, { type: 'error', message: e instanceof Error ? e.message : 'Action refusée.' });
    }
  }

  async webSocketClose(socket: WebSocket): Promise<void> {
    await this.disconnected(socket);
  }

  async webSocketError(socket: WebSocket): Promise<void> {
    await this.disconnected(socket);
  }

  async alarm(): Promise<void> {
    const last = (await this.ctx.storage.get<number>('touched')) ?? 0;
    if (Date.now() - last >= ROOM_TTL_MS) {
      const room = await this.load();
      for (const s of this.ctx.getWebSockets()) s.close(4410, 'Partie expirée');
      if (room) await this.report(room, true);
      await this.ctx.storage.deleteAll();
    } else {
      await this.ctx.storage.setAlarm(last + ROOM_TTL_MS);
    }
  }

  private async disconnected(socket: WebSocket): Promise<void> {
    const { playerId, watcher } = (socket.deserializeAttachment() ?? { playerId: null }) as Attachment;
    if (watcher) {
      socket.serializeAttachment({ playerId: null } satisfies Attachment);
      const room = await this.load();
      if (room) await this.publish(room);
      return;
    }
    const room = playerId ? await this.load() : null;
    if (!room || !playerId) return;
    // Le même joueur peut avoir rouvert l'appli : il n'est absent que si plus aucune connexion n'est à lui.
    const stillHere = this.ctx
      .getWebSockets()
      .some((s) => s !== socket && (s.deserializeAttachment() as Attachment | null)?.playerId === playerId);
    if (!stillHere) await this.commit(setConnected(room, playerId, false));
  }

  /** Les parties en ligne terminées vont dans la base des comptes, pour les statistiques. */
  private async archive(before: Room, next: Room): Promise<void> {
    const change = archiveChange(before, next);
    if (!change) return;
    const db = accounts(this.env);
    try {
      if ('record' in change) await db.recordGame(change.record);
      else await db.forgetGame(change.forget);
    } catch (e) {
      console.error('Enregistrement de la partie impossible', e);
    }
  }

  private async load(): Promise<Room | null> {
    return (await this.ctx.storage.get<Room>('room')) ?? null;
  }

  private async save(room: Room): Promise<void> {
    const now = Date.now();
    await this.ctx.storage.put({ room, touched: now });
    await this.ctx.storage.setAlarm(now + ROOM_TTL_MS);
  }

  /** Enregistre la partie et envoie son nouvel état à tous les joueurs et spectateurs connectés. */
  private async commit(room: Room): Promise<void> {
    await this.save(room);
    await this.publish(room);
  }

  private async publish(room: Room): Promise<void> {
    const sockets = this.ctx.getWebSockets().map((s) => ({ s, a: s.deserializeAttachment() as Attachment | null }));
    const watchers = sockets.filter(({ a }) => a?.watcher).length;
    const message: ServerMessage = { type: 'room', room: roomView(room, watchers) };
    for (const { s, a } of sockets) if (a?.playerId || a?.watcher) this.send(s, message);
    await this.report(room);
  }

  /** Dernier résumé envoyé à la liste « Parties en cours » (en mémoire : au pire, renvoyé une fois de trop). */
  private reported: string | undefined;

  /** Tient à jour la liste « Parties en cours » du saloon, seulement quand ce qu'elle montre change. */
  private async report(room: Room, gone = false): Promise<void> {
    const watchers = this.ctx.getWebSockets().filter((s) => (s.deserializeAttachment() as Attachment | null)?.watcher).length;
    const summary = gone ? null : liveSummary(room, watchers);
    const text = JSON.stringify(summary);
    if (text === this.reported) return;
    const watchKey = (await this.ctx.storage.get<string>('watchKey')) ?? '';
    try {
      await accounts(this.env).reportRoom(room.code, room.saloonId ?? PUBLIC_SALOON_ID, watchKey, summary);
      this.reported = text;
    } catch (e) {
      console.error('Liste des parties en cours non mise à jour', e);
    }
  }

  private send(socket: WebSocket, message: ServerMessage): void {
    try {
      socket.send(JSON.stringify(message));
    } catch {
      // Connexion déjà fermée : le joueur recevra l'état complet à sa reconnexion.
    }
  }
}
