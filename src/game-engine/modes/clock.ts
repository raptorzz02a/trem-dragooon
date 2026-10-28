import { BULL, type Dart } from '../darts';
import { rankBy, type ModeRules } from '../rules';
import type { ClockOptions } from '../types';

/** Ordre des numéros sur le cadran, en partant du 20 dans le sens horaire. */
export const BOARD_ORDER = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];

/** Une étape du parcours : un numéro, ou une étape Bull (any = 25 ou 50 au choix). */
export type ClockStep = { number: number } | { bull: 'any' | 25 | 50 };

export interface ClockState {
  options: ClockOptions;
  steps: ClockStep[];
  /** Indice de l'étape à atteindre, par côté. steps.length = parcours terminé. */
  progress: number[];
  dartsUsed: number[];
}

export function buildClockSteps(options: ClockOptions): ClockStep[] {
  const asc = Array.from({ length: 20 }, (_, i) => i + 1);
  const numbers = options.order === 'asc' ? asc : options.order === 'desc' ? asc.reverse() : BOARD_ORDER;
  const steps: ClockStep[] = numbers.map((n) => ({ number: n }));
  if (options.bullFinish === 'any') steps.push({ bull: 'any' });
  if (options.bullFinish === 'both') steps.push({ bull: 25 }, { bull: 50 });
  return steps;
}

export function isFinished(state: ClockState, side: number): boolean {
  return state.progress[side]! >= state.steps.length;
}

/** Étape active d'un côté, ou null si le parcours est terminé. */
export function currentStep(state: ClockState, side: number): ClockStep | null {
  return state.steps[state.progress[side]!] ?? null;
}

function hitsStep(step: ClockStep, dart: Dart, required: ClockOptions['required']): boolean {
  if ('number' in step) {
    if (dart.segment !== step.number) return false;
    if (required === 'double') return dart.multiplier === 2;
    if (required === 'triple') return dart.multiplier === 3;
    return true;
  }
  if (dart.segment !== BULL) return false;
  if (step.bull === 25) return dart.multiplier === 1;
  if (step.bull === 50) return dart.multiplier === 2;
  // Bull final unique : 25 ou 50 en standard, 50 exigé en variante double ou triple.
  return required === 'any' || dart.multiplier === 2;
}

export const clockRules: ModeRules<ClockState> = {
  init(config) {
    const options = config.options as ClockOptions;
    const n = config.sides.length;
    return { options, steps: buildClockSteps(options), progress: Array(n).fill(0), dartsUsed: Array(n).fill(0) };
  },

  applyDart(state, ctx, dart) {
    const me = ctx.sideIndex;
    const dartsUsed = state.dartsUsed.slice();
    dartsUsed[me] = dartsUsed[me]! + 1;
    const step = currentStep(state, me);
    if (!step || !hitsStep(step, dart, state.options.required)) {
      return { state: { ...state, dartsUsed }, points: 0 };
    }

    let advance = 1;
    if ('number' in step && state.options.advanceByMultiplier && state.options.required === 'any') {
      // On avance au plus jusqu'à la fin des numéros : le Bull doit être touché pour lui-même.
      const lastNumber = state.steps.filter((s) => 'number' in s).length;
      advance = Math.min(dart.multiplier, lastNumber - state.progress[me]!);
    }
    const progress = state.progress.slice();
    progress[me] = progress[me]! + advance;
    const next = { ...state, progress, dartsUsed };
    return { state: next, points: advance, endTurn: isFinished(next, me) };
  },

  // On termine la manche pour que chacun ait joué autant de volées, puis le moins de fléchettes gagne.
  onRoundEnd(state) {
    const done = state.progress.map((_, s) => s).filter((s) => isFinished(state, s));
    if (done.length === 0) return null;
    const best = Math.min(...done.map((s) => state.dartsUsed[s]!));
    return { winners: done.filter((s) => state.dartsUsed[s] === best) };
  },

  ranking(state) {
    return rankBy(
      state.progress.length,
      (a, b) => {
        const fa = isFinished(state, a), fb = isFinished(state, b);
        if (fa && fb) return state.dartsUsed[a]! - state.dartsUsed[b]!;
        if (fa !== fb) return fa ? -1 : 1;
        return state.progress[b]! - state.progress[a]!;
      },
      (s) => (isFinished(state, s) ? state.dartsUsed[s]! : state.progress[s]!),
    );
  },
};
