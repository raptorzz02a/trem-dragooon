import { assertValidDart } from './darts';
import { clockRules } from './modes/clock';
import { cricketRules } from './modes/cricket';
import { shanghaiRules } from './modes/shanghai';
import { x01Rules } from './modes/x01';
import type { ModeRules } from './rules';
import type {
  ClockOptions,
  CricketOptions,
  CurrentTurn,
  GameConfig,
  GameEvent,
  GameMode,
  GameState,
  RankEntry,
  ShanghaiOptions,
  ThrownDart,
  TurnOutcome,
  TurnRecord,
  X01Options,
} from './types';

export const DARTS_PER_TURN = 3;
export const MAX_PLAYERS = 10;
export const MIN_TEAMS = 2;
export const MAX_TEAMS = 5;

export const DEFAULT_OPTIONS = {
  x01: { startScore: 501, out: 'double', maxRounds: null } satisfies X01Options,
  cricket: { bull: true, variant: 'standard', maxRounds: 20 } satisfies CricketOptions,
  clock: { order: 'asc', required: 'any', advanceByMultiplier: false, bullFinish: 'any' } satisfies ClockOptions,
  shanghai: { rounds: 20, shanghaiWins: true } satisfies ShanghaiOptions,
} as const;

const RULES: Record<GameMode, ModeRules<any>> = {
  x01: x01Rules,
  cricket: cricketRules,
  clock: clockRules,
  shanghai: shanghaiRules,
};

/** Vérifie la composition de la partie. Lève une erreur explicite si elle est invalide. */
export function validateConfig(config: GameConfig): void {
  const { sides, teamMode } = config;
  const players = sides.flatMap((s) => s.playerIds);
  if (players.length < 1) throw new Error('Il faut au moins un joueur.');
  if (players.length > MAX_PLAYERS) throw new Error(`${MAX_PLAYERS} joueurs maximum.`);
  if (new Set(players).size !== players.length) throw new Error('Un joueur ne peut être que dans une seule équipe.');
  if (new Set(sides.map((s) => s.id)).size !== sides.length) throw new Error('Identifiants de côté en double.');
  if (sides.some((s) => s.playerIds.length === 0)) throw new Error('Chaque équipe doit avoir au moins un joueur.');
  if (teamMode) {
    if (sides.length < MIN_TEAMS || sides.length > MAX_TEAMS) {
      throw new Error(`Il faut entre ${MIN_TEAMS} et ${MAX_TEAMS} équipes.`);
    }
  } else if (sides.some((s) => s.playerIds.length !== 1)) {
    throw new Error('En individuel, chaque côté compte un seul joueur.');
  }
}

/** Joueur qui lance pour un côté donné : les membres d'une équipe se relaient à chaque manche. */
export function playerFor(config: GameConfig, sideIndex: number, round: number): string {
  const side = config.sides[sideIndex]!;
  return side.playerIds[round % side.playerIds.length]!;
}

/**
 * Recalcule entièrement l'état de la partie à partir de la configuration et de la liste des événements.
 * C'est la seule source de vérité : annulation et correction consistent à modifier la liste puis à rejouer.
 */
export function computeState(config: GameConfig, events: readonly GameEvent[]): GameState {
  validateConfig(config);
  const rules = RULES[config.mode];
  const sideCount = config.sides.length;

  let modeState = rules.init(config);
  let turnStartState = modeState;
  let turnIndex = 0;
  let darts: ThrownDart[] = [];
  const turns: TurnRecord[] = [];
  // Objet mutable : TypeScript ne suit pas les affectations faites dans les fonctions internes.
  const game: { status: GameState['status']; winners: number[] } = { status: 'in_progress', winners: [] };
  let ignoredEvents = 0;

  const ctx = () => ({ round: Math.floor(turnIndex / sideCount), sideIndex: turnIndex % sideCount });

  const startTurn = () => {
    darts = [];
    if (rules.onTurnStart) modeState = rules.onTurnStart(modeState, ctx());
    turnStartState = modeState;
  };

  const closeTurn = (outcome: TurnOutcome) => {
    const { round, sideIndex } = ctx();
    turns.push({ turnIndex, round, sideIndex, playerId: playerFor(config, sideIndex, round), darts, outcome });
    if (outcome !== 'win' && sideIndex === sideCount - 1) {
      const end = rules.onRoundEnd(modeState, round);
      if (end) {
        game.status = 'finished';
        game.winners = end.winners;
      }
    }
    turnIndex++;
    if (game.status === 'in_progress') startTurn();
  };

  startTurn();
  events.forEach((event, eventIndex) => {
    if (game.status === 'finished') {
      ignoredEvents++;
      return;
    }
    if (event.type === 'endTurn') {
      closeTurn('ended');
      return;
    }
    assertValidDart(event.dart);
    const result = rules.applyDart(modeState, { ...ctx(), dartIndex: darts.length }, event.dart);
    darts.push({ dart: event.dart, eventIndex, points: result.bust ? 0 : result.points });
    if (result.bust) {
      modeState = turnStartState;
      closeTurn('bust');
    } else if (result.win) {
      modeState = result.state;
      game.status = 'finished';
      game.winners = [ctx().sideIndex];
      closeTurn('win');
    } else {
      modeState = result.state;
      if (result.endTurn) closeTurn('done');
      else if (darts.length >= DARTS_PER_TURN) closeTurn('complete');
    }
  });

  let current: CurrentTurn | null = null;
  if (game.status === 'in_progress') {
    const { round, sideIndex } = ctx();
    current = {
      turnIndex,
      round,
      sideIndex,
      playerId: playerFor(config, sideIndex, round),
      darts,
      dartsLeft: DARTS_PER_TURN - darts.length,
    };
  }

  let ranking = rules.ranking(modeState);
  if (game.status === 'finished') ranking = putWinnersFirst(ranking, game.winners);

  return { config, status: game.status, winners: game.winners, ranking, current, turns, mode: modeState, ignoredEvents };
}

/** Une victoire immédiate (Shanghai, Cricket) place le gagnant premier même si un autre a plus de points. */
function putWinnersFirst(ranking: RankEntry[], winners: number[]): RankEntry[] {
  const first = ranking.filter((r) => winners.includes(r.sideIndex)).map((r) => ({ ...r, rank: 1 }));
  const rest = ranking.filter((r) => !winners.includes(r.sideIndex));
  const reranked: RankEntry[] = [];
  rest.forEach((r, i) => {
    const prev = rest[i - 1];
    const tied = prev !== undefined && prev.rank === r.rank;
    reranked.push({ ...r, rank: tied ? reranked[i - 1]!.rank : first.length + i + 1 });
  });
  return [...first, ...reranked];
}
