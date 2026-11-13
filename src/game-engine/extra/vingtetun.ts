import { dartScore } from '../darts';
import { rankBy, type ModeRules } from '../rules';
import type { GameConfig } from '../types';
import { perSide, setAt } from './common';

export interface VingtEtUnOptions {
  /** Nombre de manches maximum (0 : pas de limite). */
  limit: 0 | 10 | 20;
}

export const TWENTY_ONE = 21;
const HARD_LIMIT = 50;

export interface VingtEtUnState {
  limit: number;
  scores: number[];
  busts: number[];
}

export const vingtEtUnRules: ModeRules<VingtEtUnState> = {
  init(config: GameConfig) {
    return { limit: (config.options as VingtEtUnOptions).limit, scores: perSide(config, 0), busts: perSide(config, 0) };
  },
  applyDart(s, ctx, dart) {
    const me = ctx.sideIndex;
    const points = dartScore(dart);
    const next = s.scores[me]! + points;
    if (next > TWENTY_ONE) return { state: { ...s, busts: setAt(s.busts, me, s.busts[me]! + 1) }, points, bust: true };
    return { state: { ...s, scores: setAt(s.scores, me, next) }, points, endTurn: next === TWENTY_ONE };
  },
  skipSide: (s, side) => s.scores[side] === TWENTY_ONE,
  onRoundEnd(s, round) {
    const done = s.scores.map((v, i) => (v === TWENTY_ONE ? i : -1)).filter((i) => i >= 0);
    if (done.length) return { winners: done };
    const limit = s.limit || HARD_LIMIT;
    if (round + 1 < limit) return null;
    const best = Math.max(...s.scores);
    return { winners: s.scores.map((v, i) => (v === best ? i : -1)).filter((i) => i >= 0) };
  },
  ranking: (s) =>
    rankBy(
      s.scores.length,
      (a, b) => s.scores[b]! - s.scores[a]!,
      (i) => s.scores[i]!,
    ),
};
