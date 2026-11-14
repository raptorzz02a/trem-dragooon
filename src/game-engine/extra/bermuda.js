import { BULL, dartScore } from '../darts';
import { topRanked } from '../rules';
import { perSide, rankHigh, setAt } from './common';
import { hitsZone, NUMBERS, shuffle, singleValue } from './zones';
/**
 * Probabilité de chaque famille de cible à chaque manche (règle de ju) : simple haut 32,5 %, simple bas 32,5 %,
 * triple 15 %, double 15 %, Bull 5 % (Bull 25 ou Bull 50, moitié-moitié).
 */
export const BERMUDA_WEIGHTS = [
    { weight: 32.5, zones: NUMBERS.map((n) => ({ segment: n, ring: 'SO' })) },
    { weight: 32.5, zones: NUMBERS.map((n) => ({ segment: n, ring: 'SI' })) },
    { weight: 15, zones: NUMBERS.map((n) => ({ segment: n, ring: 'T' })) },
    { weight: 15, zones: NUMBERS.map((n) => ({ segment: n, ring: 'D' })) },
    { weight: 5, zones: [{ segment: BULL, ring: 'S' }, { segment: BULL, ring: 'D' }] },
];
/**
 * Tire la suite des cibles : à chaque manche, une famille selon BERMUDA_WEIGHTS, puis une cible de cette famille
 * pas encore sortie. Jamais deux fois la même cible ; une famille épuisée sort du tirage et les autres gardent
 * leurs proportions entre elles.
 */
export function drawBermudaTargets(rng = Math.random) {
    const pools = BERMUDA_WEIGHTS.map((f) => ({ weight: f.weight, zones: shuffle(f.zones, rng) }));
    const out = [];
    for (;;) {
        const open = pools.filter((p) => p.zones.length > 0);
        if (open.length === 0)
            return out;
        let r = rng() * open.reduce((t, p) => t + p.weight, 0);
        const pool = open.find((p) => (r -= p.weight) < 0) ?? open[open.length - 1];
        out.push(pool.zones.pop());
    }
}
/**
 * Triangle des Bermudes (« ▲ des Bermudes », règles de ju) : une zone tirée au sort par manche, jamais deux fois la même. Une touche rapporte la valeur
 * de la fléchette ; une volée sans touche retire la valeur simple de la cible. Le premier à l'objectif gagne
 * (on finit la manche).
 */
export const bermudaRules = {
    init(config) {
        const o = config.options;
        return { goal: o.goal, targets: o.targets, scores: perSide(config, 0), hits: 0, wrecks: perSide(config, 0) };
    },
    onTurnStart: (s) => ({ ...s, hits: 0 }),
    applyDart(s, ctx, dart) {
        if (!hitsZone(s.targets[ctx.round], dart))
            return { state: s, points: 0 };
        const points = dartScore(dart);
        return { state: { ...s, hits: s.hits + 1, scores: setAt(s.scores, ctx.sideIndex, s.scores[ctx.sideIndex] + points) }, points };
    },
    onTurnEnd(s, ctx) {
        if (s.hits > 0)
            return s;
        const me = ctx.sideIndex;
        return {
            ...s,
            scores: setAt(s.scores, me, Math.max(0, s.scores[me] - singleValue(s.targets[ctx.round]))),
            wrecks: setAt(s.wrecks, me, s.wrecks[me] + 1),
        };
    },
    onRoundEnd(s, round) {
        if (s.scores.some((v) => v >= s.goal) || round + 1 >= s.targets.length)
            return { winners: topRanked(rankHigh(s.scores)) };
        return null;
    },
    ranking: (s) => rankHigh(s.scores),
};
