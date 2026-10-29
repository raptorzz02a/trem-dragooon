import type { Dart } from './darts';

export type GameMode = 'x01' | 'cricket' | 'clock' | 'random';

export interface X01Options {
  startScore: 301 | 501 | 701;
  out: 'straight' | 'double';
  /** Nombre maximal de manches. null = pas de limite. */
  maxRounds: number | null;
}

export interface CricketOptions {
  /** Le Bull fait partie des numéros à fermer. */
  bull: boolean;
  /** standard : les points vont au tireur. cutthroat : aux adversaires, le plus bas gagne. */
  variant: 'standard' | 'cutthroat';
  maxRounds: number;
}

export interface ClockOptions {
  order: 'asc' | 'desc' | 'board';
  /** Zone exigée pour valider le numéro actif. */
  required: 'any' | 'double' | 'triple';
  /** Un double fait avancer de 2, un triple de 3 (seulement avec required = any). */
  advanceByMultiplier: boolean;
  /** none : fin au dernier numéro. any : un Bull 25 ou 50 termine. both : 25 puis 50. */
  bullFinish: 'none' | 'any' | 'both';
}

export interface RandomOptions {
  rounds: 10 | 15 | 20;
  /** Numéro tiré pour chaque manche (25 = Bull), fixé au lancement de la partie. */
  targets: number[];
}

export type ModeOptions =
  | { mode: 'x01'; options: X01Options }
  | { mode: 'cricket'; options: CricketOptions }
  | { mode: 'clock'; options: ClockOptions }
  | { mode: 'random'; options: RandomOptions };

/**
 * Un « côté » est ce qui porte un score : un joueur seul en individuel,
 * une équipe en mode équipe. Les joueurs d'un côté lancent à tour de rôle.
 */
export interface Side {
  id: string;
  name: string;
  color?: string;
  playerIds: string[];
}

export type GameConfig = ModeOptions & {
  teamMode: boolean;
  /** Partie d'entraînement : stats enregistrées, mais exclue des victoires et classements. */
  training: boolean;
  /** Ordre de passage des côtés. */
  sides: Side[];
};

export type GameEvent = { type: 'dart'; dart: Dart } | { type: 'endTurn' };

export interface ThrownDart {
  dart: Dart;
  /** Position de l'événement dans la liste, utilisée pour les corrections. */
  eventIndex: number;
  /** Points marqués par cette fléchette selon les règles du mode (0 si elle ne compte pas). */
  points: number;
}

export type TurnOutcome = 'complete' | 'ended' | 'bust' | 'win' | 'done';

export interface TurnRecord {
  turnIndex: number;
  round: number;
  sideIndex: number;
  playerId: string;
  darts: ThrownDart[];
  outcome: TurnOutcome;
}

export interface CurrentTurn {
  turnIndex: number;
  round: number;
  sideIndex: number;
  playerId: string;
  darts: ThrownDart[];
  dartsLeft: number;
}

export interface RankEntry {
  sideIndex: number;
  rank: number;
  /** Valeur principale du classement (reste, points, fléchettes…), selon le mode. */
  value: number;
}

export interface GameState {
  config: GameConfig;
  status: 'in_progress' | 'finished';
  /** Indices des côtés gagnants. Plusieurs en cas d'égalité. */
  winners: number[];
  ranking: RankEntry[];
  current: CurrentTurn | null;
  turns: TurnRecord[];
  /** État propre au mode (scores, marques, progression…). */
  mode: unknown;
  /** Événements ignorés parce que la partie était déjà terminée (après une correction). */
  ignoredEvents: number;
}
