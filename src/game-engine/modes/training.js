import { dartScore } from '../darts';
import { rankBy } from '../rules';
/**
 * Entraînement : chaque fléchette rapporte sa valeur (S/D/T, 25/50), sans bust ni limite.
 * La partie ne s'arrête jamais d'elle-même : l'hôte la termine (événement finish) pour l'enregistrer.
 */
export const trainingRules = {
    init(config) {
        return { scores: config.sides.map(() => 0), darts: config.sides.map(() => 0) };
    },
    applyDart(state, ctx, dart) {
        const points = dartScore(dart);
        const scores = state.scores.slice();
        const darts = state.darts.slice();
        scores[ctx.sideIndex] = scores[ctx.sideIndex] + points;
        darts[ctx.sideIndex] = darts[ctx.sideIndex] + 1;
        return { state: { scores, darts }, points };
    },
    onRoundEnd() {
        return null;
    },
    ranking(state) {
        return rankBy(state.scores.length, (a, b) => state.scores[b] - state.scores[a], (s) => state.scores[s]);
    },
};
/** Moyenne sur 3 fléchettes d'un côté (points / fléchettes × 3), ou null s'il n'a rien lancé. */
export function trainingAverage(state, sideIndex) {
    const n = state.darts[sideIndex];
    return n ? (3 * state.scores[sideIndex]) / n : null;
}
