import { BULL, type Dart } from '../darts';
import { rankBy, topRanked, type ModeRules } from '../rules';
import type { GameConfig } from '../types';
import { perSide, setAt } from './common';

export interface BaseballOptions {
  /** Égalité en tête après 9 manches : manche supplémentaire au Bull. */
  tiebreak: boolean;
}

export const INNINGS = 9;

export interface BaseballState {
  tiebreak: boolean;
  /** Points de chaque manche jouée, par côté (la 10e est la manche au Bull). */
  innings: number[][];
  /** Points de la volée en cours. */
  gained: number;
}

export const baseballTotal = (s: BaseballState, side: number, upTo = Infinity) =>
  s.innings[side]!.slice(0, upTo).reduce((a, b) => a + b, 0);

/** Points d'une fléchette : simple 1, double 2, triple 3 sur le numéro de la manche ; Bull 25 = 1, 50 = 2 en prolongation. */
export function baseballPoints(dart: Dart, round: number): number {
  const target = round < INNINGS ? round + 1 : BULL;
  return dart.segment === target ? dart.multiplier : 0;
}

/** Côtés en tête après 9 manches (ceux qui jouent la manche au Bull). */
export function leadersAfterNine(s: BaseballState): number[] {
  const totals = s.innings.map((_, i) => baseballTotal(s, i, INNINGS));
  const best = Math.max(...totals);
  return totals.map((t, i) => (t === best ? i : -1)).filter((i) => i >= 0);
}

const inTiebreak = (s: BaseballState) => s.innings.every((inn) => inn.length >= INNINGS);

export const baseballRules: ModeRules<BaseballState> = {
  init(config: GameConfig) {
    return { tiebreak: (config.options as BaseballOptions).tiebreak, innings: perSide(config, [] as number[]), gained: 0 };
  },
  skipSide(state, side) {
    return inTiebreak(state) && !leadersAfterNine(state).includes(side);
  },
  onTurnStart(state) {
    return { ...state, gained: 0 };
  },
  applyDart(state, ctx, dart) {
    const points = baseballPoints(dart, ctx.round);
    return { state: { ...state, gained: state.gained + points }, points };
  },
  onTurnEnd(state, ctx) {
    return { ...state, innings: setAt(state.innings, ctx.sideIndex, [...state.innings[ctx.sideIndex]!, state.gained]) };
  },
  onRoundEnd(state, round) {
    if (round + 1 < INNINGS) return null;
    if (round + 1 === INNINGS && state.tiebreak && leadersAfterNine(state).length > 1) return null;
    return { winners: topRanked(this.ranking(state)) };
  },
  ranking(state) {
    const total = (i: number) => baseballTotal(state, i);
    return rankBy(state.innings.length, (a, b) => total(b) - total(a), total);
  },
};
