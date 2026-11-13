import { BULL, dartScore } from '../darts';
import { topRanked, type ModeRules } from '../rules';
import type { GameConfig } from '../types';
import { perSide, rankHigh, setAt } from './common';
import { hitsZone, NUMBERS, shuffle, singleValue, type Zone } from './zones';

export interface BermudaOptions {
  goal: 200 | 400 | 600;
  /** Cibles des manches, tirées au lancement sans répétition (même cible pour tous pendant la manche). */
  targets: Zone[];
}

/** Toutes les cibles possibles : double, triple, simple haut, simple bas de chaque numéro, Bull 25 et Bull 50. */
export function drawBermudaTargets(rng: () => number = Math.random): Zone[] {
  const all: Zone[] = [
    ...NUMBERS.flatMap((n) => (['D', 'T', 'SO', 'SI'] as const).map((ring) => ({ segment: n, ring }))),
    { segment: BULL, ring: 'S' },
    { segment: BULL, ring: 'D' },
  ];
  return shuffle(all, rng);
}

export interface BermudaState {
  goal: number;
  targets: Zone[];
  scores: number[];
  hits: number;
  /** Volées sans touche (« naufrages »). */
  wrecks: number[];
}

/**
 * Bermuda (règles de ju) : une zone tirée au sort par manche, jamais deux fois la même. Une touche rapporte la valeur
 * de la fléchette ; une volée sans touche retire la valeur simple de la cible. Le premier à l'objectif gagne
 * (on finit la manche).
 */
export const bermudaRules: ModeRules<BermudaState> = {
  init(config: GameConfig) {
    const o = config.options as BermudaOptions;
    return { goal: o.goal, targets: o.targets, scores: perSide(config, 0), hits: 0, wrecks: perSide(config, 0) };
  },
  onTurnStart: (s) => ({ ...s, hits: 0 }),
  applyDart(s, ctx, dart) {
    if (!hitsZone(s.targets[ctx.round]!, dart)) return { state: s, points: 0 };
    const points = dartScore(dart);
    return { state: { ...s, hits: s.hits + 1, scores: setAt(s.scores, ctx.sideIndex, s.scores[ctx.sideIndex]! + points) }, points };
  },
  onTurnEnd(s, ctx) {
    if (s.hits > 0) return s;
    const me = ctx.sideIndex;
    return {
      ...s,
      scores: setAt(s.scores, me, Math.max(0, s.scores[me]! - singleValue(s.targets[ctx.round]!))),
      wrecks: setAt(s.wrecks, me, s.wrecks[me]! + 1),
    };
  },
  onRoundEnd(s, round) {
    if (s.scores.some((v) => v >= s.goal) || round + 1 >= s.targets.length) return { winners: topRanked(rankHigh(s.scores)) };
    return null;
  },
  ranking: (s) => rankHigh(s.scores),
};
