import { dartScore } from '../darts';
import { topRanked, type ModeRules } from '../rules';
import type { GameConfig } from '../types';
import { perSide, rankLow, setAt } from './common';

export interface LowScoreOptions {
  rounds: 5 | 10;
}

/** Fléchette hors cible : +50 (choix de ju). */
export const LOW_MISS = 50;

export interface LowScoreState {
  rounds: number;
  scores: number[];
  misses: number[];
}

export const lowScoreRules: ModeRules<LowScoreState> = {
  init(config: GameConfig) {
    return { rounds: (config.options as LowScoreOptions).rounds, scores: perSide(config, 0), misses: perSide(config, 0) };
  },
  applyDart(s, ctx, dart) {
    const me = ctx.sideIndex;
    const miss = dart.segment === 0;
    const points = miss ? LOW_MISS : dartScore(dart);
    return {
      state: {
        ...s,
        scores: setAt(s.scores, me, s.scores[me]! + points),
        misses: miss ? setAt(s.misses, me, s.misses[me]! + 1) : s.misses,
      },
      points,
    };
  },
  onRoundEnd(s, round) {
    return round + 1 >= s.rounds ? { winners: topRanked(rankLow(s.scores)) } : null;
  },
  ranking: (s) => rankLow(s.scores),
};
