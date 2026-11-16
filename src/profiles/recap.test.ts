import { describe, expect, it } from 'vitest';
import { computeState } from '../game-engine/engine';
import { D, INNER_BULL, MISS, S, T, type Dart } from '../game-engine/darts';
import { config, players } from '../test/helpers';
import { recap } from './recap';

function turnsOf(darts: Dart[], playerId = 'p1') {
  const cfg = { ...config('training', {}, players(1)), training: true };
  const state = computeState(cfg, [...darts.map((dart) => ({ type: 'dart' as const, dart })), { type: 'finish' as const }]);
  return state.turns.filter((t) => t.playerId === playerId);
}

describe('bilan de fin d’entraînement', () => {
  it('compte fléchettes, points, moyenne, meilleure volée et répartition S/D/T', () => {
    const r = recap(turnsOf([T(20), T(20), S(20), S(1), D(16), MISS, INNER_BULL, S(20)]));
    expect(r.darts).toBe(8);
    expect(r.points).toBe(60 + 60 + 20 + 1 + 32 + 0 + 50 + 20);
    expect(r.avg3).toBeCloseTo((3 * 243) / 8);
    expect(r.bestVolley).toBe(140);
    expect(r.rings).toEqual({ single: 37.5, double: 12.5, triple: 25, bull: 12.5, miss: 12.5 });
    expect(r.zones[0]).toEqual({ zone: 'S20', count: 2, share: 25 });
    expect(r.zones[1]).toEqual({ zone: 'T20', count: 2, share: 25 });
    expect(r.zones).toHaveLength(6);
  });

  it('sans fléchette : rien à diviser', () => {
    const r = recap([]);
    expect(r).toMatchObject({ darts: 0, points: 0, avg3: null, bestVolley: null, zones: [] });
    expect(r.rings.single).toBe(0);
  });
});
