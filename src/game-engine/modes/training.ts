import { dartScore } from '../darts';
import { rankBy, type ModeRules } from '../rules';

export interface TrainingState {
  /** Total des points de chaque côté, depuis 0. */
  scores: number[];
  /** Fléchettes lancées par chaque côté. */
  darts: number[];
}

/**
 * Entraînement : chaque fléchette rapporte sa valeur (S/D/T, 25/50), sans bust ni limite.
 * La partie ne s'arrête jamais d'elle-même : l'hôte la termine (événement finish) pour l'enregistrer.
 */
export const trainingRules: ModeRules<TrainingState> = {
  init(config) {
    return { scores: config.sides.map(() => 0), darts: config.sides.map(() => 0) };
  },

  applyDart(state, ctx, dart) {
    const points = dartScore(dart);
    const scores = state.scores.slice();
    const darts = state.darts.slice();
    scores[ctx.sideIndex] = scores[ctx.sideIndex]! + points;
    darts[ctx.sideIndex] = darts[ctx.sideIndex]! + 1;
    return { state: { scores, darts }, points };
  },

  onRoundEnd() {
    return null;
  },

  ranking(state) {
    return rankBy(state.scores.length, (a, b) => state.scores[b]! - state.scores[a]!, (s) => state.scores[s]!);
  },
};

/** Moyenne par fléchette d'un côté, ou null s'il n'a rien lancé. */
export function trainingAverage(state: TrainingState, sideIndex: number): number | null {
  const n = state.darts[sideIndex]!;
  return n ? state.scores[sideIndex]! / n : null;
}
