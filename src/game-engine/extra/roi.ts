import { BULL } from '../darts';
import { topRanked, type ModeRules } from '../rules';
import type { GameConfig } from '../types';
import { perSide, rankHigh, setAt } from './common';
import { hitsZone, NUMBERS, pick, type Zone } from './zones';

export interface RoiOptions {
  rounds: 10 | 15;
  /** Cible royale de chaque manche (fixe, ou changée toutes les 3 manches), tirée au lancement. */
  targets: Zone[];
}

export function drawRoyalTargets(rounds: number, every3: boolean, rng: () => number = Math.random): Zone[] {
  const one = (): Zone => {
    const r = rng();
    if (r < 0.1) return { segment: BULL, ring: 'any' };
    return { segment: pick(NUMBERS, rng), ring: r < 0.45 ? 'any' : r < 0.8 ? 'D' : 'T' };
  };
  const fixed = one();
  const out: Zone[] = [];
  for (let r = 0; r < rounds; r++) out.push(!every3 ? fixed : r % 3 === 0 ? one() : out[r - 1]!);
  return out;
}

export interface RoiState {
  rounds: number;
  sides: number;
  targets: Zone[];
  /** Roi actuel (−1 : personne). */
  king: number;
  /** Manches terminées de suite avec la couronne. */
  streak: number;
  crowns: number[];
  /** Plus longue série, par côté. */
  best: number[];
  /** Couronnes prises (détrônements compris). */
  takes: number[];
}

/**
 * Le Roi de la Cible : toucher la cible royale donne la couronne. À la fin de chaque manche, le roi marque un point,
 * plus un bonus à partir de 3 manches de suite. Le plus de points gagne.
 */
export const roiRules: ModeRules<RoiState> = {
  init(config: GameConfig) {
    const o = config.options as RoiOptions;
    return {
      rounds: o.rounds,
      sides: config.sides.length,
      targets: o.targets,
      king: -1,
      streak: 0,
      crowns: perSide(config, 0),
      best: perSide(config, 0),
      takes: perSide(config, 0),
    };
  },
  applyDart(s, ctx, dart) {
    if (!hitsZone(s.targets[ctx.round]!, dart)) return { state: s, points: 0 };
    const me = ctx.sideIndex;
    if (s.king === me) return { state: s, points: 0, endTurn: true };
    return { state: { ...s, king: me, streak: 0, takes: setAt(s.takes, me, s.takes[me]! + 1) }, points: 1, endTurn: true };
  },
  onTurnEnd(s, ctx) {
    // Dernier tireur de la manche : le roi marque sa couronne.
    if (ctx.sideIndex !== s.sides - 1 || s.king < 0) return s;
    const streak = s.streak + 1;
    const gain = streak >= 3 ? 2 : 1;
    return {
      ...s,
      streak,
      crowns: setAt(s.crowns, s.king, s.crowns[s.king]! + gain),
      best: setAt(s.best, s.king, Math.max(s.best[s.king]!, streak)),
    };
  },
  onRoundEnd(s, round) {
    return round + 1 >= s.rounds ? { winners: topRanked(rankHigh(s.crowns)) } : null;
  },
  ranking: (s) => rankHigh(s.crowns),
};
