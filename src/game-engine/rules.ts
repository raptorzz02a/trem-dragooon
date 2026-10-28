import type { Dart } from './darts';
import type { GameConfig, RankEntry } from './types';

export interface TurnContext {
  round: number;
  sideIndex: number;
  /** Fléchettes déjà lancées dans la volée, avant celle-ci. */
  dartIndex: number;
}

export interface DartResult<S> {
  state: S;
  points: number;
  /** La volée est annulée : retour à l'état du début de volée, fléchettes restantes consommées. */
  bust?: boolean;
  /** Victoire immédiate du côté actif. */
  win?: boolean;
  /** La volée s'arrête là (ex. parcours de l'Horloge terminé). */
  endTurn?: boolean;
}

export interface RoundEnd {
  winners: number[];
}

/** Règles d'un mode. Toutes les fonctions sont pures : elles ne modifient pas l'état reçu. */
export interface ModeRules<S> {
  init(config: GameConfig): S;
  onTurnStart?(state: S, ctx: Omit<TurnContext, 'dartIndex'>): S;
  applyDart(state: S, ctx: TurnContext, dart: Dart): DartResult<S>;
  /** Appelé quand tous les côtés ont joué la manche. Renvoie les gagnants si la partie s'arrête. */
  onRoundEnd(state: S, round: number): RoundEnd | null;
  /** Classement courant, du meilleur au moins bon. */
  ranking(state: S): RankEntry[];
}

/** Attribue les rangs à partir d'un tri, les ex aequo partagent le même rang. */
export function rankBy(
  count: number,
  compare: (a: number, b: number) => number,
  value: (side: number) => number,
): RankEntry[] {
  const order = Array.from({ length: count }, (_, i) => i).sort((a, b) => compare(a, b) || a - b);
  const entries: RankEntry[] = [];
  order.forEach((sideIndex, pos) => {
    const prev = entries[pos - 1];
    const tied = prev !== undefined && compare(prev.sideIndex, sideIndex) === 0;
    entries.push({ sideIndex, rank: tied ? prev.rank : pos + 1, value: value(sideIndex) });
  });
  return entries;
}

export function topRanked(ranking: RankEntry[]): number[] {
  return ranking.filter((r) => r.rank === 1).map((r) => r.sideIndex);
}
