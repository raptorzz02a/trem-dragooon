import { DurableObject } from 'cloudflare:workers';
import { isValidCode, normalizeCode, randomCode, type ClientMessage, type ServerMessage } from '../src/online/protocol';
import { applyMessage, createRoom, joinRoom, roomView, setConnected, type Room } from '../src/online/room';

// Serveur de salons en ligne : un Durable Object par code de partie.
// Il garde l'état du salon, arbitre chaque action avec le moteur de l'appli et la renvoie à tous les joueurs.

interface Env {
  ROOMS: DurableObjectNamespace<RoomObject>;
  ASSETS: Fetcher;
}

/** Un salon sans activité est effacé au bout de ce délai (le code redevient libre). */
const ROOM_TTL_MS = 12 * 60 * 60 * 1000;
/** Taille maximale d'un message reçu : bien au-dessus de tout message légitime. */
const MAX_MESSAGE_BYTES = 4096;

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } });

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/api/rooms' && request.method === 'POST') {
      // Quelques essais au cas où le code tiré serait déjà pris par un salon actif.
      for (let attempt = 0; attempt < 5; attempt++) {
        const code = randomCode(() => crypto.getRandomValues(new Uint32Array(1))[0]! / 2 ** 32);
        const stub = env.ROOMS.get(env.ROOMS.idFromName(code));
        if (await stub.init(code)) return json({ code });
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

    if (url.pathname.startsWith('/api/')) return json({ error: 'Introuvable.' }, 404);
    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;

interface Attachment {
  playerId: string | null;
}

export class RoomObject extends DurableObject<Env> {
  /** Crée le salon ; false si ce code est déjà utilisé. */
  async init(code: string): Promise<boolean> {
    if (await this.load()) return false;
    await this.save(createRoom(code));
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
        const joined = joinRoom(room, message.token, message.identity, () => crypto.randomUUID());
        socket.serializeAttachment({ playerId: joined.player.id } satisfies Attachment);
        this.send(socket, { type: 'welcome', playerId: joined.player.id, token: joined.player.token });
        await this.commit(joined.room);
        return;
      }
      if (!playerId) throw new Error('Présente-toi d’abord.');
      await this.commit(applyMessage(room, playerId, message));
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
