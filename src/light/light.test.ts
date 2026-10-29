import { describe, expect, it } from 'vitest';
import { computeState, D, INNER_BULL, MISS, OUTER_BULL, S, T, type Dart, type GameConfig, type GameEvent } from '../game-engine';
import { lightEffectFor } from './light';

const config: GameConfig = {
  mode: 'x01',
  options: { startScore: 301, out: 'double', maxRounds: null },
  teamMode: false,
  training: false,
  sides: [
    { id: 'a', name: 'A', playerIds: ['a'] },
    { id: 'b', name: 'B', color: '#3DA5FF', playerIds: ['b'] },
  ],
};
const colorOf = (i: number) => config.sides[i]!.color ?? '#FFD24D';
const darts = (...list: Dart[]): GameEvent[] => list.map((dart) => ({ type: 'dart', dart }));

/** Effet produit par le dernier événement de la liste. */
function effectAfter(events: GameEvent[]) {
  return lightEffectFor(computeState(config, events.slice(0, -1)), computeState(config, events), colorOf);
}

describe('effets lumineux', () => {
  it('triple et Bull : stroboscope', () => {
    expect(effectAfter(darts(T(20)))).toEqual({ effect: 'strobe' });
    expect(effectAfter(darts(OUTER_BULL))).toEqual({ effect: 'strobe' });
    expect(effectAfter(darts(INNER_BULL))).toEqual({ effect: 'strobe' });
  });

  it('double : vague, raté : rouge, simple : rien', () => {
    expect(effectAfter(darts(D(16)))).toEqual({ effect: 'wave' });
    expect(effectAfter(darts(MISS))).toEqual({ effect: 'red' });
    expect(effectAfter(darts(S(5)))).toBeNull();
  });

  it('la troisième fléchette, qui clôt la volée, compte aussi', () => {
    expect(effectAfter(darts(S(1), S(1), T(19)))).toEqual({ effect: 'strobe' });
  });

  it('bust : rouge, même sur un triple', () => {
    // A : 301 - 180 = 121, puis T20 T20 laisse 1 en sortie double : bust.
    const events = [...darts(T(20), T(20), T(20)), ...darts(S(1), S(1), S(1)), ...darts(T(20), T(20))];
    expect(effectAfter(events)).toEqual({ effect: 'red' });
  });

  it('victoire : couleur du gagnant', () => {
    const events = [
      ...darts(S(1), S(1), S(1)),
      ...darts(T(20), T(20), T(20)),
      ...darts(S(1), S(1), S(1)),
      ...darts(T(20), T(19), D(2)),
    ];
    expect(effectAfter(events)).toEqual({ effect: 'victory', color: '#3DA5FF' });
  });

  it('annulation ou arrivée en cours de partie : rien', () => {
    const before = computeState(config, darts(T(20), T(20)));
    const after = computeState(config, darts(T(20)));
    expect(lightEffectFor(before, after, colorOf)).toBeNull();
    expect(lightEffectFor(null, before, colorOf)).toBeNull();
  });
});
