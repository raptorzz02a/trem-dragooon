import { dartScore } from '../darts';
import { topRanked } from '../rules';
import { perSide, rankHigh, setAt } from './common';
export const FIVES_MAX_ROUNDS = 40;
/** Ce que rapporte une volée : total ÷ 5 s'il est divisible, sinon 0 ; null si l'objectif est dépassé. */
export function fivesGain(score, volley, goal) {
    if (volley === 0 || volley % 5 !== 0)
        return 0;
    return score + volley / 5 > goal ? null : volley / 5;
}
export const fivesRules = {
    init(config) {
        return {
            goal: config.options.goal,
            scores: perSide(config, 0),
            volley: 0,
            scoring: perSide(config, 0),
            over: perSide(config, 0),
            log: [],
        };
    },
    onTurnStart: (s) => ({ ...s, volley: 0 }),
    applyDart(s, _ctx, dart) {
        const points = dartScore(dart);
        return { state: { ...s, volley: s.volley + points }, points };
    },
    onTurnEnd(s, ctx) {
        const me = ctx.sideIndex;
        const gain = fivesGain(s.scores[me], s.volley, s.goal);
        s = { ...s, log: [...s.log, { side: me, round: ctx.round, volley: s.volley, gain }] };
        if (gain === null)
            return { ...s, over: setAt(s.over, me, s.over[me] + 1) };
        if (gain === 0)
            return s;
        return { ...s, scores: setAt(s.scores, me, s.scores[me] + gain), scoring: setAt(s.scoring, me, s.scoring[me] + 1) };
    },
    onRoundEnd(s, round) {
        const done = s.scores.map((v, i) => (v === s.goal ? i : -1)).filter((i) => i >= 0);
        if (done.length)
            return { winners: done };
        return round + 1 >= FIVES_MAX_ROUNDS ? { winners: topRanked(rankHigh(s.scores)) } : null;
    },
    ranking: (s) => rankHigh(s.scores),
};
