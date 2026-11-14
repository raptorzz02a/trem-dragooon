import { topRanked } from '../rules';
import { perSide, rankHigh, setAt } from './common';
export const DT_NUMBERS = 20;
export const dtSuccess = (s, side) => s.results[side].filter(Boolean).length;
/** Défi doubles et triples : 3 fléchettes par numéro, de 1 à 20 ; une touche valide le numéro et passe au suivant. */
export const dtChallengeRules = {
    init(config) {
        return { kind: config.options.kind, results: perSide(config, []), hit: false };
    },
    onTurnStart: (s) => ({ ...s, hit: false }),
    applyDart(s, ctx, dart) {
        const ok = dart.segment === ctx.round + 1 && dart.multiplier === (s.kind === 'D' ? 2 : 3);
        return ok ? { state: { ...s, hit: true }, points: 1, endTurn: true } : { state: s, points: 0 };
    },
    onTurnEnd(s, ctx) {
        return { ...s, results: setAt(s.results, ctx.sideIndex, [...s.results[ctx.sideIndex], s.hit]) };
    },
    onRoundEnd(s, round) {
        return round + 1 >= DT_NUMBERS ? { winners: topRanked(this.ranking(s)) } : null;
    },
    ranking: (s) => rankHigh(s.results.map((_, i) => dtSuccess(s, i))),
};
