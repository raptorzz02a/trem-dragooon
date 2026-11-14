import { dartScore } from '../darts';
import { topRanked } from '../rules';
import { perSide, rankLow, setAt } from './common';
/** Fléchette hors cible : +50 (choix de ju). */
export const LOW_MISS = 50;
export const lowScoreRules = {
    init(config) {
        return { rounds: config.options.rounds, scores: perSide(config, 0), misses: perSide(config, 0) };
    },
    applyDart(s, ctx, dart) {
        const me = ctx.sideIndex;
        const miss = dart.segment === 0;
        const points = miss ? LOW_MISS : dartScore(dart);
        return {
            state: {
                ...s,
                scores: setAt(s.scores, me, s.scores[me] + points),
                misses: miss ? setAt(s.misses, me, s.misses[me] + 1) : s.misses,
            },
            points,
        };
    },
    onRoundEnd(s, round) {
        return round + 1 >= s.rounds ? { winners: topRanked(rankLow(s.scores)) } : null;
    },
    ranking: (s) => rankLow(s.scores),
};
