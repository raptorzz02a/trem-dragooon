import { dartScore, isDouble } from '../darts';
import { rankBy, topRanked, type ModeRules } from '../rules';
import type { X01Options } from '../types';

export interface X01State {
  options: X01Options;
  remaining: number[];
}

export const x01Rules: ModeRules<X01State> = {
  init(config) {
    const options = config.options as X01Options;
    return { options, remaining: config.sides.map(() => options.startScore) };
  },

  applyDart(state, ctx, dart) {
    const before = state.remaining[ctx.sideIndex]!;
    const points = dartScore(dart);
    const after = before - points;
    const doubleOut = state.options.out === 'double';

    if (after < 0) return { state, points, bust: true };
    if (doubleOut && after === 1) return { state, points, bust: true };
    if (after === 0 && doubleOut && !isDouble(dart)) return { state, points, bust: true };

    const remaining = state.remaining.slice();
    remaining[ctx.sideIndex] = after;
    return { state: { ...state, remaining }, points, win: after === 0 };
  },

  onRoundEnd(state, round) {
    const max = state.options.maxRounds;
    if (max === null || round + 1 < max) return null;
    // Limite atteinte : le plus petit reste gagne.
    return { winners: topRanked(this.ranking(state)) };
  },

  ranking(state) {
    return rankBy(
      state.remaining.length,
      (a, b) => state.remaining[a]! - state.remaining[b]!,
      (s) => state.remaining[s]!,
    );
  },
};
