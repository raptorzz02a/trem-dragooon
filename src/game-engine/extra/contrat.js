import { BULL, dartScore } from '../darts';
import { topRanked } from '../rules';
import { perSide, rankHigh, setAt } from './common';
import { NUMBERS, pick, shuffle } from './zones';
const EASY = [
    { kind: 'double', bonus: 20 },
    { kind: 'triple', bonus: 30 },
    { kind: 'atLeast', n: 60, bonus: 40 },
    { kind: 'bull', bonus: 40 },
    { kind: 'exact', n: 50, bonus: 50 },
];
const hard = (rng) => [
    { kind: 'doubleOf', n: pick(NUMBERS, rng), bonus: 40 },
    { kind: 'tripleHigh', bonus: 50 },
    { kind: 'atLeast', n: 100, bonus: 60 },
    { kind: 'bull50', bonus: 60 },
    { kind: 'exact', n: 70, bonus: 70 },
];
/** 3 contrats par manche ; à partir de la 6e, des contrats plus durs (difficulté progressive). */
export function drawContractOffers(rounds, progressive, rng = Math.random) {
    return Array.from({ length: rounds }, (_, r) => shuffle(progressive && r >= 5 ? hard(rng) : EASY, rng).slice(0, 3));
}
export function contractLabel(c) {
    switch (c.kind) {
        case 'double':
            return 'Un double';
        case 'triple':
            return 'Un triple';
        case 'atLeast':
            return `Au moins ${c.n} points`;
        case 'bull':
            return 'Un Bull';
        case 'exact':
            return `Exactement ${c.n} points`;
        case 'doubleOf':
            return `Le double ${c.n}`;
        case 'tripleHigh':
            return 'Un triple de 15 à 20';
        case 'bull50':
            return 'Le Bull 50';
    }
}
/** Le contrat est-il rempli par ces fléchettes (volée complète ou en cours) ? */
export function fulfils(c, darts) {
    const total = darts.reduce((a, d) => a + dartScore(d), 0);
    switch (c.kind) {
        case 'double':
            return darts.some((d) => d.segment !== 0 && d.multiplier === 2);
        case 'triple':
            return darts.some((d) => d.multiplier === 3);
        case 'atLeast':
            return total >= c.n;
        case 'bull':
            return darts.some((d) => d.segment === BULL);
        case 'exact':
            return total === c.n;
        case 'doubleOf':
            return darts.some((d) => d.segment === c.n && d.multiplier === 2);
        case 'tripleHigh':
            return darts.some((d) => d.multiplier === 3 && d.segment >= 15);
        case 'bull50':
            return darts.some((d) => d.segment === BULL && d.multiplier === 2);
    }
}
/** Meilleure prime remplie parmi les contrats proposés (0 si aucun). */
export function bestBonus(offers, darts) {
    return Math.max(0, ...offers.filter((c) => fulfils(c, darts)).map((c) => c.bonus));
}
/**
 * Le Contrat : 3 contrats sont proposés à chaque manche. On lance ses fléchettes, et la meilleure prime remplie
 * est gagnée (pas de choix à faire avant de lancer : la borne prend le contrat le plus payant). Seule la prime compte.
 */
export const contratRules = {
    init(config) {
        const o = config.options;
        return { rounds: o.rounds, offers: o.offers, scores: perSide(config, 0), won: perSide(config, 0), darts: [] };
    },
    onTurnStart: (s) => ({ ...s, darts: [] }),
    applyDart(s, _ctx, dart) {
        return { state: { ...s, darts: [...s.darts, dart] }, points: dartScore(dart) };
    },
    onTurnEnd(s, ctx) {
        const bonus = bestBonus(s.offers[ctx.round], s.darts);
        if (!bonus)
            return s;
        const me = ctx.sideIndex;
        return { ...s, scores: setAt(s.scores, me, s.scores[me] + bonus), won: setAt(s.won, me, s.won[me] + 1) };
    },
    onRoundEnd(s, round) {
        return round + 1 >= s.rounds ? { winners: topRanked(rankHigh(s.scores)) } : null;
    },
    ranking: (s) => rankHigh(s.scores),
};
