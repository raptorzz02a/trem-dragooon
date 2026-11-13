import { BULL, dartScore } from '../darts';
import { topRanked, type ModeRules } from '../rules';
import type { GameConfig } from '../types';
import { perSide, rankHigh, setAt } from './common';
import { hitsZone, NUMBERS, sameZone, shuffle, type Zone } from './zones';

export const CHEST_BONUSES = [60, 50, 40, 30, 20, 10] as const;

export interface CoffresOptions {
  rounds: 5 | 10 | 15;
  /** Zones cachées des 6 coffres (même ordre que CHEST_BONUSES), tirées au lancement. */
  chests: Zone[];
}

/** 6 zones différentes : doubles, triples, simples ou Bull. */
export function drawChests(rng: () => number = Math.random): Zone[] {
  const pool: Zone[] = [
    ...NUMBERS.flatMap((n) => (['S', 'D', 'T'] as const).map((ring) => ({ segment: n, ring }))),
    { segment: BULL, ring: 'S' },
    { segment: BULL, ring: 'D' },
  ];
  const out: Zone[] = [];
  for (const z of shuffle(pool, rng)) {
    if (out.length === CHEST_BONUSES.length) break;
    if (!out.some((o) => sameZone(o, z))) out.push(z);
  }
  return out;
}

export interface CoffresState {
  rounds: number;
  chests: Zone[];
  /** Qui a ouvert chaque coffre (null : encore fermé) et à quelle manche. */
  opened: ({ side: number; round: number } | null)[];
  scores: number[];
  bonus: number[];
}

/**
 * Les Coffres : chaque fléchette rapporte ses points, et 6 coffres (60 à 10 points) sont cachés sur des zones tirées
 * au sort. Le premier qui touche la zone d'un coffre l'ouvre et gagne son bonus ; un coffre ouvert ne rapporte plus.
 */
export const coffresRules: ModeRules<CoffresState> = {
  init(config: GameConfig) {
    const o = config.options as CoffresOptions;
    return { rounds: o.rounds, chests: o.chests, opened: o.chests.map(() => null), scores: perSide(config, 0), bonus: perSide(config, 0) };
  },
  applyDart(s, ctx, dart) {
    const me = ctx.sideIndex;
    let points = dartScore(dart);
    let { opened, bonus } = s;
    const i = s.chests.findIndex((z, k) => !s.opened[k] && hitsZone(z, dart));
    if (i >= 0) {
      points += CHEST_BONUSES[i]!;
      opened = setAt(opened, i, { side: me, round: ctx.round });
      bonus = setAt(bonus, me, bonus[me]! + CHEST_BONUSES[i]!);
    }
    return { state: { ...s, opened, bonus, scores: setAt(s.scores, me, s.scores[me]! + points) }, points };
  },
  onRoundEnd(s, round) {
    return round + 1 >= s.rounds ? { winners: topRanked(rankHigh(s.scores)) } : null;
  },
  ranking: (s) => rankHigh(s.scores),
};
