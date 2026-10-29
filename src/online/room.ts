import { DEFAULT_OPTIONS, MAX_PLAYERS } from '../game-engine/engine';
import type { GameConfig, X01Options } from '../game-engine/types';
import {
  createSession,
  endTurn,
  sessionState,
  startSession,
  throwDart,
  undoLast,
  type GameSession,
} from '../game-session/session';
import { individualSides, randomOrder, type Rng } from '../teams/teams';
import type { ClientMessage, OnlineIdentity, OnlinePlayer, RoomView } from './protocol';

// Règles d'un salon en ligne, sans réseau ni stockage : le serveur les applique, les tests les vérifient.
// Le serveur est l'arbitre : il refuse une fléchette saisie par un joueur dont ce n'est pas le tour.

export interface RoomPlayer extends OnlinePlayer {
  /** Secret remis au joueur pour reprendre sa place ; jamais envoyé aux autres. */
  token: string;
}

export interface Room {
  code: string;
  hostId: string;
  status: RoomView['status'];
  options: X01Options;
  players: RoomPlayer[];
  session: GameSession | null;
  /** Compteur des identifiants de joueurs (p1, p2…), jamais réutilisés. */
  nextPlayer: number;
}

export const MIN_ONLINE_PLAYERS = 2;
export const MAX_NAME_LENGTH = 20;

export function createRoom(code: string): Room {
  return { code, hostId: '', status: 'lobby', options: { ...DEFAULT_OPTIONS.x01 }, players: [], session: null, nextPlayer: 1 };
}

export function roomView(room: Room): RoomView {
  return {
    code: room.code,
    hostId: room.hostId,
    status: room.status,
    options: room.options,
    players: room.players.map(({ token: _token, ...p }) => p),
    session: room.session,
  };
}

function cleanIdentity(identity: OnlineIdentity, others: RoomPlayer[]): OnlineIdentity {
  let name = String(identity.name ?? '').trim().slice(0, MAX_NAME_LENGTH) || 'Joueur';
  // Deux surnoms identiques seraient impossibles à distinguer au tableau.
  const taken = (n: string) => others.some((p) => p.name.toLocaleLowerCase('fr') === n.toLocaleLowerCase('fr'));
  for (let i = 2; taken(name); i++) name = `${identity.name.trim().slice(0, MAX_NAME_LENGTH - 3)} ${i}`;
  return { name, color: String(identity.color ?? '#d4a017'), avatar: identity.avatar };
}

/**
 * Arrivée d'un joueur. Avec un token connu, il reprend sa place (après une coupure) ;
 * sinon il entre comme nouveau joueur, ce qui n'est possible que dans la salle d'attente.
 */
export function joinRoom(
  room: Room,
  token: string | null,
  identity: OnlineIdentity,
  newToken: () => string,
): { room: Room; player: RoomPlayer } {
  const known = token ? room.players.find((p) => p.token === token) : undefined;
  if (known) {
    const player = { ...known, connected: true };
    return { room: replacePlayer(room, player), player };
  }
  if (room.status !== 'lobby') throw new Error('La partie a déjà commencé : impossible de la rejoindre.');
  if (room.players.length >= MAX_PLAYERS) throw new Error(`Le salon est complet (${MAX_PLAYERS} joueurs).`);
  const player: RoomPlayer = {
    id: `p${room.nextPlayer}`,
    ...cleanIdentity(identity, room.players),
    connected: true,
    token: newToken(),
  };
  return {
    room: {
      ...room,
      players: [...room.players, player],
      hostId: room.hostId || player.id,
      nextPlayer: room.nextPlayer + 1,
    },
    player,
  };
}

function replacePlayer(room: Room, player: RoomPlayer): Room {
  return { ...room, players: room.players.map((p) => (p.id === player.id ? player : p)) };
}

/** Si l'hôte n'est plus là, le premier joueur connecté prend la main. */
function ensureHost(room: Room): Room {
  const host = room.players.find((p) => p.id === room.hostId);
  if (host?.connected) return room;
  const next = room.players.find((p) => p.connected);
  return next ? { ...room, hostId: next.id } : room;
}

export function setConnected(room: Room, playerId: string, connected: boolean): Room {
  const player = room.players.find((p) => p.id === playerId);
  if (!player) return room;
  return ensureHost(replacePlayer(room, { ...player, connected }));
}

/** Joueur qui a saisi la dernière action : lui seul (ou l'hôte) peut l'annuler. */
export function lastActor(session: GameSession): string | null {
  if (session.events.length === 0) return null;
  const state = sessionState(session);
  if (state.current && state.current.darts.length > 0) return state.current.playerId;
  return state.turns.at(-1)?.playerId ?? null;
}

export function canUndo(room: Room | RoomView, playerId: string): boolean {
  const session = room.session;
  if (room.status !== 'playing' || !session) return false;
  if (session.status !== 'in_progress' && session.status !== 'finished') return false;
  const actor = lastActor(session);
  return actor !== null && (actor === playerId || room.hostId === playerId);
}

export function onlineConfig(players: readonly OnlinePlayer[], options: X01Options, rng: Rng = Math.random): GameConfig {
  return {
    mode: 'x01',
    options,
    teamMode: false,
    training: false,
    sides: randomOrder(individualSides(players), rng),
  };
}

function validOptions(options: X01Options): X01Options {
  const startScore = [301, 501, 701].includes(options?.startScore) ? options.startScore : null;
  const out = options?.out === 'straight' || options?.out === 'double' ? options.out : null;
  if (!startScore || !out) throw new Error('Réglages de partie invalides.');
  return { startScore, out, maxRounds: null };
}

function assertHost(room: Room, playerId: string): void {
  if (room.hostId !== playerId) throw new Error('Seul l’hôte peut faire cela.');
}

/** Applique un message d'un joueur. Lève une erreur (message en français) si l'action est refusée. */
export function applyMessage(
  room: Room,
  playerId: string,
  message: ClientMessage,
  now: string = new Date().toISOString(),
  rng: Rng = Math.random,
): Room {
  if (!room.players.some((p) => p.id === playerId)) throw new Error('Joueur inconnu dans ce salon.');

  switch (message.type) {
    case 'options':
      assertHost(room, playerId);
      if (room.status !== 'lobby') throw new Error('La partie a déjà commencé.');
      return { ...room, options: validOptions(message.options) };

    case 'start': {
      assertHost(room, playerId);
      if (room.status !== 'lobby') throw new Error('La partie a déjà commencé.');
      const present = room.players.filter((p) => p.connected);
      if (present.length < MIN_ONLINE_PLAYERS) throw new Error(`Il faut au moins ${MIN_ONLINE_PLAYERS} joueurs connectés.`);
      // Les joueurs déconnectés dans la salle d'attente ne sont pas embarqués dans la partie.
      const players = room.players.filter((p) => p.connected);
      const config = onlineConfig(players, room.options, rng);
      const session = startSession(createSession(`online-${room.code}-${Date.parse(now) || 0}`, config, now), now);
      return { ...room, players, status: 'playing', session };
    }

    case 'dart':
    case 'endTurn': {
      const session = room.session;
      if (room.status !== 'playing' || !session) throw new Error('Aucune partie en cours.');
      const current = sessionState(session).current;
      if (!current) throw new Error('La partie est terminée.');
      if (current.playerId !== playerId) throw new Error('Ce n’est pas ton tour.');
      const next = message.type === 'dart' ? throwDart(session, message.dart, now) : endTurn(session, now);
      return { ...room, session: next };
    }

    case 'undo':
      if (!canUndo(room, playerId)) throw new Error('Tu ne peux pas annuler cette fléchette.');
      return { ...room, session: undoLast(room.session!, now) };

    case 'backToLobby':
      assertHost(room, playerId);
      if (room.session?.status === 'in_progress') throw new Error('La partie n’est pas terminée.');
      return { ...room, status: 'lobby', session: null };

    case 'leave': {
      // Dans la salle d'attente, le joueur disparaît ; en pleine partie, sa place reste (il peut revenir).
      const rest =
        room.status === 'lobby'
          ? { ...room, players: room.players.filter((p) => p.id !== playerId) }
          : setConnected(room, playerId, false);
      return ensureHost(rest.hostId === playerId && room.status === 'lobby' ? { ...rest, hostId: '' } : rest);
    }

    case 'hello':
      throw new Error('Déjà connecté.');
  }
}
