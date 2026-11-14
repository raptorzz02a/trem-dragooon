import { computeState } from '../game-engine/engine';
import { BULL, isDouble } from '../game-engine/darts';
import { targetOf } from '../game-engine/modes/random';
import { isClassicMode } from '../game-setup/setup';
import { isFinished as clockFinished } from '../game-engine/modes/clock';
const endOf = (r) => r.session.endedAt ?? r.session.createdAt;
export function playerGames(records, playerId, filter = {}) {
    const out = [];
    for (const record of records) {
        const { session } = record;
        if (session.status !== 'finished')
            continue; // abandonnées et annulées : ni victoire ni défaite
        const { config } = session;
        if (!isClassicMode(config.mode))
            continue; // jeu retiré (ancien Shanghai) : plus compté
        if (filter.mode && config.mode !== filter.mode)
            continue;
        if (filter.format === 'solo' && config.teamMode)
            continue;
        if (filter.format === 'team' && !config.teamMode)
            continue;
        const endedAt = endOf(record);
        if (filter.from && endedAt < filter.from)
            continue;
        if (filter.to && endedAt > filter.to)
            continue;
        const sideIndex = config.sides.findIndex((s) => s.playerIds.includes(playerId));
        if (sideIndex < 0)
            continue;
        const state = computeState(config, session.events);
        const durationMs = session.startedAt && session.endedAt ? Date.parse(session.endedAt) - Date.parse(session.startedAt) : null;
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
export function summary(games) {
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
        darts: games.reduce((n, g) => n + g.turns.reduce((m, t) => m + t.darts.length, 0), 0),
    };
}
const turnPoints = (t) => (t.outcome === 'bust' ? 0 : t.darts.reduce((a, d) => a + d.points, 0));
export const x01VariantLabel = (o) => `${o.startScore} · ${o.out === 'double' ? 'Double Out' : 'Sortie simple'}`;
/** Statistiques 301/501/701, séparées par variante car elles ne sont pas comparables entre elles. */
export function x01Stats(games) {
    const byVariant = new Map();
    for (const g of games) {
        if (g.state.config.mode !== 'x01')
            continue;
        const key = x01VariantLabel(g.state.config.options);
        byVariant.set(key, [...(byVariant.get(key) ?? []), g]);
    }
    return [...byVariant.entries()].map(([variant, list]) => {
        let volleys = 0, darts = 0, points = 0, busts = 0, over100 = 0, over140 = 0, max180 = 0;
        let attempts = 0, hits = 0;
        let bestVolley = null, bestCheckout = null;
        for (const g of list) {
            const options = g.state.config.options;
            // On rejoue le reste du côté pour savoir, avant chaque fléchette, si une finition était possible.
            const remaining = g.state.config.sides.map(() => options.startScore);
            for (const t of g.state.turns) {
                const mine = g.turns.includes(t);
                let running = remaining[t.sideIndex];
                t.darts.forEach((d, i) => {
                    if (mine && options.out === 'double' && ((running <= 40 && running % 2 === 0) || running === 50)) {
                        attempts++;
                        if (t.outcome === 'win' && i === t.darts.length - 1 && isDouble(d.dart))
                            hits++;
                    }
                    running -= d.points;
                });
                const total = turnPoints(t);
                if (t.outcome !== 'bust')
                    remaining[t.sideIndex] = remaining[t.sideIndex] - total;
                if (!mine)
                    continue;
                volleys++;
                darts += t.darts.length;
                points += total;
                if (t.outcome === 'bust')
                    busts++;
                else {
                    bestVolley = Math.max(bestVolley ?? 0, total);
                    if (total === 180)
                        max180++;
                    else if (total >= 140)
                        over140++;
                    else if (total >= 100)
                        over100++;
                }
                if (t.outcome === 'win')
                    bestCheckout = Math.max(bestCheckout ?? 0, total);
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
export function cricketStats(games) {
    const list = games.filter((g) => g.state.config.mode === 'cricket');
    let marks = 0, volleys = 0, points = 0;
    for (const g of list) {
        const targets = g.state.mode.targets;
        for (const t of g.turns) {
            volleys++;
            for (const d of t.darts) {
                if (targets.includes(d.dart.segment))
                    marks += d.dart.multiplier;
                points += d.points;
            }
        }
    }
    return { games: list.length, marks, mpr: volleys ? marks / volleys : null, points, avgDurationMs: avgDuration(list) };
}
export function clockStats(games) {
    const list = games.filter((g) => g.state.config.mode === 'clock');
    const best = new Map();
    let completions = 0;
    for (const g of list) {
        const s = g.state.mode;
        if (!clockFinished(s, g.sideIndex))
            continue;
        completions++;
        const o = s.options;
        const variant = `${o.order === 'asc' ? '1→20' : o.order === 'desc' ? '20→1' : 'cadran'} · ${{ any: 'toutes zones', double: 'doubles', triple: 'triples' }[o.required]} · Bull ${{ none: 'non', any: 'oui', both: '25 puis 50' }[o.bullFinish]}${o.advanceByMultiplier ? ' · avance selon zone' : ''}`;
        const darts = s.dartsUsed[g.sideIndex];
        best.set(variant, Math.min(best.get(variant) ?? Infinity, darts));
    }
    return {
        games: list.length,
        completions,
        best: [...best.entries()].map(([variant, darts]) => ({ variant, darts })),
        avgDurationMs: avgDuration(list),
    };
}
export function randomStats(games) {
    const list = games.filter((g) => g.state.config.mode === 'random');
    const scores = list.map((g) => g.state.mode.scores[g.sideIndex]);
    const volleys = list.flatMap((g) => g.turns.map(turnPoints));
    const darts = list.flatMap((g) => g.turns.flatMap((t) => t.darts));
    const bullTurns = list.flatMap((g) => g.turns.filter((t) => targetOf(g.state.config.options, t.round) === BULL));
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
/** Entraînement : volume de fléchettes et points, sans victoire ni défaite. */
export function trainingStats(games) {
    const list = games.filter((g) => g.state.config.mode === 'training');
    const volleys = list.flatMap((g) => g.turns.map(turnPoints));
    const darts = list.reduce((n, g) => n + g.turns.reduce((m, t) => m + t.darts.length, 0), 0);
    const points = volleys.reduce((a, b) => a + b, 0);
    const scores = list.map((g) => g.state.mode.scores[g.sideIndex]);
    return {
        games: list.length,
        darts,
        points,
        avg3: darts ? (3 * points) / darts : null,
        bestVolley: volleys.length ? Math.max(...volleys) : null,
        bestScore: scores.length ? Math.max(...scores) : null,
        over100: volleys.filter((v) => v >= 100 && v < 140).length,
        over140: volleys.filter((v) => v >= 140 && v < 180).length,
        max180: volleys.filter((v) => v === 180).length,
        avgDurationMs: avgDuration(list),
    };
}
function avgDuration(list) {
    const d = list.map((g) => g.durationMs).filter((x) => x !== null);
    return d.length ? d.reduce((a, b) => a + b, 0) / d.length : null;
}
/** Triple et simple les plus touchés (hors Horloge, où la saisie ne dit pas quelle zone a été touchée). */
export function favouriteHits(games) {
    const darts = games.filter((g) => g.state.config.mode !== 'clock').flatMap((g) => g.turns.flatMap((t) => t.darts));
    const top = (multiplier) => {
        const counts = new Map();
        let total = 0;
        for (const d of darts) {
            if (d.dart.multiplier !== multiplier || d.dart.segment === 0 || d.dart.segment === 25)
                continue;
            counts.set(d.dart.segment, (counts.get(d.dart.segment) ?? 0) + 1);
            total++;
        }
        let best = null;
        for (const [segment, n] of counts)
            if (!best || n > (best.share * total) / 100)
                best = { segment, share: (100 * n) / total };
        return best;
    };
    return { triple: top(3), single: top(1) };
}
export const MIN_RANKED_GAMES = 5;
/**
 * Classement par taux de victoire, puis par nombre de victoires. Seules les parties terminées hors entraînement comptent.
 * Les joueurs qui ont moins de `minGames` parties sont listés à part.
 */
export function rankings(records, profiles, filter = {}, minGames = MIN_RANKED_GAMES) {
    const rows = [];
    for (const p of profiles) {
        if (p.deleted)
            continue;
        const games = playerGames(records, p.id, filter).filter((g) => g.competitive);
        if (games.length === 0)
            continue;
        const s = summary(games);
        rows.push({ playerId: p.id, name: p.name, games: s.competitive, wins: s.wins, winRate: s.winRate ?? 0, key: keyStat(games, filter.mode) });
    }
    rows.sort((a, b) => b.winRate - a.winRate || b.wins - a.wins || a.name.localeCompare(b.name));
    return { ranked: rows.filter((r) => r.games >= minGames), unranked: rows.filter((r) => r.games < minGames) };
}
function keyStat(games, mode) {
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
        case 'training':
            return trainingStats(games).bestScore;
        default:
            return null;
    }
}
