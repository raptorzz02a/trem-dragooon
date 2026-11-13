import type { ModeRules } from '../rules';
import type { GameConfig } from '../types';
import { aliveCount, eliminate, perSide, rankSurvivors, setAt } from './common';

export interface KillerDoublesOptions {
  /** Numéro de chaque côté, tiré au sort au lancement. */
  numbers: number[];
}

export const KD_START = 3;
export const KD_MAX = 5;

export interface KillerDoublesState {
  numbers: number[];
  lives: number[];
  outOrder: number[];
  taken: number[];
  regained: number[];
}

/** Killer Doubles : seuls les doubles comptent. Son double = +1 vie (5 max), celui d'un adversaire = −1 vie pour lui. */
export const killerDoublesRules: ModeRules<KillerDoublesState> = {
  validate(config) {
    if (config.teamMode) throw new Error('Killer Doubles se joue en individuel.');
    if (config.sides.length < 2) throw new Error('Il faut au moins 2 joueurs pour Killer Doubles.');
    const { numbers } = config.options as KillerDoublesOptions;
    if (numbers.length !== config.sides.length || new Set(numbers).size !== numbers.length)
      throw new Error('Numéros des joueurs invalides.');
  },
  init(config: GameConfig) {
    return {
      numbers: (config.options as KillerDoublesOptions).numbers,
      lives: perSide(config, KD_START),
      outOrder: perSide(config, 0),
      taken: perSide(config, 0),
      regained: perSide(config, 0),
    };
  },
  skipSide: (s, side) => s.outOrder[side] !== 0,
  applyDart(s, ctx, dart) {
    const me = ctx.sideIndex;
    if (dart.multiplier !== 2) return { state: s, points: 0 };
    const owner = s.numbers.indexOf(dart.segment);
    if (owner < 0 || s.outOrder[owner] !== 0) return { state: s, points: 0 };
    if (owner === me) {
      if (s.lives[me]! >= KD_MAX) return { state: s, points: 0 };
      return {
        state: { ...s, lives: setAt(s.lives, me, s.lives[me]! + 1), regained: setAt(s.regained, me, s.regained[me]! + 1) },
        points: 1,
      };
    }
    const lives = setAt(s.lives, owner, s.lives[owner]! - 1);
    const outOrder = lives[owner]! <= 0 ? eliminate(s.outOrder, owner) : s.outOrder;
    const next = { ...s, lives, outOrder, taken: setAt(s.taken, me, s.taken[me]! + 1) };
    if (aliveCount(outOrder) <= 1) return { state: next, points: 1, winners: [me] };
    return { state: next, points: 1 };
  },
  onRoundEnd: () => null,
  ranking: (s) => rankSurvivors(s.outOrder, (i) => s.lives[i]!),
};
