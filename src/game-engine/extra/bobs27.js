import { BULL } from '../darts';
import { aliveCount, eliminate, perSide, rankSurvivors, setAt } from './common';
export const bobsValue = (n) => (n === BULL ? 50 : 2 * n);
export const bobs27Rules = {
    init(config) {
        const o = config.options;
        const targets = [...Array.from({ length: 20 }, (_, i) => i + 1), ...(o.bull ? [BULL] : [])];
        return {
            targets,
            penalty: o.penalty,
            scores: perSide(config, 27),
            outOrder: perSide(config, 0),
            outRound: perSide(config, -1),
            hits: 0,
            doubles: perSide(config, 0),
        };
    },
    skipSide: (s, side) => s.outOrder[side] !== 0,
    onTurnStart: (s) => ({ ...s, hits: 0 }),
    applyDart(s, ctx, dart) {
        const n = s.targets[ctx.round];
        const me = ctx.sideIndex;
        if (dart.segment === n && dart.multiplier === 2) {
            const v = bobsValue(n);
            return {
                state: {
                    ...s,
                    hits: s.hits + 1,
                    scores: setAt(s.scores, me, s.scores[me] + v),
                    doubles: setAt(s.doubles, me, s.doubles[me] + 1),
                },
                points: v,
            };
        }
        if (s.penalty === 'each') {
            const scores = setAt(s.scores, me, s.scores[me] - bobsValue(n));
            if (scores[me] <= 0) {
                return {
                    state: { ...s, scores, outOrder: eliminate(s.outOrder, me), outRound: setAt(s.outRound, me, ctx.round) },
                    points: 0,
                    endTurn: true,
                };
            }
            return { state: { ...s, scores }, points: 0 };
        }
        return { state: s, points: 0 };
    },
    onTurnEnd(s, ctx) {
        const me = ctx.sideIndex;
        if (s.outOrder[me] !== 0 || s.penalty === 'each' || s.hits > 0)
            return s;
        const scores = setAt(s.scores, me, s.scores[me] - bobsValue(s.targets[ctx.round]));
        if (scores[me] > 0)
            return { ...s, scores };
        return { ...s, scores, outOrder: eliminate(s.outOrder, me), outRound: setAt(s.outRound, me, ctx.round) };
    },
    onRoundEnd(s, round) {
        const n = s.scores.length;
        const alive = aliveCount(s.outOrder);
        if (round + 1 >= s.targets.length || alive === 0 || (n > 1 && alive <= 1)) {
            return {
                winners: this.ranking(s)
                    .filter((r) => r.rank === 1)
                    .map((r) => r.sideIndex),
            };
        }
        return null;
    },
    ranking: (s) => rankSurvivors(s.outOrder, (i) => s.scores[i]),
};
