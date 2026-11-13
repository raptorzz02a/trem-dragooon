import type { ModeRules } from '../rules';
import type { GameConfig } from '../types';
import { aliveCount, eliminate, perSide, rankSurvivors, setAt } from './common';
import { NUMBERS, pick } from './zones';

export interface BombeOptions {
  lives: 1 | 3;
  /** Longueur de mèche à chaque nouvelle bombe (8 à 12), tirées au lancement. */
  fuses: number[];
  /** Numéro à viser à chaque volée, tirés au lancement. */
  numbers: number[];
}

export function drawBombe(rng: () => number = Math.random): Pick<BombeOptions, 'fuses' | 'numbers'> {
  return {
    fuses: Array.from({ length: 60 }, () => 8 + Math.floor(rng() * 5)),
    numbers: Array.from({ length: 400 }, () => pick(NUMBERS, rng)),
  };
}

export const FUSE_HIT = 1;
export const FUSE_MISS = -2;

export interface BombeState {
  maxLives: number;
  fuses: number[];
  numbers: number[];
  /** Mèche restante de la bombe commune. */
  fuse: number;
  /** Bombes posées (index de la mèche en cours). */
  bombs: number;
  /** Volées jouées (pour le numéro à viser). */
  turns: number;
  lives: number[];
  outOrder: number[];
  explosions: number[];
}

export const bombeTarget = (s: BombeState) => s.numbers[s.turns % s.numbers.length]!;

/**
 * La Bombe (patate chaude) : une bombe commune dont la mèche se compte en fléchettes. Toucher le numéro du tour
 * rallonge la mèche de 1, rater la raccourcit de 2. Elle explose chez celui qui la fait tomber à 0 : il perd une vie.
 */
export const bombeRules: ModeRules<BombeState> = {
  validate(config) {
    if (config.teamMode) throw new Error('La Bombe se joue en individuel.');
    if (config.sides.length < 2) throw new Error('Il faut au moins 2 joueurs pour La Bombe.');
  },
  init(config: GameConfig) {
    const o = config.options as BombeOptions;
    return {
      maxLives: o.lives,
      fuses: o.fuses,
      numbers: o.numbers,
      fuse: o.fuses[0]!,
      bombs: 0,
      turns: -1,
      lives: perSide(config, o.lives),
      outOrder: perSide(config, 0),
      explosions: perSide(config, 0),
    };
  },
  skipSide: (s, side) => s.outOrder[side] !== 0,
  onTurnStart: (s) => ({ ...s, turns: s.turns + 1 }),
  applyDart(s, ctx, dart) {
    const hit = dart.segment === bombeTarget(s);
    const fuse = s.fuse + (hit ? FUSE_HIT : FUSE_MISS);
    if (fuse > 0) return { state: { ...s, fuse }, points: hit ? FUSE_HIT : FUSE_MISS };
    const me = ctx.sideIndex;
    const lives = setAt(s.lives, me, s.lives[me]! - 1);
    const outOrder = lives[me]! <= 0 ? eliminate(s.outOrder, me) : s.outOrder;
    const bombs = s.bombs + 1;
    const next: BombeState = {
      ...s,
      lives,
      outOrder,
      bombs,
      fuse: s.fuses[bombs % s.fuses.length]!,
      explosions: setAt(s.explosions, me, s.explosions[me]! + 1),
    };
    if (aliveCount(outOrder) <= 1) {
      return { state: next, points: FUSE_MISS, winners: outOrder.map((o, i) => (o === 0 ? i : -1)).filter((i) => i >= 0) };
    }
    return { state: next, points: FUSE_MISS, endTurn: true };
  },
  onRoundEnd: () => null,
  ranking: (s) => rankSurvivors(s.outOrder, (i) => s.lives[i]!),
};
