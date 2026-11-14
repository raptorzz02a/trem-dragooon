import { MIN_RANKED_GAMES, playerGames, rankings, summary, x01VariantLabel } from './stats';
export const isScoredMode = (mode) => mode === 'x01' || mode === 'cricket' || mode === 'random' || mode === 'training';
/** Unité d'une volée, selon le mode. */
export const VOLLEY_UNIT = {
    x01: { one: 'point', many: 'points' },
    random: { one: 'point', many: 'points' },
    training: { one: 'point', many: 'points' },
    cricket: { one: 'marque', many: 'marques' },
};
/** Valeur d'une volée : un bust vaut 0 au 301/501/701 ; au Cricket, on compte les marques. */
export function volleyValue(game, turn) {
    const mode = game.state.config.mode;
    if (mode === 'cricket') {
        const targets = game.state.mode.targets;
        return turn.darts.reduce((n, d) => n + (targets.includes(d.dart.segment) ? d.dart.multiplier : 0), 0);
    }
    if (turn.outcome === 'bust')
        return 0;
    return turn.darts.reduce((n, d) => n + d.points, 0);
}
export function volleys(games, mode) {
    return games
        .filter((g) => g.state.config.mode === mode)
        .flatMap((g) => g.turns.map((t) => ({ value: volleyValue(g, t), endedAt: g.endedAt, gameId: g.record.id })));
}
/** Bornes des tranches de l'histogramme : 0–20, 21–40, 41–60… jusqu'au maximum possible du mode. */
export function histogramBins(mode, step) {
    // Au Cricket, une volée vaut de 0 à 9 marques : une tranche par valeur.
    if (mode === 'cricket')
        return Array.from({ length: 10 }, (_, i) => ({ from: i, to: i }));
    const max = 180;
    const bins = [];
    for (let from = 0, to = step; from <= max; from = to + 1, to += step)
        bins.push({ from, to: Math.min(to, max) });
    return bins;
}
export function scoreProfile(games, mode, thresholds, step) {
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
/** Début de la période (semaine du lundi, mois, année) qui contient la date, en heure locale. */
export function periodStart(iso, granularity) {
    const d = new Date(iso);
    if (granularity === 'year')
        return new Date(d.getFullYear(), 0, 1);
    if (granularity === 'month')
        return new Date(d.getFullYear(), d.getMonth(), 1);
    const day = (d.getDay() + 6) % 7; // lundi = 0
    return new Date(d.getFullYear(), d.getMonth(), d.getDate() - day);
}
/** Moyenne par volée de chaque semaine, mois ou année où le joueur a joué, dans l'ordre chronologique. */
export function progression(games, mode, granularity) {
    const buckets = new Map();
    for (const v of volleys(games, mode)) {
        const start = periodStart(v.endedAt, granularity);
        const b = buckets.get(start.getTime()) ?? { start, games: new Set(), values: [] };
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
function periodFigures(records, playerId, filter, mode) {
    const games = playerGames(records, playerId, filter);
    const s = summary(games);
    const p = mode ? scoreProfile(games, mode, [], 1000) : null;
    return {
        from: filter.from,
        to: filter.to,
        games: s.played,
        wins: s.wins,
        winRate: s.winRate,
        volleys: p?.volleys ?? 0,
        average: p?.average ?? null,
        best: p?.best ?? null,
    };
}
/** Compare [from, to] à la période de même durée qui la précède. */
export function comparePeriods(records, playerId, filter) {
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
/** Nombre de volées et de fléchettes pour finir une partie de 301/501/701, par variante. */
export function x01Closure(games) {
    const byVariant = new Map();
    for (const g of games) {
        if (g.state.config.mode !== 'x01')
            continue;
        const key = x01VariantLabel(g.state.config.options);
        byVariant.set(key, [...(byVariant.get(key) ?? []), g]);
    }
    return [...byVariant.entries()].map(([variant, list]) => {
        const won = list.filter((g) => g.won && !g.state.config.teamMode);
        const darts = won.map((g) => g.turns.reduce((n, t) => n + t.darts.length, 0));
        const turns = won.map((g) => g.turns.length);
        const avg = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
        return { variant, wins: won.length, avgVolleys: avg(turns), avgDarts: avg(darts), bestDarts: darts.length ? Math.min(...darts) : null };
    });
}
export const MIN_VOLLEYS_FOR_GAME_RECORD = 3;
export function scoreRecords(games, mode) {
    let bestVolley = null;
    let bestGameAverage = null;
    for (const g of games) {
        if (g.state.config.mode !== mode)
            continue;
        const values = g.turns.map((t) => volleyValue(g, t));
        for (const v of values)
            if (!bestVolley || v > bestVolley.value)
                bestVolley = { value: v, endedAt: g.endedAt };
        if (values.length >= MIN_VOLLEYS_FOR_GAME_RECORD) {
            const avg = values.reduce((a, b) => a + b, 0) / values.length;
            if (!bestGameAverage || avg > bestGameAverage.value)
                bestGameAverage = { value: avg, endedAt: g.endedAt, volleys: values.length };
        }
    }
    return { bestVolley, bestGameAverage };
}
/**
 * Classements de l'avenant : par victoires (taux puis nombre), moyenne par volée, record de volée ou progression.
 * Les trois derniers n'ont de sens que pour un mode à score ; un joueur sans valeur est rangé à la fin.
 */
export function scoreRankings(records, profiles, filter, sortBy, minGames = MIN_RANKED_GAMES) {
    const mode = isScoredMode(filter.mode) ? filter.mode : undefined;
    const enrich = (r) => {
        const games = playerGames(records, r.playerId, filter).filter((g) => g.competitive);
        const p = mode ? scoreProfile(games, mode, [], 1000) : null;
        let progression = null;
        if (mode && filter.from) {
            const to = filter.to ?? new Date().toISOString();
            progression = comparePeriods(records, r.playerId, { ...filter, from: filter.from, to }).averageDelta;
        }
        return { ...r, average: p?.average ?? null, bestVolley: p?.best ?? null, progression };
    };
    const base = rankings(records, profiles, filter, minGames);
    const value = (r) => sortBy === 'winRate' ? r.winRate : sortBy === 'average' ? r.average : sortBy === 'bestVolley' ? r.bestVolley : r.progression;
    const order = (a, b) => {
        const va = value(a), vb = value(b);
        if (va === null || vb === null)
            return va === null && vb === null ? a.name.localeCompare(b.name) : va === null ? 1 : -1;
        return vb - va || b.wins - a.wins || a.name.localeCompare(b.name);
    };
    return { ranked: base.ranked.map(enrich).sort(order), unranked: base.unranked.map(enrich).sort(order) };
}
