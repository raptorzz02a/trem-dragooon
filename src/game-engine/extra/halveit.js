import { BULL, dartScore } from '../darts';
import { rankBy, topRanked } from '../rules';
/** Séquence de l'annexe : 12, D13, 14, T15, 16, D17, 18, T19, 20, Bull. */
export const HALVE_STANDARD = [
    { segment: 12 },
    { segment: 13, multiplier: 2 },
    { segment: 14 },
    { segment: 15, multiplier: 3 },
    { segment: 16 },
    { segment: 17, multiplier: 2 },
    { segment: 18 },
    { segment: 19, multiplier: 3 },
    { segment: 20 },
    { segment: BULL },
];
/**
 * Séquence tirée au sort : 9 numéros différents (un sur trois en double ou en triple, comme dans l'annexe), puis le Bull.
 * Fixée au lancement et rangée dans les options : la partie se rejoue à l'identique.
 */
export function drawHalveTargets(rng = Math.random) {
    const pool = Array.from({ length: 20 }, (_, i) => i + 1);
    const out = [];
    for (let i = 0; i < 9; i++) {
        const n = pool.splice(Math.floor(rng() * pool.length), 1)[0];
        out.push(i % 4 === 1 ? { segment: n, multiplier: 2 } : i % 4 === 3 ? { segment: n, multiplier: 3 } : { segment: n });
    }
    return [...out, { segment: BULL }];
}
export const hitsTarget = (target, dart) => dart.segment === target.segment && (target.multiplier === undefined || dart.multiplier === target.multiplier);
/** Notation courte d'une cible : 14, D13, T15, Bull. */
export function formatTarget(t) {
    if (t.segment === BULL)
        return 'Bull';
    return `${t.multiplier === 2 ? 'D' : t.multiplier === 3 ? 'T' : ''}${t.segment}`;
}
export const targetOfRound = (options, round) => options.targets[round] ?? HALVE_STANDARD[round % HALVE_STANDARD.length];
/**
 * Halve It : une cible imposée par manche ; les fléchettes qui la touchent rapportent leur valeur réelle.
 * Une volée sans aucune touche divise le score par deux (arrondi en dessous).
 */
export const halveItRules = {
    init(config) {
        const options = config.options;
        const targets = options.targets.length ? options.targets : HALVE_STANDARD;
        return {
            targets,
            scores: config.sides.map(() => 0),
            gained: 0,
            hits: 0,
            log: [],
        };
    },
    onTurnStart(state) {
        return { ...state, gained: 0, hits: 0 };
    },
    applyDart(state, ctx, dart) {
        const target = state.targets[ctx.round];
        if (!hitsTarget(target, dart))
            return { state, points: 0 };
        const points = dartScore(dart);
        const scores = state.scores.slice();
        scores[ctx.sideIndex] = scores[ctx.sideIndex] + points;
        return {
            state: {
                ...state,
                scores,
                gained: state.gained + points,
                hits: state.hits + 1,
            },
            points,
        };
    },
    onTurnEnd(state, ctx) {
        const entry = {
            side: ctx.sideIndex,
            round: ctx.round,
            gained: state.gained,
        };
        if (state.hits > 0)
            return { ...state, log: [...state.log, entry] };
        const scores = state.scores.slice();
        const before = scores[ctx.sideIndex];
        scores[ctx.sideIndex] = Math.floor(before / 2);
        return {
            ...state,
            scores,
            log: [...state.log, { ...entry, halvedFrom: before }],
        };
    },
    onRoundEnd(state, round) {
        return round + 1 >= state.targets.length ? { winners: topRanked(this.ranking(state)) } : null;
    },
    ranking(state) {
        return rankBy(state.scores.length, (a, b) => state.scores[b] - state.scores[a], (s) => state.scores[s]);
    },
};
