import { BULL } from '../darts';
import { aliveCount, eliminate, perSide, rankSurvivors, setAt } from './common';
import { hitsZone } from './zones';
/** Zone exacte d'une fléchette : simple, double ou triple du numéro, Bull 25 ou 50. */
export function exactZone(dart) {
    if (dart.segment === BULL)
        return { segment: BULL, ring: dart.multiplier === 2 ? 'D' : 'S' };
    return { segment: dart.segment, ring: dart.multiplier === 2 ? 'D' : dart.multiplier === 3 ? 'T' : 'S' };
}
/**
 * Big Six : il faut toucher la cible imposée pendant sa volée, sinon on perd une vie.
 * Après l'avoir touchée, la première zone touchée avec les fléchettes restantes devient la cible des suivants.
 */
export const bigSixRules = {
    validate(config) {
        if (config.teamMode)
            throw new Error('Big Six se joue en individuel.');
    },
    init(config) {
        const o = config.options;
        return {
            maxLives: o.lives,
            target: o.start,
            setter: -1,
            lives: perSide(config, o.lives),
            outOrder: perSide(config, 0),
            made: perSide(config, 0),
            hit: false,
            chosen: false,
        };
    },
    skipSide: (s, side) => s.outOrder[side] !== 0,
    onTurnStart: (s) => ({ ...s, hit: false, chosen: false }),
    applyDart(s, ctx, dart) {
        if (!s.hit) {
            if (!hitsZone(s.target, dart))
                return { state: s, points: 0 };
            return { state: { ...s, hit: true, made: setAt(s.made, ctx.sideIndex, s.made[ctx.sideIndex] + 1) }, points: 1 };
        }
        if (s.chosen || dart.segment === 0)
            return { state: s, points: 0 };
        return { state: { ...s, chosen: true, target: exactZone(dart), setter: ctx.sideIndex }, points: 0, endTurn: true };
    },
    onTurnEnd(s, ctx) {
        if (s.hit)
            return s;
        const me = ctx.sideIndex;
        const lives = setAt(s.lives, me, s.lives[me] - 1);
        return { ...s, lives, outOrder: lives[me] <= 0 ? eliminate(s.outOrder, me) : s.outOrder };
    },
    onRoundEnd(s) {
        const alive = aliveCount(s.outOrder);
        if (alive <= 1 && s.lives.length > 1)
            return {
                winners: this.ranking(s)
                    .filter((r) => r.rank === 1)
                    .map((r) => r.sideIndex),
            };
        if (alive === 0)
            return { winners: [] };
        return null;
    },
    ranking: (s) => rankSurvivors(s.outOrder, (i) => s.lives[i]),
};
