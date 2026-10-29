import { BULL, dartScore } from '../darts';
import { rankBy, topRanked, type ModeRules } from '../rules';
import type { RandomOptions } from '../types';

/** Numéros qui peuvent être tirés : 1 à 20 et le Bull. */
export const RANDOM_TARGETS = [...Array.from({ length: 20 }, (_, i) => i + 1), BULL];

export interface RandomState {
  options: RandomOptions;
  scores: number[];
  /** Numéro à viser pendant la manche en cours (25 = Bull). */
  target: number;
}

/**
 * Tire un numéro par manche, jamais deux fois le même d'affilée.
 * Le tirage est fait au lancement et rangé dans les options : la partie se rejoue à l'identique.
 */
export function drawTargets(rounds: number, rng: () => number = Math.random): number[] {
  const targets: number[] = [];
  for (let r = 0; r < rounds; r++) {
    const choices = RANDOM_TARGETS.filter((n) => n !== targets[r - 1]);
    targets.push(choices[Math.floor(rng() * choices.length)]!);
  }
  return targets;
}

/** Numéro de la manche ; si le tirage manque (ancienne sauvegarde), on reprend la liste dans l'ordre. */
export function targetOf(options: RandomOptions, round: number): number {
  return options.targets[round] ?? RANDOM_TARGETS[round % RANDOM_TARGETS.length]!;
}

export const randomRules: ModeRules<RandomState> = {
  init(config) {
    const options = config.options as RandomOptions;
    return { options, scores: config.sides.map(() => 0), target: targetOf(options, 0) };
  },

  onTurnStart(state, ctx) {
    return { ...state, target: targetOf(state.options, ctx.round) };
  },

  applyDart(state, ctx, dart) {
    if (dart.segment !== state.target) return { state, points: 0 };
    const points = dartScore(dart);
    const scores = state.scores.slice();
    scores[ctx.sideIndex] = scores[ctx.sideIndex]! + points;
    return { state: { ...state, scores }, points };
  },

  onRoundEnd(state, round) {
    if (round + 1 < state.options.rounds) return null;
    return { winners: topRanked(this.ranking(state)) };
  },

  ranking(state) {
    return rankBy(state.scores.length, (a, b) => state.scores[b]! - state.scores[a]!, (s) => state.scores[s]!);
  },
};
