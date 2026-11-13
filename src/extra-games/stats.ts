import { computeState } from '../game-engine/engine';
import type { ExtraMode } from '../game-engine/types';
import type { PlayerGame, StatsFilter } from '../profiles/stats';
import type { GameRecord, Profile } from '../profiles/types';
import { EXTRA_GAMES, extraGame, isExtraMode } from './catalog';

// Statistiques des « Autres jeux » : strictement séparées des statistiques classiques (leurs parties n'entrent dans
// aucun calcul des modes de base, seules leurs fléchettes s'ajoutent au total « Fléchettes lancées »).

export interface ExtraFilter extends Omit<StatsFilter, 'mode'> {
  mode?: ExtraMode;
}

const endOf = (r: GameRecord) => r.session.endedAt ?? r.session.createdAt;

/** Parties terminées des autres jeux vues depuis un joueur, de la plus récente à la plus ancienne. */
export function extraPlayerGames(records: GameRecord[], playerId: string, filter: ExtraFilter = {}): PlayerGame[] {
  const out: PlayerGame[] = [];
  for (const record of records) {
    const { session } = record;
    if (session.status !== 'finished') continue;
    const { config } = session;
    if (!isExtraMode(config.mode)) continue;
    if (filter.mode && config.mode !== filter.mode) continue;
    if (filter.format === 'solo' && config.teamMode) continue;
    if (filter.format === 'team' && !config.teamMode) continue;
    const endedAt = endOf(record);
    if (filter.from && endedAt < filter.from) continue;
    if (filter.to && endedAt > filter.to) continue;
    const sideIndex = config.sides.findIndex((s) => s.playerIds.includes(playerId));
    if (sideIndex < 0) continue;
    const state = computeState(config, session.events);
    out.push({
      record,
      state,
      sideIndex,
      turns: state.turns.filter((t) => t.playerId === playerId),
      won: state.winners.includes(sideIndex),
      competitive: true,
      endedAt,
      durationMs: session.startedAt && session.endedAt ? Date.parse(session.endedAt) - Date.parse(session.startedAt) : null,
    });
  }
  return out.sort((a, b) => (a.endedAt < b.endedAt ? 1 : -1));
}

export interface ExtraSummary {
  played: number;
  wins: number;
  losses: number;
  winRate: number | null;
  darts: number;
  /** Statistique propre au jeu (null si plusieurs jeux sont mélangés). */
  best: number | null;
  average: number | null;
  /** Valeur de la statistique propre, partie par partie, de la plus ancienne à la plus récente. */
  series: { endedAt: string; value: number }[];
  /** Écart entre la moyenne des 5 dernières parties et celle des 5 précédentes. */
  progression: number | null;
}

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

export function extraSummary(games: PlayerGame[], mode?: ExtraMode): ExtraSummary {
  const wins = games.filter((g) => g.won).length;
  const def = mode ? extraGame(mode) : null;
  const series = def
    ? games
        .map((g) => ({
          endedAt: g.endedAt,
          value: def.score.of(g.state, g.sideIndex),
        }))
        .filter((p): p is { endedAt: string; value: number } => p.value !== null)
        .reverse()
    : [];
  const values = series.map((p) => p.value);
  const pick = def?.score.better === 'low' ? Math.min : Math.max;
  const last = mean(values.slice(-5));
  const before = mean(values.slice(-10, -5));
  return {
    played: games.length,
    wins,
    losses: games.length - wins,
    winRate: games.length ? (100 * wins) / games.length : null,
    darts: games.reduce((n, g) => n + g.turns.reduce((m, t) => m + t.darts.length, 0), 0),
    best: values.length ? pick(...values) : null,
    average: mean(values),
    series,
    progression: last !== null && before !== null ? last - before : null,
  };
}

/** Jeux joués par le joueur, du plus joué au moins joué. */
export function playedExtraModes(games: PlayerGame[]): ExtraMode[] {
  return EXTRA_GAMES.map((g) => ({
    id: g.id,
    n: games.filter((x) => x.state.config.mode === g.id).length,
  }))
    .filter((x) => x.n > 0)
    .sort((a, b) => b.n - a.n)
    .map((x) => x.id);
}

export interface ExtraRankingRow {
  playerId: string;
  name: string;
  games: number;
  wins: number;
  winRate: number;
  best: number | null;
  average: number | null;
}

/** Classement d'un des autres jeux : taux de victoire, puis victoires, puis statistique propre. */
export function extraRankings(
  records: GameRecord[],
  profiles: Profile[],
  filter: ExtraFilter & { mode: ExtraMode },
  minGames: number,
): { ranked: ExtraRankingRow[]; unranked: ExtraRankingRow[] } {
  const def = extraGame(filter.mode);
  const rows: ExtraRankingRow[] = [];
  for (const p of profiles) {
    if (p.deleted) continue;
    const games = extraPlayerGames(records, p.id, filter);
    if (games.length === 0) continue;
    const s = extraSummary(games, filter.mode);
    rows.push({
      playerId: p.id,
      name: p.name,
      games: s.played,
      wins: s.wins,
      winRate: s.winRate ?? 0,
      best: s.best,
      average: s.average,
    });
  }
  const sign = def.score.better === 'low' ? -1 : 1;
  rows.sort(
    (a, b) =>
      b.winRate - a.winRate ||
      b.wins - a.wins ||
      sign * ((b.best ?? -Infinity * sign) - (a.best ?? -Infinity * sign)) ||
      a.name.localeCompare(b.name),
  );
  return {
    ranked: rows.filter((r) => r.games >= minGames),
    unranked: rows.filter((r) => r.games < minGames),
  };
}
