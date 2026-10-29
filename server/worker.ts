import { DurableObject } from 'cloudflare:workers';
import { isValidCode, normalizeCode, randomCode, type ClientMessage, type ServerMessage } from '../src/online/protocol';
import { cleanSetup } from '../src/game-setup/setup';
import { addLocalPlayer, applyMessage, archiveChange, createRoom, joinRoom, roomView, setConnected, type Room } from '../src/online/room';
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
    const setup = cleanSetup(b.setup);
    // Une partie se joue dans un saloon dont le créateur est membre ; sans saloon précisé, dans le saloon public.
    const saloonId = typeof b.saloonId === 'string' && b.saloonId ? b.saloonId : PUBLIC_SALOON_ID;
    if (!(await accounts(env).inSaloon(bearer(request), saloonId))) return json({ error: 'Tu n’es pas membre de ce saloon.' }, 403);
    // Quelques essais au cas où le code tiré serait déjà pris par un salon actif.
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = randomCode(() => crypto.getRandomValues(new Uint32Array(1))[0]! / 2 ** 32);
      const stub = env.ROOMS.get(env.ROOMS.idFromName(code));
      if (await stub.init(code, place, setup, saloonId)) return json({ code });
    }
    return json({ error: 'Impossible de créer un salon, réessaie.' }, 503);
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
}

export class RoomObject extends DurableObject<Env> {
  /** Crée le salon ; false si ce code est déjà utilisé. */
  async init(code: string, place: Room['place'], setup: Room['setup'], saloonId: string): Promise<boolean> {
    if (await this.load()) return false;
    await this.save(createRoom(code, place, setup, saloonId));
    return true;
  }

  async fetch(): Promise<Response> {
    const pair = new WebSocketPair();
    const [client, server] = [pair[0], pair[1]];
    // Mode « hibernation » : le salon ne consomme rien entre deux fléchettes.
    this.ctx.acceptWebSocket(server);
    server.serializeAttachment({ playerId: null } satisfies Attachment);
    if (!(await this.load())) {
      this.send(server, { type: 'error', message: 'Aucune partie avec ce code. Vérifie le code ou demande-le à l’hôte.' });
      server.close(4404, 'Salon inconnu');
    }
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(socket: WebSocket, data: string | ArrayBuffer): Promise<void> {
    const room = await this.load();
    if (!room) return void socket.close(4404, 'Salon inconnu');
    const text = typeof data === 'string' ? data : new TextDecoder().decode(data);
    if (text.length > MAX_MESSAGE_BYTES) return void socket.close(1009, 'Message trop long');

    const { playerId } = socket.deserializeAttachment() as Attachment;
    try {
      const message = JSON.parse(text) as ClientMessage;
      if (message.type === 'hello') {
        if (playerId) throw new Error('Déjà connecté.');
        const account = await accounts(this.env).me(String(message.account ?? ''));
        if (!account) throw new Error('Connecte-toi à ton compte pour jouer en ligne.');
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
      for (const s of this.ctx.getWebSockets()) s.close(4410, 'Salon expiré');
      await this.ctx.storage.deleteAll();
    } else {
      await this.ctx.storage.setAlarm(last + ROOM_TTL_MS);
    }
  }

  private async disconnected(socket: WebSocket): Promise<void> {
    const { playerId } = (socket.deserializeAttachment() ?? { playerId: null }) as Attachment;
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

  /** Enregistre le salon et envoie son nouvel état à tous les joueurs connectés. */
  private async commit(room: Room): Promise<void> {
    await this.save(room);
    const message: ServerMessage = { type: 'room', room: roomView(room) };
    for (const s of this.ctx.getWebSockets()) {
      if ((s.deserializeAttachment() as Attachment | null)?.playerId) this.send(s, message);
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
