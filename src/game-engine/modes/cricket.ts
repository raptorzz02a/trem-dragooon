import { BULL } from '../darts';
import { rankBy, topRanked, type ModeRules } from '../rules';
import type { CricketOptions } from '../types';

export const CRICKET_NUMBERS = [20, 19, 18, 17, 16, 15] as const;

export interface CricketState {
  options: CricketOptions;
  /** Numéros à fermer, dans l'ordre d'affichage. */
  targets: number[];
  /** marks[côté][indice du numéro], plafonné à 3. */
  marks: number[][];
  points: number[];
  /** Total des marques réellement touchées (y compris celles au-delà de 3), pour les départages et le MPR. */
  totalMarks: number[];
}

export function isClosed(state: CricketState, side: number, targetIndex: number): boolean {
  return state.marks[side]![targetIndex]! >= 3;
}

export function hasClosedAll(state: CricketState, side: number): boolean {
  return state.marks[side]!.every((m) => m >= 3);
}

function compareSides(state: CricketState, a: number, b: number): number {
  const byPoints =
    state.options.variant === 'cutthroat'
      ? state.points[a]! - state.points[b]!
      : state.points[b]! - state.points[a]!;
  return byPoints || state.totalMarks[b]! - state.totalMarks[a]!;
}

export const cricketRules: ModeRules<CricketState> = {
  init(config) {
    const options = config.options as CricketOptions;
    const targets: number[] = [...CRICKET_NUMBERS, ...(options.bull ? [BULL] : [])];
    const n = config.sides.length;
    return {
      options,
      targets,
      marks: Array.from({ length: n }, () => targets.map(() => 0)),
      points: Array(n).fill(0),
      totalMarks: Array(n).fill(0),
    };
  },

  applyDart(state, ctx, dart) {
    const t = state.targets.indexOf(dart.segment);
    if (t < 0) return { state, points: 0 };

    const me = ctx.sideIndex;
    const hits = dart.multiplier; // Bull 25 = 1 marque, Bull 50 = 2 marques
    const already = state.marks[me]![t]!;
    const extra = Math.max(0, already + hits - 3);
    const value = state.targets[t]!;

    const marks = state.marks.map((row) => row.slice());
    marks[me]![t] = Math.min(3, already + hits);
    const points = state.points.slice();
    const totalMarks = state.totalMarks.slice();
    totalMarks[me] = totalMarks[me]! + hits;

    // Les marques en trop rapportent tant qu'au moins un adversaire n'a pas fermé le numéro.
    const open = state.marks.map((_, s) => s).filter((s) => s !== me && state.marks[s]![t]! < 3);
    let scored = 0;
    if (extra > 0 && open.length > 0) {
      scored = extra * value;
      if (state.options.variant === 'cutthroat') {
        for (const s of open) points[s] = points[s]! + scored;
      } else {
        points[me] = points[me]! + scored;
      }
    }

    const next: CricketState = { ...state, marks, points, totalMarks };
    return { state: next, points: scored, win: isWinner(next, me) };
  },

  onRoundEnd(state, round) {
    if (round + 1 < state.options.maxRounds) return null;
    return { winners: topRanked(this.ranking(state)) };
  },

  ranking(state) {
    return rankBy(state.points.length, (a, b) => compareSides(state, a, b), (s) => state.points[s]!);
  },
};

/** Tout fermé, et score au moins égal (standard) ou au plus égal (cut-throat) à chaque adversaire. */
function isWinner(state: CricketState, side: number): boolean {
  if (!hasClosedAll(state, side)) return false;
  const mine = state.points[side]!;
  return state.points.every((p, s) =>
    s === side ? true : state.options.variant === 'cutthroat' ? mine <= p : mine >= p,
  );
}
