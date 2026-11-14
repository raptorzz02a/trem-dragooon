import { BULL } from '../darts';
import { rankBy, topRanked } from '../rules';
import { perSide, setAt } from './common';
export const INNINGS = 9;
export const baseballTotal = (s, side, upTo = Infinity) => s.innings[side].slice(0, upTo).reduce((a, b) => a + b, 0);
/** Points d'une fléchette : simple 1, double 2, triple 3 sur le numéro de la manche ; Bull 25 = 1, 50 = 2 en prolongation. */
export function baseballPoints(dart, round) {
    const target = round < INNINGS ? round + 1 : BULL;
    return dart.segment === target ? dart.multiplier : 0;
}
/** Côtés en tête après 9 manches (ceux qui jouent la manche au Bull). */
export function leadersAfterNine(s) {
    const totals = s.innings.map((_, i) => baseballTotal(s, i, INNINGS));
    const best = Math.max(...totals);
    return totals.map((t, i) => (t === best ? i : -1)).filter((i) => i >= 0);
}
const inTiebreak = (s) => s.innings.every((inn) => inn.length >= INNINGS);
export const baseballRules = {
    init(config) {
        return { tiebreak: config.options.tiebreak, innings: perSide(config, []), gained: 0 };
    },
    skipSide(state, side) {
        return inTiebreak(state) && !leadersAfterNine(state).includes(side);
    },
    onTurnStart(state) {
        return { ...state, gained: 0 };
    },
    applyDart(state, ctx, dart) {
        const points = baseballPoints(dart, ctx.round);
        return { state: { ...state, gained: state.gained + points }, points };
    },
    onTurnEnd(state, ctx) {
        return { ...state, innings: setAt(state.innings, ctx.sideIndex, [...state.innings[ctx.sideIndex], state.gained]) };
    },
    onRoundEnd(state, round) {
        if (round + 1 < INNINGS)
            return null;
        if (round + 1 === INNINGS && state.tiebreak && leadersAfterNine(state).length > 1)
            return null;
        return { winners: topRanked(this.ranking(state)) };
    },
    ranking(state) {
        const total = (i) => baseballTotal(state, i);
        return rankBy(state.innings.length, (a, b) => total(b) - total(a), total);
    },
};
