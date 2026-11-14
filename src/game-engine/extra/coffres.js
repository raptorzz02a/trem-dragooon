import { BULL, dartScore } from '../darts';
import { topRanked } from '../rules';
import { perSide, rankHigh, setAt } from './common';
import { hitsZone, NUMBERS, sameZone, shuffle } from './zones';
export const CHEST_BONUSES = [60, 50, 40, 30, 20, 10];
/** 6 zones différentes : doubles, triples, simples ou Bull. */
export function drawChests(rng = Math.random) {
    const pool = [
        ...NUMBERS.flatMap((n) => ['S', 'D', 'T'].map((ring) => ({ segment: n, ring }))),
        { segment: BULL, ring: 'S' },
        { segment: BULL, ring: 'D' },
    ];
    const out = [];
    for (const z of shuffle(pool, rng)) {
        if (out.length === CHEST_BONUSES.length)
            break;
        if (!out.some((o) => sameZone(o, z)))
            out.push(z);
    }
    return out;
}
/**
 * Les Coffres : chaque fléchette rapporte ses points, et 6 coffres (60 à 10 points) sont cachés sur des zones tirées
 * au sort. Le premier qui touche la zone d'un coffre l'ouvre et gagne son bonus ; un coffre ouvert ne rapporte plus.
 */
export const coffresRules = {
    init(config) {
        const o = config.options;
        return { rounds: o.rounds, chests: o.chests, opened: o.chests.map(() => null), scores: perSide(config, 0), bonus: perSide(config, 0) };
    },
    applyDart(s, ctx, dart) {
        const me = ctx.sideIndex;
        let points = dartScore(dart);
        let { opened, bonus } = s;
        const i = s.chests.findIndex((z, k) => !s.opened[k] && hitsZone(z, dart));
        if (i >= 0) {
            points += CHEST_BONUSES[i];
            opened = setAt(opened, i, { side: me, round: ctx.round });
            bonus = setAt(bonus, me, bonus[me] + CHEST_BONUSES[i]);
        }
        return { state: { ...s, opened, bonus, scores: setAt(s.scores, me, s.scores[me] + points) }, points };
    },
    onRoundEnd(s, round) {
        return round + 1 >= s.rounds ? { winners: topRanked(rankHigh(s.scores)) } : null;
    },
    ranking: (s) => rankHigh(s.scores),
};
