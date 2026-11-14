import { rankBy } from '../rules';
import { aliveCount, eliminate, perSide, setAt } from './common';
export const NINE_GOAL = 20;
/** Nine Lives : du 1 au 20 dans l'ordre ; une volée sans touche coûte une vie. Premier au bout, ou dernier en vie. */
export const nineLivesRules = {
    init(config) {
        const lives = config.options.lives;
        return { maxLives: lives, lives: perSide(config, lives), progress: perSide(config, 0), outOrder: perSide(config, 0), hits: 0 };
    },
    skipSide: (s, side) => s.outOrder[side] !== 0 || s.progress[side] === NINE_GOAL,
    onTurnStart: (s) => ({ ...s, hits: 0 }),
    applyDart(s, ctx, dart) {
        const me = ctx.sideIndex;
        const target = s.progress[me] + 1;
        if (dart.segment !== target)
            return { state: s, points: 0 };
        const progress = setAt(s.progress, me, target);
        return { state: { ...s, progress, hits: s.hits + 1 }, points: 1, endTurn: target === NINE_GOAL };
    },
    onTurnEnd(s, ctx) {
        const me = ctx.sideIndex;
        if (s.hits > 0)
            return s;
        const lives = setAt(s.lives, me, s.lives[me] - 1);
        return { ...s, lives, outOrder: lives[me] <= 0 ? eliminate(s.outOrder, me) : s.outOrder };
    },
    onRoundEnd(s) {
        const done = s.progress.map((p, i) => (p === NINE_GOAL ? i : -1)).filter((i) => i >= 0);
        if (done.length)
            return { winners: done };
        const alive = aliveCount(s.outOrder);
        if (alive === 0 || (s.lives.length > 1 && alive === 1)) {
            return {
                winners: this.ranking(s)
                    .filter((r) => r.rank === 1)
                    .map((r) => r.sideIndex),
            };
        }
        return null;
    },
    ranking: (s) => rankBy(s.lives.length, (a, b) => {
        const oa = s.outOrder[a], ob = s.outOrder[b];
        if ((oa === 0) !== (ob === 0))
            return oa === 0 ? -1 : 1;
        if (oa !== ob)
            return ob - oa;
        return s.progress[b] - s.progress[a] || s.lives[b] - s.lives[a];
    }, (i) => s.progress[i]),
};
