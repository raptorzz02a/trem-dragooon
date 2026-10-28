import { dartScore, type Multiplier } from '../darts';
import { rankBy, topRanked, type ModeRules } from '../rules';
import type { ShanghaiOptions } from '../types';

export interface ShanghaiState {
  options: ShanghaiOptions;
  scores: number[];
  /** Numéro cible de la manche en cours. */
  target: number;
  /** Zones du numéro cible déjà touchées dans la volée en cours (pour la règle du Shanghai). */
  hitsThisTurn: Multiplier[];
}

/** Zones qui manquent encore pour réussir un Shanghai dans la volée en cours. */
export function shanghaiRemaining(state: ShanghaiState): Multiplier[] {
  return ([1, 2, 3] as const).filter((m) => !state.hitsThisTurn.includes(m));
}

export const shanghaiRules: ModeRules<ShanghaiState> = {
  init(config) {
    const options = config.options as ShanghaiOptions;
    return { options, scores: config.sides.map(() => 0), target: 1, hitsThisTurn: [] };
  },

  onTurnStart(state, ctx) {
    return { ...state, target: ctx.round + 1, hitsThisTurn: [] };
  },

  applyDart(state, ctx, dart) {
    if (dart.segment !== state.target) return { state, points: 0 };
    const points = dartScore(dart);
    const scores = state.scores.slice();
    scores[ctx.sideIndex] = scores[ctx.sideIndex]! + points;
    const hitsThisTurn = state.hitsThisTurn.includes(dart.multiplier)
      ? state.hitsThisTurn
      : [...state.hitsThisTurn, dart.multiplier];
    const next = { ...state, scores, hitsThisTurn };
    const win = state.options.shanghaiWins && hitsThisTurn.length === 3;
    return { state: next, points, win };
  },

  onRoundEnd(state, round) {
    if (round + 1 < state.options.rounds) return null;
    return { winners: topRanked(this.ranking(state)) };
  },

  ranking(state) {
    return rankBy(state.scores.length, (a, b) => state.scores[b]! - state.scores[a]!, (s) => state.scores[s]!);
  },
};
