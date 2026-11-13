import { BULL } from '../darts';
import { topRanked, type ModeRules } from '../rules';
import type { GameConfig } from '../types';
import { perSide, rankHigh, setAt } from './common';
import { hitsZone, NUMBERS, pick, type Zone } from './zones';

export interface OneDartOptions {
  rounds: 10 | 20 | 30;
  /** Cible de chaque tour, imposée par la borne (même cible pour tous pendant le tour). */
  targets: Zone[];
}

/** Barème (choix de ju) : simple 1, double 2, triple 3, Bull 25 : 2, Bull 50 : 4. */
export function oneDartValue(z: Zone): number {
  if (z.segment === BULL) return z.ring === 'D' ? 4 : 2;
  return z.ring === 'D' ? 2 : z.ring === 'T' ? 3 : 1;
}

/** Tirage : un numéro et une zone (simple, double, triple), le Bull de temps en temps. */
export function drawOneDartTargets(count: number, rng: () => number = Math.random): Zone[] {
  return Array.from({ length: count }, (): Zone => {
    if (rng() < 0.1) return { segment: BULL, ring: rng() < 0.5 ? 'S' : 'D' };
    return { segment: pick(NUMBERS, rng), ring: pick(['S', 'D', 'T'] as const, rng) };
  });
}

export interface OneDartState {
  rounds: number;
  targets: Zone[];
  scores: number[];
  hits: number[];
}

export const oneDartRules: ModeRules<OneDartState> = {
  init(config: GameConfig) {
    const o = config.options as OneDartOptions;
    return { rounds: o.rounds, targets: o.targets, scores: perSide(config, 0), hits: perSide(config, 0) };
  },
  applyDart(s, ctx, dart) {
    const z = s.targets[ctx.round]!;
    const me = ctx.sideIndex;
    if (!hitsZone(z, dart)) return { state: s, points: 0, endTurn: true };
    const v = oneDartValue(z);
    return {
      state: { ...s, scores: setAt(s.scores, me, s.scores[me]! + v), hits: setAt(s.hits, me, s.hits[me]! + 1) },
      points: v,
      endTurn: true,
    };
  },
  onRoundEnd(s, round) {
    return round + 1 >= s.rounds ? { winners: topRanked(rankHigh(s.scores)) } : null;
  },
  ranking: (s) => rankHigh(s.scores),
};
