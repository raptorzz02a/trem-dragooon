import type { GameConfig, RankEntry } from '../types';
import { rankBy, topRanked } from '../rules';

/** Tableau d'une valeur par côté. */
export const perSide = <T>(config: GameConfig, value: T): T[] => config.sides.map(() => value);

/** Copie un tableau en changeant une case. */
export function setAt<T>(items: readonly T[], index: number, value: T): T[] {
  const out = items.slice();
  out[index] = value;
  return out;
}

/** Classement « le plus haut gagne » sur un tableau de scores. */
export const rankHigh = (scores: number[]): RankEntry[] =>
  rankBy(
    scores.length,
    (a, b) => scores[b]! - scores[a]!,
    (s) => scores[s]!,
  );

/** Classement « le plus bas gagne ». */
export const rankLow = (scores: number[]): RankEntry[] =>
  rankBy(
    scores.length,
    (a, b) => scores[a]! - scores[b]!,
    (s) => scores[s]!,
  );

export const winnersOf = (ranking: RankEntry[]) => ({ winners: topRanked(ranking) });

/**
 * Classement des jeux à élimination : les survivants d'abord (selon `alive`), puis les éliminés,
 * le dernier tombé devant. `outOrder` : 0 = en vie, sinon rang de chute (1 = premier éliminé).
 */
export function rankSurvivors(outOrder: number[], value: (side: number) => number): RankEntry[] {
  return rankBy(
    outOrder.length,
    (a, b) => {
      const oa = outOrder[a]!,
        ob = outOrder[b]!;
      if ((oa === 0) !== (ob === 0)) return oa === 0 ? -1 : 1;
      if (oa !== ob) return ob - oa;
      return value(b) - value(a);
    },
    value,
  );
}

/** Nombre de côtés encore en jeu. */
export const aliveCount = (outOrder: number[]) => outOrder.filter((o) => o === 0).length;

/** Élimine un côté : il prend le prochain rang de chute. */
export function eliminate(outOrder: number[], side: number): number[] {
  const next = Math.max(0, ...outOrder) + 1;
  return setAt(outOrder, side, next);
}
