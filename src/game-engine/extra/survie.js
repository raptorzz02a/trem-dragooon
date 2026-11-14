import { BULL } from '../darts';
import { rankBy } from '../rules';
import { aliveCount, eliminate, perSide, setAt } from './common';
import { hitsZone, NUMBERS, pick } from './zones';
export const SURVIE_ROUNDS = 60;
/** Paliers : tout le numéro, doubles, triples, Bull, Bull 50. */
export const SURVIE_LEVELS = ['Tout le numéro', 'Doubles', 'Triples', 'Bull', 'Bull 50'];
export const survieLevel = (round, step) => Math.min(SURVIE_LEVELS.length - 1, Math.floor(round / step));
export function drawSurvieTargets(step, rng = Math.random) {
    return Array.from({ length: SURVIE_ROUNDS }, (_, r) => {
        const level = survieLevel(r, step);
        if (level === 3)
            return { segment: BULL, ring: 'any' };
        if (level === 4)
            return { segment: BULL, ring: 'D' };
        return { segment: pick(NUMBERS, rng), ring: level === 0 ? 'any' : level === 1 ? 'D' : 'T' };
    });
}
/** Survie : une cible par manche, de plus en plus dure ; une volée sans la toucher coûte une vie. */
export const survieRules = {
    init(config) {
        const o = config.options;
        return {
            step: o.step,
            maxLives: o.lives,
            targets: o.targets,
            lives: perSide(config, o.lives),
            outOrder: perSide(config, 0),
            held: perSide(config, 0),
            hit: false,
        };
    },
    skipSide: (s, side) => s.outOrder[side] !== 0,
    onTurnStart: (s) => ({ ...s, hit: false }),
    applyDart(s, ctx, dart) {
        if (!hitsZone(s.targets[ctx.round], dart))
            return { state: s, points: 0 };
        return { state: { ...s, hit: true, held: setAt(s.held, ctx.sideIndex, s.held[ctx.sideIndex] + 1) }, points: 1, endTurn: true };
    },
    onTurnEnd(s, ctx) {
        if (s.hit)
            return s;
        const me = ctx.sideIndex;
        const lives = setAt(s.lives, me, s.lives[me] - 1);
        return { ...s, lives, outOrder: lives[me] <= 0 ? eliminate(s.outOrder, me) : s.outOrder };
    },
    onRoundEnd(s, round) {
        const alive = aliveCount(s.outOrder);
        if (alive === 0 || (s.lives.length > 1 && alive === 1) || round + 1 >= s.targets.length) {
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
        return s.held[b] - s.held[a] || s.lives[b] - s.lives[a];
    }, (i) => s.held[i]),
};
