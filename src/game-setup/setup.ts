import { DEFAULT_OPTIONS, MAX_TEAMS, MIN_TEAMS, validateConfig } from '../game-engine/engine';
import { drawTargets } from '../game-engine/modes/random';
import type {
  ClassicMode,
  ClockOptions,
  CricketOptions,
  ExtraMode,
  GameConfig,
  GameMode,
  RandomOptions,
  TrainingOptions,
  X01Options,
} from '../game-engine/types';
import { emptyTeams, individualSides, randomOrder, randomTeams, type Rng } from '../teams/teams';
import {
  cleanValues,
  defaultValues,
  EXTRA_GAMES,
  EXTRA_MODES,
  extraGame,
  extraPlayersProblem,
  isExtraMode,
  type SettingValue,
} from '../extra-games/catalog';

// Réglages d'une partie avant son lancement : jeu, options, équipes, ordre de passage.
// Partagés par l'écran de la salle d'attente et par le serveur, qui les vérifie avant de les accepter.

export interface GameSetup {
  mode: GameMode;
  x01: X01Options;
  cricket: CricketOptions;
  clock: ClockOptions;
  /** Les numéros sont tirés au lancement : seuls les réglages comptent ici. */
  random: RandomOptions;
  teamMode: boolean;
  teamCount: number;
  /** Ordre tiré au sort au lancement ; sinon, ordre de la liste des joueurs. */
  randomizeOrder: boolean;
  /** Équipe de chaque joueur (indice), en mode équipe. */
  teamOf: Record<string, number>;
  /** Réglages des « Autres jeux », par jeu (clés et valeurs proposées par le catalogue). */
  extra: Record<ExtraMode, Record<string, SettingValue>>;
}

const defaultExtra = () =>
  Object.fromEntries(EXTRA_GAMES.map((g) => [g.id, defaultValues(g)])) as Record<ExtraMode, Record<string, SettingValue>>;

export const DEFAULT_SETUP: GameSetup = {
  mode: 'x01',
  x01: { ...DEFAULT_OPTIONS.x01 },
  cricket: { ...DEFAULT_OPTIONS.cricket },
  clock: { ...DEFAULT_OPTIONS.clock },
  random: { ...DEFAULT_OPTIONS.random },
  teamMode: false,
  teamCount: 2,
  randomizeOrder: true,
  teamOf: {},
  extra: defaultExtra(),
};

/** Modes principaux : les seuls comptés dans les statistiques et classements classiques. */
export const MODES: ClassicMode[] = ['x01', 'cricket', 'clock', 'random', 'training'];

/** Tous les modes qu'une partie peut avoir, Autres jeux compris. */
export const ALL_MODES: GameMode[] = [...MODES, ...EXTRA_MODES];

export const isClassicMode = (mode: GameMode): mode is ClassicMode => (MODES as GameMode[]).includes(mode);

export const MODE_NAMES: Record<GameMode, string> = {
  x01: '301 / 501 / 701',
  cricket: 'Cricket',
  clock: 'Horloge',
  random: 'Chiffre aléatoire',
  training: 'Entraînement',
  ...(Object.fromEntries(EXTRA_GAMES.map((g) => [g.id, g.name])) as Record<ExtraMode, string>),
};

/** Convention d'équipe à afficher avant le départ. */
export const TEAM_NOTES: Record<GameMode, string> = {
  x01: 'Le score est commun à l’équipe.',
  cricket: 'Marques et points sont communs à l’équipe.',
  clock: 'La progression est commune : le numéro à viser est partagé par l’équipe.',
  random: 'Le total est commun : tous visent le même numéro tiré au sort.',
  training: 'Les points de l’équipe s’additionnent.',
  ...(Object.fromEntries(EXTRA_MODES.map((m) => [m, 'Le score est commun à l’équipe ; ses joueurs lancent à tour de rôle.'])) as Record<
    ExtraMode,
    string
  >),
};

function modeOptions(setup: GameSetup, sideCount: number, rng: Rng) {
  if (isExtraMode(setup.mode)) {
    const def = extraGame(setup.mode);
    return def.options(cleanValues(def, setup.extra?.[setup.mode]), sideCount, rng);
  }
  switch (setup.mode) {
    case 'x01':
      return { mode: 'x01' as const, options: setup.x01 };
    case 'cricket':
      return { mode: 'cricket' as const, options: setup.cricket };
    case 'clock':
      return { mode: 'clock' as const, options: setup.clock };
    case 'random':
      return { mode: 'random' as const, options: { rounds: setup.random.rounds, targets: drawTargets(setup.random.rounds, rng) } };
    case 'training':
      return { mode: 'training' as const, options: {} as TrainingOptions };
  }
}

/**
 * Configuration du moteur pour ces joueurs (dans l'ordre de la liste).
 * Une partie à un joueur, ou une partie du mode Entraînement, est un entraînement : stats, mais pas de victoire.
 */
export function buildConfig(setup: GameSetup, players: readonly { id: string; name: string }[], rng: Rng = Math.random): GameConfig {
  let sides = individualSides(players);
  if (setup.teamMode) {
    sides = emptyTeams(setup.teamCount);
    for (const p of players) sides[setup.teamOf[p.id] ?? 0]!.playerIds.push(p.id);
  }
  if (setup.randomizeOrder) sides = randomOrder(sides, rng);
  return {
    ...modeOptions(setup, sides.length, rng),
    teamMode: setup.teamMode,
    training: players.length === 1 || setup.mode === 'training',
    sides,
  } as GameConfig;
}

/** Pourquoi la partie ne peut pas être lancée avec ces réglages, ou null si tout va bien. */
export function setupProblem(setup: GameSetup, players: readonly { id: string; name: string }[]): string | null {
  if (players.length === 0) return 'Ajoute au moins un joueur.';
  if (isExtraMode(setup.mode)) {
    const problem = extraPlayersProblem(extraGame(setup.mode), players.length, setup.teamMode);
    if (problem) return problem;
  }
  try {
    validateConfig(buildConfig({ ...setup, randomizeOrder: false }, players));
    return null;
  } catch (e) {
    return (e as Error).message;
  }
}

/** Répartition au hasard en équipes de tailles aussi égales que possible. */
export function drawTeams(playerIds: readonly string[], teamCount: number, rng: Rng = Math.random): Record<string, number> {
  const teamOf: Record<string, number> = {};
  randomTeams(playerIds, teamCount, rng).forEach((t, i) => t.playerIds.forEach((id) => (teamOf[id] = i)));
  return teamOf;
}

/** Équipe la moins nombreuse, pour un joueur qui arrive. */
export function smallestTeam(setup: GameSetup, playerIds: readonly string[]): number {
  const sizes = Array.from({ length: setup.teamCount }, (_, t) => playerIds.filter((id) => setup.teamOf[id] === t).length);
  return sizes.indexOf(Math.min(...sizes));
}

// Vérification des réglages reçus du réseau : seules les valeurs proposées à l'écran sont acceptées.

const pick = <T>(value: unknown, allowed: readonly T[], fallback: T): T => (allowed.includes(value as T) ? (value as T) : fallback);

const obj = (value: unknown): Record<string, unknown> => (value && typeof value === 'object' ? (value as Record<string, unknown>) : {});

export function cleanSetup(input: unknown, base: GameSetup = DEFAULT_SETUP): GameSetup {
  const v = obj(input);
  const x = obj(v.x01);
  const c = obj(v.cricket);
  const h = obj(v.clock);
  const r = obj(v.random);
  const required = pick(h.required, ['any', 'double', 'triple'] as const, base.clock.required);
  const teamCount = pick(v.teamCount, [2, 3, 4, 5], base.teamCount);
  const teamOf: Record<string, number> = {};
  for (const [id, t] of Object.entries(obj(v.teamOf ?? base.teamOf))) {
    if (typeof t === 'number' && Number.isInteger(t) && t >= 0 && t < MAX_TEAMS) teamOf[id.slice(0, 64)] = Math.min(t, teamCount - 1);
  }
  const mode = pick(v.mode, ALL_MODES, base.mode);
  // Jeu individuel (Killer…) : pas d'équipes, même si le saloon les a par défaut.
  const soloOnly = isExtraMode(mode) && !extraGame(mode).teams;
  return {
    mode,
    x01: {
      startScore: pick(x.startScore, [301, 501, 701] as const, base.x01.startScore),
      out: pick(x.out, ['straight', 'double'] as const, base.x01.out),
      maxRounds: null,
    },
    cricket: {
      variant: pick(c.variant, ['standard', 'cutthroat'] as const, base.cricket.variant),
      bull: pick(c.bull, [true, false], base.cricket.bull),
      maxRounds: pick(c.maxRounds, [null, 20], base.cricket.maxRounds),
    },
    clock: {
      order: pick(h.order, ['asc', 'desc', 'board'] as const, base.clock.order),
      required,
      advanceByMultiplier: required === 'any' && pick(h.advanceByMultiplier, [true, false], base.clock.advanceByMultiplier),
      bullFinish: pick(h.bullFinish, ['none', 'any', 'both'] as const, base.clock.bullFinish),
    },
    random: {
      rounds: pick(r.rounds, [10, 15, 20] as const, base.random.rounds),
      targets: [],
    },
    teamMode: !soloOnly && pick(v.teamMode, [true, false], base.teamMode),
    teamCount: Math.max(MIN_TEAMS, teamCount),
    randomizeOrder: pick(v.randomizeOrder, [true, false], base.randomizeOrder),
    teamOf,
    extra: Object.fromEntries(EXTRA_GAMES.map((g) => [g.id, cleanValues(g, obj(v.extra)[g.id], base.extra?.[g.id])])) as GameSetup['extra'],
  };
}
