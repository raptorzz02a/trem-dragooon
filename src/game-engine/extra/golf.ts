import type { Dart } from '../darts';
import { topRanked, type ModeRules } from '../rules';
import type { GameConfig } from '../types';
import { perSide, rankLow, setAt } from './common';

export interface GolfOptions {
  holes: 9 | 18;
}

export const GOLF_MISS = 4;

export interface GolfState {
  holes: number;
  /** Coups de chaque trou joué, par côté. */
  cards: number[][];
  /** Meilleur coup (le plus petit) de la volée en cours (null : aucune fléchette). */
  best: number | null;
}

/** Coups d'une fléchette sur le trou : triple 1, double 2, simple 3, à côté 4. */
export const golfStrokes = (dart: Dart, hole: number) => (dart.segment === hole ? 4 - dart.multiplier : GOLF_MISS);

export const golfTotal = (s: GolfState, side: number) => s.cards[side]!.reduce((a, b) => a + b, 0);

/** Golf : la meilleure fléchette de la volée compte (pratique avec la caméra). Le plus petit total gagne. */
export const golfRules: ModeRules<GolfState> = {
  init(config: GameConfig) {
    return { holes: (config.options as GolfOptions).holes, cards: perSide(config, [] as number[]), best: null };
  },
  onTurnStart: (s) => ({ ...s, best: null }),
  applyDart(s, ctx, dart) {
    const strokes = golfStrokes(dart, ctx.round + 1);
    // Un triple (1 coup) ne peut pas être amélioré : le trou s'arrête là.
    const best = Math.min(s.best ?? GOLF_MISS, strokes);
    return { state: { ...s, best }, points: strokes, endTurn: best === 1 };
  },
  onTurnEnd(s, ctx) {
    return { ...s, cards: setAt(s.cards, ctx.sideIndex, [...s.cards[ctx.sideIndex]!, s.best ?? GOLF_MISS]) };
  },
  onRoundEnd(s, round) {
    return round + 1 >= s.holes ? { winners: topRanked(this.ranking(s)) } : null;
  },
  ranking: (s) => rankLow(s.cards.map((_, i) => golfTotal(s, i))),
};
