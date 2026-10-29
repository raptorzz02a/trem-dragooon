import type { Dart } from '../game-engine/darts';
import type { X01Options } from '../game-engine/types';
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
  /** Identifiant attribué par le salon (p1, p2…), utilisé dans la configuration de la partie. */
  id: string;
  connected: boolean;
}

export type RoomStatus = 'lobby' | 'playing';

/** État du salon tel que tous les joueurs le reçoivent. */
export interface RoomView {
  code: string;
  hostId: string;
  status: RoomStatus;
  options: X01Options;
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
  | { type: 'options'; options: X01Options }
  | { type: 'start' }
  | { type: 'dart'; dart: Dart }
  | { type: 'endTurn' }
  | { type: 'undo' }
  /** Retour à la salle d'attente après une partie, avec les mêmes joueurs. */
  | { type: 'backToLobby' }
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
