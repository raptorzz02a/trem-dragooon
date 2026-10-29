import type { Dart } from '../game-engine/darts';
import type { GameSetup } from '../game-setup/setup';
import type { GameSession } from '../game-session/session';
import type { AvatarConfig } from '../profiles/types';

// Messages échangés entre l'appli et le serveur de salons (WebSocket, JSON).

/** Ce qu'un joueur montre aux autres : un surnom et un avatar (ceux de son compte). */
export interface OnlineIdentity {
  name: string;
  color: string;
  avatar: AvatarConfig;
}

export interface OnlinePlayer extends OnlineIdentity {
  /** Identifiant du compte du joueur, utilisé dans la configuration de la partie et les statistiques. */
  id: string;
  connected: boolean;
  /** Ajouté par l'hôte avec son mot de passe : il joue sur la cible de l'hôte, sans téléphone. */
  local?: boolean;
  /** L'appareil de l'hôte reste connecté à un compte ; « Je ne joue pas » le met de côté pour la partie. */
  spectator?: boolean;
}

export type RoomStatus = 'lobby' | 'playing';

/**
 * same : tout le monde joue sur la même cible, l'appareil de l'hôte saisit pour tous.
 * remote : chacun sur sa cible, chacun saisit ses fléchettes pendant son tour.
 */
export type RoomPlace = 'same' | 'remote';

/** État du salon tel que tous les joueurs le reçoivent. */
export interface RoomView {
  code: string;
  hostId: string;
  status: RoomStatus;
  place: RoomPlace;
  setup: GameSetup;
  players: OnlinePlayer[];
  /** Partie en cours ou terminée (null dans la salle d'attente). */
  session: GameSession | null;
}

export type ClientMessage =
  /**
   * Premier message : token pour reprendre sa place après une coupure, sinon nouvelle arrivée.
   * account : jeton de connexion du compte ; le pseudo et l'avatar du compte remplacent identity.
   */
  | { type: 'hello'; token: string | null; identity: OnlineIdentity; account: string | null }
  | { type: 'setup'; setup: GameSetup }
  | { type: 'place'; place: RoomPlace }
  /** Ajout d'un joueur sans téléphone : il tape son mot de passe sur l'appareil de l'hôte. */
  | { type: 'addPlayer'; name: string; password: string }
  /** Nouveau joueur sans compte : son compte est créé sur l'appareil de l'hôte, puis il est ajouté. */
  | { type: 'createPlayer'; name: string; password: string; color: string; avatar: AvatarConfig }
  /** L'hôte joue ou non la partie (sur la borne, l'appareil reste connecté au compte de son propriétaire). */
  | { type: 'setPlaying'; playing: boolean }
  | { type: 'removePlayer'; playerId: string }
  | { type: 'movePlayer'; playerId: string; delta: number }
  | { type: 'drawTeams' }
  | { type: 'start' }
  | { type: 'dart'; dart: Dart }
  | { type: 'endTurn' }
  | { type: 'undo' }
  /** Retour à la salle d'attente après une partie, avec les mêmes joueurs. */
  | { type: 'backToLobby' }
  /** L'hôte arrête la partie en cours : elle est enregistrée comme abandonnée. */
  | { type: 'abandon' }
  | { type: 'leave' };

export type ServerMessage =
  | { type: 'welcome'; playerId: string; token: string }
  | { type: 'room'; room: RoomView }
  | { type: 'error'; message: string };

/** Alphabet des codes de salon : sans 0/O ni 1/I/L, pour être dicté sans erreur. */
export const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const CODE_LENGTH = 6;

export function normalizeCode(text: string): string {
  return text.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function isValidCode(code: string): boolean {
  return code.length === CODE_LENGTH && [...code].every((c) => CODE_ALPHABET.includes(c));
}

export function randomCode(random: () => number = Math.random): string {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) code += CODE_ALPHABET[Math.floor(random() * CODE_ALPHABET.length)];
  return code;
}
