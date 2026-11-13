import { dartScore } from '../darts';
import { rankBy, topRanked, type ModeRules } from '../rules';
import type { HighScoreOptions } from '../types';

export interface HighScoreState {
  rounds: number;
  scores: number[];
  darts: number[];
}

/** High Score : chaque fléchette rapporte sa valeur ; le plus gros total après les manches gagne. */
export const highScoreRules: ModeRules<HighScoreState> = {
  init(config) {
    const { rounds } = config.options as HighScoreOptions;
    return {
      rounds,
      scores: config.sides.map(() => 0),
      darts: config.sides.map(() => 0),
    };
  },

  applyDart(state, ctx, dart) {
    const points = dartScore(dart);
    const scores = state.scores.slice();
    const darts = state.darts.slice();
    scores[ctx.sideIndex] = scores[ctx.sideIndex]! + points;
    darts[ctx.sideIndex] = darts[ctx.sideIndex]! + 1;
    return { state: { ...state, scores, darts }, points };
  },

  onRoundEnd(state, round) {
    return round + 1 >= state.rounds ? { winners: topRanked(this.ranking(state)) } : null;
  },

  ranking(state) {
    return rankBy(
      state.scores.length,
      (a, b) => state.scores[b]! - state.scores[a]!,
      (s) => state.scores[s]!,
    );
  },
};
