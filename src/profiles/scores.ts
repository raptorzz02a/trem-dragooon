import type { GameMode, TurnRecord, X01Options } from '../game-engine/types';
import type { CricketState } from '../game-engine/modes/cricket';
import { MIN_RANKED_GAMES, playerGames, rankings, summary, x01VariantLabel, type PlayerGame, type RankingRow, type StatsFilter } from './stats';
import type { GameRecord, Profile } from './types';

// Statistiques de score par volée (avenant « statistiques joueurs avancées »).
// Elles ne reposent que sur ce qui est enregistré : les volées, leurs points et l'issue des parties.
// Une valeur incalculable vaut null (affichée « non disponible »), jamais 0.

/** Modes où une volée a une valeur chiffrée : points (301/501/701, Chiffre aléatoire) ou marques (Cricket). */
export type ScoredMode = Exclude<GameMode, 'clock'>;

export const isScoredMode = (mode: GameMode | undefined): mode is ScoredMode =>
  mode === 'x01' || mode === 'cricket' || mode === 'random';

/** Unité d'une volée, selon le mode. */
export const VOLLEY_UNIT: Record<ScoredMode, { one: string; many: string }> = {
  x01: { one: 'point', many: 'points' },
  random: { one: 'point', many: 'points' },
  cricket: { one: 'marque', many: 'marques' },
};

/** Valeur d'une volée : un bust vaut 0 au 301/501/701 ; au Cricket, on compte les marques. */
export function volleyValue(game: PlayerGame, turn: TurnRecord): number {
  const mode = game.state.config.mode;
  if (mode === 'cricket') {
    const targets = (game.state.mode as CricketState).targets;
    return turn.darts.reduce((n, d) => n + (targets.includes(d.dart.segment) ? d.dart.multiplier : 0), 0);
  }
  if (turn.outcome === 'bust') return 0;
  return turn.darts.reduce((n, d) => n + d.points, 0);
}

export interface Volley {
  value: number;
  endedAt: string;
  gameId: string;
}

export function volleys(games: PlayerGame[], mode: ScoredMode): Volley[] {
  return games
    .filter((g) => g.state.config.mode === mode)
    .flatMap((g) => g.turns.map((t) => ({ value: volleyValue(g, t), endedAt: g.endedAt, gameId: g.record.id })));
}

export interface Bin {
  from: number;
  to: number;
  count: number;
  /** Part des volées dans cette tranche, en %. */
  share: number;
}

export interface ScoreProfile {
  volleys: number;
  games: number;
  average: number | null;
  /** Écart type des volées : plus il est petit, plus le joueur est régulier. */
  stdDev: number | null;
  best: number | null;
  /** Nombre de volées au niveau du record (record compris). */
  bestCount: number;
  /** Part des volées au moins égales à chaque seuil, en %. */
  thresholds: { threshold: number; count: number; share: number | null }[];
  histogram: Bin[];
}

/** Bornes des tranches de l'histogramme : 0–20, 21–40, 41–60… jusqu'au maximum possible du mode. */
export function histogramBins(mode: ScoredMode, step: number): { from: number; to: number }[] {
  // Au Cricket, une volée vaut de 0 à 9 marques : une tranche par valeur.
  if (mode === 'cricket') return Array.from({ length: 10 }, (_, i) => ({ from: i, to: i }));
  const max = 180;
  const bins: { from: number; to: number }[] = [];
  for (let from = 0, to = step; from <= max; from = to + 1, to += step) bins.push({ from, to: Math.min(to, max) });
  return bins;
}

export function scoreProfile(games: PlayerGame[], mode: ScoredMode, thresholds: number[], step: number): ScoreProfile {
  const list = volleys(games, mode).map((v) => v.value);
  const n = list.length;
  const average = n ? list.reduce((a, b) => a + b, 0) / n : null;
  const stdDev = n && average !== null ? Math.sqrt(list.reduce((a, v) => a + (v - average) ** 2, 0) / n) : null;
  const best = n ? Math.max(...list) : null;
  return {
    volleys: n,
    games: new Set(games.filter((g) => g.state.config.mode === mode).map((g) => g.record.id)).size,
    average,
    stdDev,
    best,
    bestCount: best === null ? 0 : list.filter((v) => v === best).length,
    thresholds: thresholds.map((threshold) => {
      const count = list.filter((v) => v >= threshold).length;
      return { threshold, count, share: n ? (100 * count) / n : null };
    }),
    histogram: histogramBins(mode, step).map(({ from, to }) => {
      const count = list.filter((v) => v >= from && v <= to).length;
      return { from, to, count, share: n ? (100 * count) / n : 0 };
    }),
  };
}

export type Granularity = 'week' | 'month' | 'year';

/** Début de la période (semaine du lundi, mois, année) qui contient la date, en heure locale. */
export function periodStart(iso: string, granularity: Granularity): Date {
  const d = new Date(iso);
  if (granularity === 'year') return new Date(d.getFullYear(), 0, 1);
  if (granularity === 'month') return new Date(d.getFullYear(), d.getMonth(), 1);
  const day = (d.getDay() + 6) % 7; // lundi = 0
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - day);
}

export interface ProgressionPoint {
  start: Date;
  games: number;
  volleys: number;
  average: number;
}

/** Moyenne par volée de chaque semaine, mois ou année où le joueur a joué, dans l'ordre chronologique. */
export function progression(games: PlayerGame[], mode: ScoredMode, granularity: Granularity): ProgressionPoint[] {
  const buckets = new Map<number, { start: Date; games: Set<string>; values: number[] }>();
  for (const v of volleys(games, mode)) {
    const start = periodStart(v.endedAt, granularity);
    const b = buckets.get(start.getTime()) ?? { start, games: new Set<string>(), values: [] };
    b.games.add(v.gameId);
    b.values.push(v.value);
    buckets.set(start.getTime(), b);
  }
  return [...buckets.values()]
    .sort((a, b) => a.start.getTime() - b.start.getTime())
    .map((b) => ({
      start: b.start,
      games: b.games.size,
      volleys: b.values.length,
      average: b.values.reduce((x, y) => x + y, 0) / b.values.length,
    }));
}

export interface PeriodFigures {
  from: string;
  to: string;
  games: number;
  wins: number;
  winRate: number | null;
  volleys: number;
  average: number | null;
  best: number | null;
}

export interface PeriodComparison {
  current: PeriodFigures;
  previous: PeriodFigures;
  /** Écart de moyenne entre les deux périodes, en valeur et en %. null si une des deux est vide. */
  averageDelta: number | null;
  averageDeltaPct: number | null;
}

function periodFigures(records: GameRecord[], playerId: string, filter: StatsFilter, mode: ScoredMode | undefined): PeriodFigures {
  const games = playerGames(records, playerId, filter);
  const s = summary(games);
  const p = mode ? scoreProfile(games, mode, [], 1000) : null;
  return {
    from: filter.from!,
    to: filter.to!,
    games: s.played,
    wins: s.wins,
    winRate: s.winRate,
    volleys: p?.volleys ?? 0,
    average: p?.average ?? null,
    best: p?.best ?? null,
  };
}

/** Compare [from, to] à la période de même durée qui la précède. */
export function comparePeriods(
  records: GameRecord[],
  playerId: string,
  filter: StatsFilter & { from: string; to: string },
): PeriodComparison {
  const mode = isScoredMode(filter.mode) ? filter.mode : undefined;
  const length = Date.parse(filter.to) - Date.parse(filter.from);
  const prevTo = new Date(Date.parse(filter.from) - 1).toISOString();
  const prevFrom = new Date(Date.parse(filter.from) - 1 - length).toISOString();
  const current = periodFigures(records, playerId, filter, mode);
  const previous = periodFigures(records, playerId, { ...filter, from: prevFrom, to: prevTo }, mode);
  const averageDelta = current.average !== null && previous.average !== null ? current.average - previous.average : null;
  return {
    current,
    previous,
    averageDelta,
    averageDeltaPct: averageDelta !== null && previous.average ? (100 * averageDelta) / previous.average : null,
  };
}

export interface X01Closure {
  variant: string;
  /** Parties gagnées en individuel : la clôture d'une partie en équipe ne dépend pas que du joueur. */
  wins: number;
  avgVolleys: number | null;
  avgDarts: number | null;
  bestDarts: number | null;
}

/** Nombre de volées et de fléchettes pour finir une partie de 301/501/701, par variante. */
export function x01Closure(games: PlayerGame[]): X01Closure[] {
  const byVariant = new Map<string, PlayerGame[]>();
  for (const g of games) {
    if (g.state.config.mode !== 'x01') continue;
    const key = x01VariantLabel(g.state.config.options as X01Options);
    byVariant.set(key, [...(byVariant.get(key) ?? []), g]);
  }
  return [...byVariant.entries()].map(([variant, list]) => {
    const won = list.filter((g) => g.won && !g.state.config.teamMode);
    const darts = won.map((g) => g.turns.reduce((n, t) => n + t.darts.length, 0));
    const turns = won.map((g) => g.turns.length);
    const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
    return { variant, wins: won.length, avgVolleys: avg(turns), avgDarts: avg(darts), bestDarts: darts.length ? Math.min(...darts) : null };
  });
}

export interface ScoreRecords {
  bestVolley: { value: number; endedAt: string } | null;
  /** Meilleure moyenne par volée sur une partie (au moins 3 volées, pour écarter les parties trop courtes). */
  bestGameAverage: { value: number; endedAt: string; volleys: number } | null;
}

export const MIN_VOLLEYS_FOR_GAME_RECORD = 3;

export function scoreRecords(games: PlayerGame[], mode: ScoredMode): ScoreRecords {
  let bestVolley: ScoreRecords['bestVolley'] = null;
  let bestGameAverage: ScoreRecords['bestGameAverage'] = null;
  for (const g of games) {
    if (g.state.config.mode !== mode) continue;
    const values = g.turns.map((t) => volleyValue(g, t));
    for (const v of values) if (!bestVolley || v > bestVolley.value) bestVolley = { value: v, endedAt: g.endedAt };
    if (values.length >= MIN_VOLLEYS_FOR_GAME_RECORD) {
      const avg = values.reduce((a, b) => a + b, 0) / values.length;
      if (!bestGameAverage || avg > bestGameAverage.value) bestGameAverage = { value: avg, endedAt: g.endedAt, volleys: values.length };
    }
  }
  return { bestVolley, bestGameAverage };
}

export type RankingSort = 'winRate' | 'average' | 'bestVolley' | 'progression';

export interface ScoreRankingRow extends RankingRow {
  average: number | null;
  bestVolley: number | null;
  /** Écart de moyenne avec la période précédente de même durée (null sans période ou sans parties avant). */
  progression: number | null;
}

/**
 * Classements de l'avenant : par victoires (taux puis nombre), moyenne par volée, record de volée ou progression.
 * Les trois derniers n'ont de sens que pour un mode à score ; un joueur sans valeur est rangé à la fin.
 */
export function scoreRankings(
  records: GameRecord[],
  profiles: Profile[],
  filter: StatsFilter,
  sortBy: RankingSort,
  minGames = MIN_RANKED_GAMES,
): { ranked: ScoreRankingRow[]; unranked: ScoreRankingRow[] } {
  const mode = isScoredMode(filter.mode) ? filter.mode : undefined;
  const enrich = (r: RankingRow): ScoreRankingRow => {
    const games = playerGames(records, r.playerId, filter).filter((g) => g.competitive);
    const p = mode ? scoreProfile(games, mode, [], 1000) : null;
    let progression: number | null = null;
    if (mode && filter.from) {
      const to = filter.to ?? new Date().toISOString();
      progression = comparePeriods(records, r.playerId, { ...filter, from: filter.from, to }).averageDelta;
    }
    return { ...r, average: p?.average ?? null, bestVolley: p?.best ?? null, progression };
  };
  const base = rankings(records, profiles, filter, minGames);
  const value = (r: ScoreRankingRow): number | null =>
    sortBy === 'winRate' ? r.winRate : sortBy === 'average' ? r.average : sortBy === 'bestVolley' ? r.bestVolley : r.progression;
  const order = (a: ScoreRankingRow, b: ScoreRankingRow) => {
    const va = value(a), vb = value(b);
    if (va === null || vb === null) return va === null && vb === null ? a.name.localeCompare(b.name) : va === null ? 1 : -1;
    return vb - va || b.wins - a.wins || a.name.localeCompare(b.name);
  };
  return { ranked: base.ranked.map(enrich).sort(order), unranked: base.unranked.map(enrich).sort(order) };
}
