import { topRanked } from '../rules';
import { perSide, rankLow, setAt } from './common';
export const GOLF_MISS = 4;
/** Coups d'une fléchette sur le trou : triple 1, double 2, simple 3, à côté 4. */
export const golfStrokes = (dart, hole) => (dart.segment === hole ? 4 - dart.multiplier : GOLF_MISS);
export const golfTotal = (s, side) => s.cards[side].reduce((a, b) => a + b, 0);
/** Golf : la dernière fléchette lancée compte ; « Fin de tour » garde le coup. Le plus petit total gagne. */
export const golfRules = {
    init(config) {
        return { holes: config.options.holes, cards: perSide(config, []), last: null };
    },
    onTurnStart: (s) => ({ ...s, last: null }),
    applyDart(s, ctx, dart) {
        const strokes = golfStrokes(dart, ctx.round + 1);
        // Un triple (1 coup) ne peut pas être amélioré : le trou s'arrête là.
        return { state: { ...s, last: strokes }, points: strokes, endTurn: strokes === 1 };
    },
    onTurnEnd(s, ctx) {
        return { ...s, cards: setAt(s.cards, ctx.sideIndex, [...s.cards[ctx.sideIndex], s.last ?? GOLF_MISS]) };
    },
    onRoundEnd(s, round) {
        return round + 1 >= s.holes ? { winners: topRanked(this.ranking(s)) } : null;
    },
    ranking: (s) => rankLow(s.cards.map((_, i) => golfTotal(s, i))),
};
