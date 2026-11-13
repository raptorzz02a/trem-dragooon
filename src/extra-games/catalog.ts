import { drawHalveTargets, HALVE_STANDARD, type HalveItState } from '../game-engine/extra/halveit';
import type { HighScoreState } from '../game-engine/extra/highscore';
import { drawKillerNumbers, KILLER_MIN_PLAYERS, type KillerState } from '../game-engine/extra/killer';
import { MAX_PLAYERS } from '../game-engine/engine';
import type { ExtraMode, GameMode, GameState, ModeOptions } from '../game-engine/types';

// Catalogue des « Autres jeux » : tout ce que l'interface doit savoir d'un jeu (fiche, règles en mots simples,
// réglages, joueurs admis, statistique propre). Les règles de calcul sont dans src/game-engine/extra.

export type Category = 'classic' | 'quick' | 'precision' | 'team' | 'house';

export const CATEGORIES: { value: Category; label: string }[] = [
  { value: 'classic', label: 'Classiques' },
  { value: 'quick', label: 'Rapides' },
  { value: 'precision', label: 'Précision' },
  { value: 'team', label: 'Équipe' },
  { value: 'house', label: 'Défis TREM-DRAGOOON' },
];

/** Icône dessinée de la carte (voir src/ui/components/GameIcon.tsx). */
export type IconName =
  | 'up'
  | 'half'
  | 'killer'
  | 'bat'
  | 'flag'
  | 'heart'
  | 'crown'
  | 'bomb'
  | 'pyramid'
  | 'down'
  | 'chest'
  | 'shield'
  | 'doc'
  | 't27'
  | 't21'
  | 't5'
  | 't6'
  | 't1'
  | 'tD'
  | 'tri';

export type SettingValue = string | number;

export interface ExtraSetting {
  key: string;
  label: string;
  choices: { value: SettingValue; label: string }[];
  default: SettingValue;
}

export interface ExtraGameDef {
  id: ExtraMode;
  name: string;
  /** Phrase courte sous le nom, sur la carte. */
  sub: string;
  categories: Category[];
  icon: IconName;
  minPlayers: number;
  maxPlayers: number;
  /** Le jeu se joue aussi en équipes. */
  teams: boolean;
  /** Infobulle : explication orale, entre amis. */
  bubble: string;
  /** Quatre lignes fixes de la fiche règles. */
  rules: { goal: string; points: string; win: string; warning: string };
  settings: ExtraSetting[];
  /** Options du moteur à partir des réglages choisis (tirages au sort faits ici, au lancement). */
  options(values: Record<string, SettingValue>, sideCount: number, rng: () => number): ModeOptions;
  /** Statistique propre au jeu, pour un côté d'une partie terminée. */
  score: {
    label: string;
    better: 'high' | 'low';
    of(state: GameState, side: number): number | null;
  };
}

/** Jeux annoncés dans le catalogue mais pas encore jouables. */
export interface UpcomingGame {
  name: string;
  sub: string;
  categories: Category[];
  icon: IconName;
}

const num = (v: SettingValue | undefined, fallback: number) => (typeof v === 'number' ? v : fallback);

export const EXTRA_GAMES: ExtraGameDef[] = [
  {
    id: 'highscore',
    name: 'High Score',
    sub: 'Le plus gros total gagne',
    categories: ['quick', 'team'],
    icon: 'up',
    minPlayers: 1,
    maxPlayers: MAX_PLAYERS,
    teams: true,
    bubble:
      'Tu as un nombre de tours défini pour marquer le plus de points possible. Toutes les zones de la cible comptent. Le joueur avec le plus gros total gagne.',
    rules: {
      goal: 'Marquer le plus de points possible',
      points: 'Chaque fléchette rapporte sa valeur (triple 20 = 60)',
      win: 'Le plus gros total à la fin des manches',
      warning: 'Rien de spécial : tout compte, même le Bull',
    },
    settings: [
      {
        key: 'rounds',
        label: 'Manches',
        choices: [5, 10, 15].map((v) => ({ value: v, label: String(v) })),
        default: 10,
      },
    ],
    options: (v) => ({
      mode: 'highscore',
      options: { rounds: num(v.rounds, 10) as 5 | 10 | 15 },
    }),
    score: {
      label: 'Meilleur total',
      better: 'high',
      of: (s, side) => (s.mode as HighScoreState).scores[side] ?? null,
    },
  },
  {
    id: 'halveit',
    name: 'Halve It',
    sub: 'Rate la cible, ton score est coupé en deux',
    categories: ['classic', 'team'],
    icon: 'half',
    minPlayers: 1,
    maxPlayers: MAX_PLAYERS,
    teams: true,
    bubble:
      'À chaque tour, une cible est imposée. Tu marques les points des fléchettes qui touchent cette cible. Si tu ne touches rien de valable pendant ton tour, ton score est divisé par deux. Le meilleur score gagne.',
    rules: {
      goal: 'Faire le plus de points en 10 manches',
      points: 'La valeur des fléchettes sur la cible du tour (triple 14 = 42)',
      win: 'Le plus gros score après la manche du Bull',
      warning: 'Aucune fléchette sur la cible : ton score est divisé par deux',
    },
    settings: [
      {
        key: 'sequence',
        label: 'Séquence',
        choices: [
          { value: 'standard', label: '12, D13, 14, T15… Bull' },
          { value: 'random', label: 'Tirée au sort' },
        ],
        default: 'standard',
      },
    ],
    options: (v, _n, rng) =>
      v.sequence === 'random'
        ? {
            mode: 'halveit',
            options: { sequence: 'random', targets: drawHalveTargets(rng) },
          }
        : {
            mode: 'halveit',
            options: { sequence: 'standard', targets: HALVE_STANDARD },
          },
    score: {
      label: 'Meilleur score',
      better: 'high',
      of: (s, side) => (s.mode as HalveItState).scores[side] ?? null,
    },
  },
  {
    id: 'killer',
    name: 'Killer',
    sub: 'Touche ton double, puis chasse les autres',
    categories: ['classic'],
    icon: 'killer',
    minPlayers: KILLER_MIN_PLAYERS,
    maxPlayers: MAX_PLAYERS,
    teams: false,
    bubble:
      "Chaque joueur possède un numéro. Tu dois d'abord toucher ton propre double pour devenir un tueur. Ensuite, vise les numéros des adversaires pour leur retirer leurs vies. Le dernier joueur encore en vie gagne.",
    rules: {
      goal: 'Être le dernier joueur encore en vie',
      points: 'Killer : un simple retire 1 vie, un double ou un triple en retire 2',
      win: 'Le dernier survivant',
      warning: 'Une fois Killer, toucher ton propre numéro te coûte une vie',
    },
    settings: [
      {
        key: 'lives',
        label: 'Vies',
        choices: [3, 5].map((v) => ({ value: v, label: String(v) })),
        default: 3,
      },
    ],
    options: (v, n, rng) => ({
      mode: 'killer',
      options: {
        lives: num(v.lives, 3) as 3 | 5,
        numbers: drawKillerNumbers(n, rng),
      },
    }),
    score: {
      label: 'Vies retirées',
      better: 'high',
      of: (s, side) => (s.mode as KillerState).taken[side] ?? null,
    },
  },
];

export const UPCOMING_GAMES: UpcomingGame[] = [
  {
    name: 'Baseball',
    sub: '9 manches, du 1 au 9',
    categories: ['classic', 'team'],
    icon: 'bat',
  },
  {
    name: "Bob's 27",
    sub: 'Les doubles un par un',
    categories: ['classic', 'precision'],
    icon: 't27',
  },
  {
    name: 'Fives',
    sub: 'Des volées divisibles par 5',
    categories: ['quick'],
    icon: 't5',
  },
  {
    name: 'Big Six',
    sub: 'Touche la cible imposée ou perds une vie',
    categories: ['precision'],
    icon: 't6',
  },
  {
    name: 'Golf',
    sub: '18 trous, le plus petit score gagne',
    categories: ['classic', 'team'],
    icon: 'flag',
  },
  {
    name: '21',
    sub: 'Exactement 21, pas un de plus',
    categories: ['quick'],
    icon: 't21',
  },
  {
    name: 'Bermuda',
    sub: 'Une zone tirée au sort à chaque tour',
    categories: ['classic', 'team'],
    icon: 'tri',
  },
  {
    name: 'Low Score',
    sub: 'Le plus petit total gagne',
    categories: ['quick'],
    icon: 'down',
  },
  {
    name: 'Doubles et triples',
    sub: 'Du 1 au 20, 3 fléchettes par numéro',
    categories: ['precision'],
    icon: 'tD',
  },
  {
    name: 'Nine Lives',
    sub: '9 vies pour faire le tour',
    categories: ['quick'],
    icon: 'heart',
  },
  {
    name: 'Killer Doubles',
    sub: 'Défends ton double',
    categories: ['precision'],
    icon: 'shield',
  },
  {
    name: 'One Dart',
    sub: 'Une seule fléchette par tour',
    categories: ['precision'],
    icon: 't1',
  },
  {
    name: 'Survie',
    sub: 'De plus en plus dur',
    categories: ['precision'],
    icon: 'shield',
  },
  {
    name: 'Le Contrat',
    sub: 'Choisis ton défi',
    categories: ['house', 'team'],
    icon: 'doc',
  },
  {
    name: 'La Pyramide',
    sub: 'Simple ou Spicy, monte au sommet',
    categories: ['house'],
    icon: 'pyramid',
  },
  {
    name: 'La Bombe',
    sub: 'Ne la laisse pas exploser',
    categories: ['house'],
    icon: 'bomb',
  },
  {
    name: 'Les Coffres',
    sub: '6 bonus cachés sur la cible',
    categories: ['house', 'team'],
    icon: 'chest',
  },
  {
    name: 'Le Roi',
    sub: 'Prends la couronne',
    categories: ['house'],
    icon: 'crown',
  },
];

export const EXTRA_MODES: ExtraMode[] = EXTRA_GAMES.map((g) => g.id);

export const isExtraMode = (mode: GameMode | string | undefined): mode is ExtraMode => EXTRA_MODES.includes(mode as ExtraMode);

export function extraGame(mode: ExtraMode): ExtraGameDef {
  return EXTRA_GAMES.find((g) => g.id === mode)!;
}

/** Réglages par défaut d'un jeu (bouton « Règles par défaut »). */
export function defaultValues(def: ExtraGameDef): Record<string, SettingValue> {
  return Object.fromEntries(def.settings.map((s) => [s.key, s.default]));
}

/** Garde les seuls réglages proposés à l'écran ; le reste reprend la valeur par défaut. */
export function cleanValues(def: ExtraGameDef, input: unknown, base?: Record<string, SettingValue>): Record<string, SettingValue> {
  const v = input && typeof input === 'object' ? (input as Record<string, unknown>) : {};
  return Object.fromEntries(
    def.settings.map((s) => {
      const asked = v[s.key];
      const fallback = base?.[s.key] ?? s.default;
      return [s.key, s.choices.some((c) => c.value === asked) ? (asked as SettingValue) : fallback];
    }),
  );
}

/** Une partie sans joueur assez nombreux, ou en équipes pour un jeu individuel : la raison, sinon null. */
export function extraPlayersProblem(def: ExtraGameDef, players: number, teamMode: boolean): string | null {
  if (teamMode && !def.teams) return `${def.name} se joue en individuel.`;
  if (players < def.minPlayers) return `Il faut au moins ${def.minPlayers} joueurs pour ${def.name}.`;
  if (players > def.maxPlayers) return `${def.maxPlayers} joueurs maximum pour ${def.name}.`;
  return null;
}

export function playersLabel(def: ExtraGameDef): string {
  return def.minPlayers === def.maxPlayers ? `${def.minPlayers} joueurs` : `${def.minPlayers} à ${def.maxPlayers} joueurs`;
}
