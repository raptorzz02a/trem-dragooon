import { MAX_PLAYERS } from '../game-engine/engine';
import { buildConfig, cleanSetup, DEFAULT_SETUP, drawTeams, setupProblem, smallestTeam, type GameSetup } from '../game-setup/setup';
import type { GameRecord } from '../profiles/types';
import {
  abandonSession,
  createSession,
  endTurn,
  sessionState,
  startSession,
  throwDart,
  undoLast,
  type GameSession,
} from '../game-session/session';
import type { Rng } from '../teams/teams';
import type { ClientMessage, OnlineIdentity, OnlinePlayer, RoomPlace, RoomView } from './protocol';
import { PUBLIC_SALOON_ID } from './saloons';

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
  place: RoomPlace;
  setup: GameSetup;
  players: RoomPlayer[];
  session: GameSession | null;
  /** Compteur des identifiants de joueurs (p1, p2…), jamais réutilisés. */
  nextPlayer: number;
  /** Saloon où se joue la partie (absent : saloon public). */
  saloonId?: string;
}

export const MAX_NAME_LENGTH = 20;

export function createRoom(code: string, place: RoomPlace = 'remote', setup: GameSetup = DEFAULT_SETUP, saloonId?: string): Room {
  const room: Room = { code, hostId: '', status: 'lobby', place, setup, players: [], session: null, nextPlayer: 1 };
  return saloonId && saloonId !== PUBLIC_SALOON_ID ? { ...room, saloonId } : room;
}

export function roomView(room: Room): RoomView {
  return {
    code: room.code,
    hostId: room.hostId,
    status: room.status,
    place: room.place,
    setup: room.setup,
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
 * Arrivée d'un joueur. Avec un token connu, ou avec un compte déjà présent dans le salon (autre appareil),
 * il reprend sa place ; sinon il entre comme nouveau joueur, ce qui n'est possible que dans la salle d'attente.
 * Avec un compte, l'identifiant du joueur est celui du compte : les parties enregistrées lui sont rattachées.
 */
export function joinRoom(
  room: Room,
  token: string | null,
  identity: OnlineIdentity,
  newToken: () => string,
  accountId?: string,
): { room: Room; player: RoomPlayer } {
  const known =
    (token ? room.players.find((p) => p.token === token) : undefined) ??
    (accountId ? room.players.find((p) => p.id === accountId) : undefined);
  if (known) {
    // Avec un compte, son pseudo et son avatar actuels remplacent ceux du salon.
    const player = { ...known, ...(accountId === known.id ? cleanIdentity(identity, room.players.filter((p) => p.id !== known.id)) : {}), connected: true };
    return { room: replacePlayer(room, player), player };
  }
  if (room.status !== 'lobby') throw new Error('La partie a déjà commencé : impossible de la rejoindre.');
  if (room.players.length >= MAX_PLAYERS) throw new Error(`Le salon est complet (${MAX_PLAYERS} joueurs).`);
  const player: RoomPlayer = {
    id: accountId ?? `p${room.nextPlayer}`,
    ...cleanIdentity(identity, room.players),
    connected: true,
    token: newToken(),
  };
  return { room: addPlayer(room, player), player };
}

/** Nouveau joueur en bas de la liste ; en équipes, il rejoint la moins nombreuse. */
function addPlayer(room: Room, player: RoomPlayer): Room {
  const team = smallestTeam(room.setup, room.players.map((p) => p.id));
  return {
    ...room,
    players: [...room.players, player],
    hostId: room.hostId || player.id,
    nextPlayer: room.nextPlayer + 1,
    setup: { ...room.setup, teamOf: { ...room.setup.teamOf, [player.id]: team } },
  };
}

/**
 * Joueur ajouté par l'hôte sur son appareil, après vérification de son mot de passe par le serveur :
 * il joue sur la même cible et c'est l'hôte qui saisit pour lui.
 */
export function addLocalPlayer(room: Room, hostId: string, account: OnlineIdentity & { id: string }, newToken: () => string): Room {
  assertHost(room, hostId);
  if (room.status !== 'lobby') throw new Error('La partie a déjà commencé.');
  if (room.players.some((p) => p.id === account.id)) throw new Error(`${account.name} est déjà dans la partie.`);
  if (room.players.length >= MAX_PLAYERS) throw new Error(`Le salon est complet (${MAX_PLAYERS} joueurs).`);
  const player: RoomPlayer = { id: account.id, ...cleanIdentity(account, room.players), connected: false, local: true, token: newToken() };
  return addPlayer(room, player);
}

function replacePlayer(room: Room, player: RoomPlayer): Room {
  return { ...room, players: room.players.map((p) => (p.id === player.id ? player : p)) };
}

/**
 * Ce que l'arrivée de next change aux parties enregistrées : une partie qui vient de se terminer est à enregistrer,
 * une partie terminée rouverte par une annulation est à oublier.
 */
export function archiveChange(before: Room, next: Room): { record: GameRecord } | { forget: string } | null {
  const was = before.session;
  const now = next.session;
  const sameGame = was && now && was.id === now.id;
  if (now?.status === 'finished' && !(sameGame && was.status === 'finished')) {
    return { record: record(next, now) };
  }
  // Une partie arrêtée en cours de route compte dans l'historique, ni en victoire ni en défaite.
  if (now?.status === 'abandoned' && !(sameGame && was.status === 'abandoned') && now.events.length > 0) {
    return { record: record(next, now) };
  }
  if (sameGame && was.status === 'finished' && now.status !== 'finished') return { forget: now.id };
  return null;
}

function record(room: Room, session: GameSession): GameRecord {
  const out: GameRecord = { id: session.id, session, players: playersOf(room, session) };
  return room.saloonId ? { ...out, saloonId: room.saloonId } : out;
}

function playersOf(room: Room, session: GameSession) {
  const ids = new Set(session.config.sides.flatMap((s) => s.playerIds));
  return room.players.filter((p) => ids.has(p.id)).map((p) => ({ id: p.id, name: p.name }));
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
  if (room.hostId === playerId) return actor !== null;
  return actor === playerId && room.place !== 'same';
}

/**
 * Qui peut saisir les fléchettes du joueur actif : sur la même cible, l'appareil de l'hôte ; à distance, le joueur
 * lui-même, ou l'hôte pour un joueur sans téléphone ou dont la connexion est coupée.
 */
export function canThrow(room: Room | RoomView, playerId: string): boolean {
  const session = room.session;
  if (room.status !== 'playing' || !session || session.status !== 'in_progress') return false;
  const current = sessionState(session).current;
  if (!current) return false;
  // Sur la même cible, seul l'appareil de l'hôte saisit : les téléphones suivent, sans risque de double saisie.
  if (room.place === 'same') return room.hostId === playerId;
  if (current.playerId === playerId) return true;
  if (room.hostId !== playerId) return false;
  const player = room.players.find((p) => p.id === current.playerId);
  return !player || player.local === true || !player.connected;
}

/** Joueurs embarqués au lancement : à distance, ceux qui sont là ; sur la même cible, toute la liste. */
export function startingPlayers(room: Room | RoomView): OnlinePlayer[] {
  const playing = room.players.filter((p) => !p.spectator);
  return room.place === 'same' ? playing : playing.filter((p) => p.connected || p.local);
}

function assertLobby(room: Room): void {
  if (room.status !== 'lobby') throw new Error('La partie a déjà commencé.');
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
    case 'setup': {
      assertHost(room, playerId);
      assertLobby(room);
      const setup = cleanSetup(message.setup, room.setup);
      return { ...room, setup: { ...setup, teamOf: { ...room.setup.teamOf, ...setup.teamOf } } };
    }

    case 'place':
      assertHost(room, playerId);
      assertLobby(room);
      if (message.place !== 'same' && message.place !== 'remote') throw new Error('Choix invalide.');
      return { ...room, place: message.place };

    case 'removePlayer': {
      assertHost(room, playerId);
      assertLobby(room);
      if (message.playerId === room.hostId) throw new Error('L’hôte ne peut pas se retirer : il peut quitter le salon.');
      return { ...room, players: room.players.filter((p) => p.id !== message.playerId) };
    }

    case 'movePlayer': {
      assertHost(room, playerId);
      assertLobby(room);
      const from = room.players.findIndex((p) => p.id === message.playerId);
      const to = from + Math.sign(Number(message.delta) || 0);
      if (from < 0 || to < 0 || to >= room.players.length || to === from) return room;
      const players = room.players.slice();
      const [moved] = players.splice(from, 1);
      players.splice(to, 0, moved!);
      return { ...room, players };
    }

    case 'drawTeams': {
      assertHost(room, playerId);
      assertLobby(room);
      const ids = room.players.map((p) => p.id);
      if (ids.length < room.setup.teamCount) throw new Error('Pas assez de joueurs pour ce nombre d’équipes.');
      return { ...room, setup: { ...room.setup, teamOf: drawTeams(ids, room.setup.teamCount, rng) } };
    }

    case 'addPlayer':
    case 'createPlayer':
      // Le mot de passe est vérifié (ou le compte créé) par le serveur, qui appelle ensuite addLocalPlayer.
      throw new Error('Ajout de joueur impossible ici.');

    case 'setPlaying': {
      assertHost(room, playerId);
      assertLobby(room);
      const me = room.players.find((p) => p.id === playerId)!;
      return replacePlayer(room, { ...me, spectator: !message.playing });
    }

    case 'start': {
      assertHost(room, playerId);
      assertLobby(room);
      const players = startingPlayers(room);
      const problem = setupProblem(room.setup, players);
      if (problem) throw new Error(problem);
      const config = buildConfig(room.setup, players, rng);
      const session = startSession(createSession(`online-${room.code}-${Date.parse(now) || 0}`, config, now), now);
      // À distance, les absents ne sont pas embarqués ; l'hôte spectateur reste dans le salon pour saisir.
      const kept = room.place === 'same' ? room.players : room.players.filter((p) => p.id === room.hostId || players.some((x) => x.id === p.id));
      return { ...room, players: kept, status: 'playing', session };
    }

    case 'dart':
    case 'endTurn': {
      const session = room.session;
      if (room.status !== 'playing' || !session) throw new Error('Aucune partie en cours.');
      if (!sessionState(session).current) throw new Error('La partie est terminée.');
      if (!canThrow(room, playerId)) throw new Error('Ce n’est pas ton tour.');
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

    case 'abandon':
      assertHost(room, playerId);
      if (room.status !== 'playing' || room.session?.status !== 'in_progress') throw new Error('Aucune partie en cours.');
      // La partie arrêtée reste dans le salon le temps d'être enregistrée ; on revient à la salle d'attente.
      return { ...room, status: 'lobby', session: abandonSession(room.session, now) };

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
