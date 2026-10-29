import { computeState } from '../game-engine/engine';
import { BULL, isDouble } from '../game-engine/darts';
import { targetOf } from '../game-engine/modes/random';
import { MODES } from '../game-setup/setup';
import type { GameMode, GameState, RandomOptions, TurnRecord, X01Options } from '../game-engine/types';
import type { CricketState } from '../game-engine/modes/cricket';
import type { ClockState } from '../game-engine/modes/clock';
import { isFinished as clockFinished } from '../game-engine/modes/clock';
import type { GameRecord, Profile } from './types';

// Toutes les statistiques sont recalculées à partir des parties archivées : rien n'est stocké en double.

export interface StatsFilter {
  mode?: GameMode;
  /** Bornes ISO incluses sur la date de fin de partie. */
  from?: string;
  to?: string;
  format?: 'all' | 'solo' | 'team';
}

/** Une partie vue depuis un joueur. */
export interface PlayerGame {
  record: GameRecord;
  state: GameState;
  sideIndex: number;
  turns: TurnRecord[];
  won: boolean;
  /** Partie terminée et hors entraînement : compte pour les victoires et les classements. */
  competitive: boolean;
  endedAt: string;
  durationMs: number | null;
}

const endOf = (r: GameRecord) => r.session.endedAt ?? r.session.createdAt;

export function playerGames(records: GameRecord[], playerId: string, filter: StatsFilter = {}): PlayerGame[] {
  const out: PlayerGame[] = [];
  for (const record of records) {
    const { session } = record;
    if (session.status !== 'finished') continue; // abandonnées et annulées : ni victoire ni défaite
    const { config } = session;
    if (!MODES.includes(config.mode)) continue; // jeu retiré (ancien Shanghai) : plus compté
    if (filter.mode && config.mode !== filter.mode) continue;
    if (filter.format === 'solo' && config.teamMode) continue;
    if (filter.format === 'team' && !config.teamMode) continue;
    const endedAt = endOf(record);
    if (filter.from && endedAt < filter.from) continue;
    if (filter.to && endedAt > filter.to) continue;
    const sideIndex = config.sides.findIndex((s) => s.playerIds.includes(playerId));
    if (sideIndex < 0) continue;
    const state = computeState(config, session.events);
    const durationMs =
      session.startedAt && session.endedAt ? Date.parse(session.endedAt) - Date.parse(session.startedAt) : null;
    out.push({
      record,
      state,
      sideIndex,
      turns: state.turns.filter((t) => t.playerId === playerId),
      won: state.winners.includes(sideIndex),
      competitive: !config.training,
      endedAt,
      durationMs,
    });
  }
  return out.sort((a, b) => (a.endedAt < b.endedAt ? 1 : -1));
}

export interface Summary {
  played: number;
  competitive: number;
  wins: number;
  losses: number;
  /** Victoires / parties terminées hors entraînement × 100, ou null sans partie. */
  winRate: number | null;
  soloWins: number;
  teamWins: number;
}

export function summary(games: PlayerGame[]): Summary {
  const comp = games.filter((g) => g.competitive);
  const wins = comp.filter((g) => g.won);
  return {
    played: games.length,
    competitive: comp.length,
    wins: wins.length,
    losses: comp.length - wins.length,
    winRate: comp.length ? (100 * wins.length) / comp.length : null,
    soloWins: wins.filter((g) => !g.state.config.teamMode).length,
    teamWins: wins.filter((g) => g.state.config.teamMode).length,
  };
}

const turnPoints = (t: TurnRecord) => (t.outcome === 'bust' ? 0 : t.darts.reduce((a, d) => a + d.points, 0));

export interface X01Stats {
  variant: string;
  games: number;
  volleys: number;
  darts: number;
  avgVolley: number | null;
  avgDart: number | null;
  bestVolley: number | null;
  bestCheckout: number | null;
  busts: number;
  over100: number;
  over140: number;
  max180: number;
  /** Fléchettes gagnantes / fléchettes lancées avec une finition possible en une fléchette (Double Out). */
  doubleRate: number | null;
}

export const x01VariantLabel = (o: X01Options) => `${o.startScore} · ${o.out === 'double' ? 'Double Out' : 'Sortie simple'}`;

/** Statistiques 301/501/701, séparées par variante car elles ne sont pas comparables entre elles. */
export function x01Stats(games: PlayerGame[]): X01Stats[] {
  const byVariant = new Map<string, PlayerGame[]>();
  for (const g of games) {
    if (g.state.config.mode !== 'x01') continue;
    const key = x01VariantLabel(g.state.config.options);
    byVariant.set(key, [...(byVariant.get(key) ?? []), g]);
  }
  return [...byVariant.entries()].map(([variant, list]) => {
    let volleys = 0, darts = 0, points = 0, busts = 0, over100 = 0, over140 = 0, max180 = 0;
    let attempts = 0, hits = 0;
    let bestVolley: number | null = null, bestCheckout: number | null = null;
    for (const g of list) {
      const options = g.state.config.options as X01Options;
      // On rejoue le reste du côté pour savoir, avant chaque fléchette, si une finition était possible.
      const remaining: number[] = g.state.config.sides.map(() => options.startScore as number);
      for (const t of g.state.turns) {
        const mine = g.turns.includes(t);
        let running = remaining[t.sideIndex]!;
        t.darts.forEach((d, i) => {
          if (mine && options.out === 'double' && ((running <= 40 && running % 2 === 0) || running === 50)) {
            attempts++;
            if (t.outcome === 'win' && i === t.darts.length - 1 && isDouble(d.dart)) hits++;
          }
          running -= d.points;
        });
        const total = turnPoints(t);
        if (t.outcome !== 'bust') remaining[t.sideIndex] = remaining[t.sideIndex]! - total;
        if (!mine) continue;
        volleys++;
        darts += t.darts.length;
        points += total;
        if (t.outcome === 'bust') busts++;
        else {
          bestVolley = Math.max(bestVolley ?? 0, total);
          if (total === 180) max180++;
          else if (total >= 140) over140++;
          else if (total >= 100) over100++;
        }
        if (t.outcome === 'win') bestCheckout = Math.max(bestCheckout ?? 0, total);
      }
    }
    return {
      variant,
      games: list.length,
      volleys,
      darts,
      avgVolley: volleys ? points / volleys : null,
      avgDart: darts ? points / darts : null,
      bestVolley,
      bestCheckout,
      busts,
      over100,
      over140,
      max180,
      doubleRate: attempts ? (100 * hits) / attempts : null,
    };
  });
}

export interface CricketStats {
  games: number;
  marks: number;
  /** Marques par volée (MPR), la statistique de référence au Cricket. */
  mpr: number | null;
  points: number;
  avgDurationMs: number | null;
}

export function cricketStats(games: PlayerGame[]): CricketStats {
  const list = games.filter((g) => g.state.config.mode === 'cricket');
  let marks = 0, volleys = 0, points = 0;
  for (const g of list) {
    const targets = (g.state.mode as CricketState).targets;
    for (const t of g.turns) {
      volleys++;
      for (const d of t.darts) {
        if (targets.includes(d.dart.segment)) marks += d.dart.multiplier;
        points += d.points;
      }
    }
  }
  return { games: list.length, marks, mpr: volleys ? marks / volleys : null, points, avgDurationMs: avgDuration(list) };
}

export interface ClockStats {
  games: number;
  completions: number;
  /** Meilleur parcours (en fléchettes), par variante. */
  best: { variant: string; darts: number }[];
  avgDurationMs: number | null;
}

export function clockStats(games: PlayerGame[]): ClockStats {
  const list = games.filter((g) => g.state.config.mode === 'clock');
  const best = new Map<string, number>();
  let completions = 0;
  for (const g of list) {
    const s = g.state.mode as ClockState;
    if (!clockFinished(s, g.sideIndex)) continue;
    completions++;
    const o = s.options;
    const variant = `${o.order === 'asc' ? '1→20' : o.order === 'desc' ? '20→1' : 'cadran'} · ${
      { any: 'toutes zones', double: 'doubles', triple: 'triples' }[o.required]
    } · Bull ${{ none: 'non', any: 'oui', both: '25 puis 50' }[o.bullFinish]}${o.advanceByMultiplier ? ' · avance selon zone' : ''}`;
    const darts = s.dartsUsed[g.sideIndex]!;
    best.set(variant, Math.min(best.get(variant) ?? Infinity, darts));
  }
  return {
    games: list.length,
    completions,
    best: [...best.entries()].map(([variant, darts]) => ({ variant, darts })),
    avgDurationMs: avgDuration(list),
  };
}

export interface RandomStats {
  games: number;
  bestScore: number | null;
  avgScore: number | null;
  bestVolley: number | null;
  /** Fléchettes sur le numéro tiré / fléchettes lancées × 100. */
  hitRate: number | null;
  /** Manches du Bull jouées et points pris sur le Bull. */
  bullRounds: number;
  bullPoints: number;
  avgDurationMs: number | null;
}

export function randomStats(games: PlayerGame[]): RandomStats {
  const list = games.filter((g) => g.state.config.mode === 'random');
  const scores = list.map((g) => (g.state.mode as { scores: number[] }).scores[g.sideIndex]!);
  const volleys = list.flatMap((g) => g.turns.map(turnPoints));
  const darts = list.flatMap((g) => g.turns.flatMap((t) => t.darts));
  const bullTurns = list.flatMap((g) =>
    g.turns.filter((t) => targetOf(g.state.config.options as RandomOptions, t.round) === BULL),
  );
  return {
    games: list.length,
    bestScore: scores.length ? Math.max(...scores) : null,
    avgScore: scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null,
    bestVolley: volleys.length ? Math.max(...volleys) : null,
    hitRate: darts.length ? (100 * darts.filter((d) => d.points > 0).length) / darts.length : null,
    bullRounds: bullTurns.length,
    bullPoints: bullTurns.reduce((a, t) => a + turnPoints(t), 0),
    avgDurationMs: avgDuration(list),
  };
}

function avgDuration(list: PlayerGame[]): number | null {
  const d = list.map((g) => g.durationMs).filter((x): x is number => x !== null);
  return d.length ? d.reduce((a, b) => a + b, 0) / d.length : null;
}

export interface FavouriteHit {
  segment: number;
  /** Part de ce numéro parmi les fléchettes de la même zone, en %. */
  share: number;
}

/** Triple et simple les plus touchés (hors Horloge, où la saisie ne dit pas quelle zone a été touchée). */
export function favouriteHits(games: PlayerGame[]): { triple: FavouriteHit | null; single: FavouriteHit | null } {
  const darts = games.filter((g) => g.state.config.mode !== 'clock').flatMap((g) => g.turns.flatMap((t) => t.darts));
  const top = (multiplier: number): FavouriteHit | null => {
    const counts = new Map<number, number>();
    let total = 0;
    for (const d of darts) {
      if (d.dart.multiplier !== multiplier || d.dart.segment === 0 || d.dart.segment === 25) continue;
      counts.set(d.dart.segment, (counts.get(d.dart.segment) ?? 0) + 1);
      total++;
    }
    let best: FavouriteHit | null = null;
    for (const [segment, n] of counts) if (!best || n > (best.share * total) / 100) best = { segment, share: (100 * n) / total };
    return best;
  };
  return { triple: top(3), single: top(1) };
}

export interface RankingRow {
  playerId: string;
  name: string;
  games: number;
  wins: number;
  winRate: number;
  /** Statistique clé du mode : moyenne (X01), MPR (Cricket), meilleur parcours (Horloge), meilleur score (Chiffre aléatoire). */
  key: number | null;
}

export const MIN_RANKED_GAMES = 5;

/**
 * Classement par taux de victoire, puis par nombre de victoires. Seules les parties terminées hors entraînement comptent.
 * Les joueurs qui ont moins de `minGames` parties sont listés à part.
 */
export function rankings(
  records: GameRecord[],
  profiles: Profile[],
  filter: StatsFilter = {},
  minGames = MIN_RANKED_GAMES,
): { ranked: RankingRow[]; unranked: RankingRow[] } {
  const rows: RankingRow[] = [];
  for (const p of profiles) {
    if (p.deleted) continue;
    const games = playerGames(records, p.id, filter).filter((g) => g.competitive);
    if (games.length === 0) continue;
    const s = summary(games);
    rows.push({ playerId: p.id, name: p.name, games: s.competitive, wins: s.wins, winRate: s.winRate ?? 0, key: keyStat(games, filter.mode) });
  }
  rows.sort((a, b) => b.winRate - a.winRate || b.wins - a.wins || a.name.localeCompare(b.name));
  return { ranked: rows.filter((r) => r.games >= minGames), unranked: rows.filter((r) => r.games < minGames) };
}

function keyStat(games: PlayerGame[], mode: GameMode | undefined): number | null {
  switch (mode) {
    case 'x01': {
      const all = x01Stats(games);
      const volleys = all.reduce((a, s) => a + s.volleys, 0);
      return volleys ? all.reduce((a, s) => a + (s.avgVolley ?? 0) * s.volleys, 0) / volleys : null;
    }
    case 'cricket':
      return cricketStats(games).mpr;
    case 'clock': {
      const best = clockStats(games).best.map((b) => b.darts);
      return best.length ? Math.min(...best) : null;
    }
    case 'random':
      return randomStats(games).bestScore;
    default:
      return null;
  }
}
