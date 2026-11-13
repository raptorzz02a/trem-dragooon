import type { Dart } from './darts';

/** Modes principaux : ceux de l'accueil, comptés dans les statistiques classiques. */
export type ClassicMode = 'x01' | 'cricket' | 'clock' | 'random' | 'training';

/** « Autres jeux » du catalogue : statistiques à part, jamais mêlées aux modes principaux. */
export type ExtraMode = 'highscore' | 'halveit' | 'killer';

export type GameMode = ClassicMode | ExtraMode;

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

/** Entraînement : pas de réglage, on part de 0 et on additionne les points jusqu'à ce que l'hôte arrête. */
export type TrainingOptions = Record<string, never>;

/** High Score : toutes les zones comptent, sur un nombre de manches fixé. */
export interface HighScoreOptions {
  rounds: 5 | 10 | 15;
}

/** Cible d'une manche de Halve It : un numéro (25 = Bull), avec une zone imposée ou non. */
export interface HalveTarget {
  segment: number;
  /** 2 : double seulement, 3 : triple seulement ; absent : toute zone du numéro. */
  multiplier?: 2 | 3;
}

export interface HalveItOptions {
  sequence: 'standard' | 'random';
  /** Cibles des manches, fixées au lancement (tirées au sort ou séquence de l'annexe). */
  targets: HalveTarget[];
}

export interface KillerOptions {
  lives: 3 | 5;
  /** Numéro de chaque côté (même ordre que sides), tiré au sort au lancement. */
  numbers: number[];
}

export type ModeOptions =
  | { mode: 'x01'; options: X01Options }
  | { mode: 'cricket'; options: CricketOptions }
  | { mode: 'clock'; options: ClockOptions }
  | { mode: 'random'; options: RandomOptions }
  | { mode: 'training'; options: TrainingOptions }
  | { mode: 'highscore'; options: HighScoreOptions }
  | { mode: 'halveit'; options: HalveItOptions }
  | { mode: 'killer'; options: KillerOptions };

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

/** finish : fin de partie demandée (Entraînement, qui n'a pas de fin imposée). */
export type GameEvent = { type: 'dart'; dart: Dart } | { type: 'endTurn' } | { type: 'finish' };

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
