// D. Horloge
import { describe, expect, it } from 'vitest';
import { currentStep, type ClockState } from './clock';
import { config, play } from '../../test/helpers';

const st = (s: { mode: unknown }) => s.mode as ClockState;
const step = (s: { mode: unknown }, side = 0) => currentStep(st(s), side);
const noBull = config('clock', { bullFinish: 'none' }, [{ id: 'a', name: 'A', playerIds: ['a'] }]);
const all20 = Array.from({ length: 20 }, (_, i) => `S${i + 1}`).join(' ');

describe('D. Horloge', () => {
  it('D01 : le numéro actif de départ est 1', () => {
    expect(step(play(config('clock'), ''))).toEqual({ number: 1 });
  });

  it('D02 : toucher le 1 fait passer au 2', () => {
    expect(step(play(config('clock'), 'S1'))).toEqual({ number: 2 });
  });

  it('D03 : un autre numéro ne fait pas progresser', () => {
    expect(step(play(config('clock'), 'S5'))).toEqual({ number: 1 });
  });

  it('D04 : un triple ne fait avancer que d’un en standard', () => {
    expect(step(play(config('clock'), 'T1'))).toEqual({ number: 2 });
  });

  it('D05 : en variante double obligatoire, un simple ne compte pas', () => {
    const cfg = config('clock', { required: 'double' });
    expect(step(play(cfg, 'S1'))).toEqual({ number: 1 });
    expect(step(play(cfg, 'D1'))).toEqual({ number: 2 });
  });

  it('D06 : sans Bull final, la partie se termine au 20', () => {
    const s = play(noBull, all20);
    expect(s.status).toBe('finished');
    expect(s.winners).toEqual([0]);
    expect(s.ranking[0]!.value).toBe(20); // 20 fléchettes
  });

  it('D07 : avec Bull final, il faut le Bull pour finir (25 ou 50)', () => {
    const solo = [{ id: 'a', name: 'A', playerIds: ['a'] }];
    const cfg = config('clock', { bullFinish: 'any' }, solo);
    expect(play(cfg, all20).status).toBe('in_progress');
    expect(play(cfg, `${all20} 25`).status).toBe('finished');
    expect(play(cfg, `${all20} 50`).status).toBe('finished');
  });

  it('option 2 : 25 puis 50', () => {
    const cfg = config('clock', { bullFinish: 'both' }, [{ id: 'a', name: 'A', playerIds: ['a'] }]);
    expect(play(cfg, `${all20} 50`).status).toBe('in_progress');
    expect(play(cfg, `${all20} 25 50`).status).toBe('finished');
  });

  it('on enchaîne plusieurs numéros dans la même volée', () => {
    expect(step(play(config('clock'), 'S1 S2 S3'), 0)).toEqual({ number: 4 });
  });

  it('option : le double avance de 2, le triple de 3', () => {
    expect(step(play(config('clock', { advanceByMultiplier: true }), 'T1'))).toEqual({ number: 4 });
  });

  it('ordre du cadran', () => {
    const s = play(config('clock', { order: 'board' }), 'S20');
    expect(step(s)).toEqual({ number: 1 });
  });

  it('on finit la manche, puis le moins de fléchettes gagne', () => {
    const two = config('clock', { bullFinish: 'none' });
    const hits = (from: number, to: number) =>
      Array.from({ length: to - from + 1 }, (_, i) => `S${from + i}`).join(' ');
    // Le joueur 2 rate une fléchette à la première manche et garde un numéro de retard.
    const v: string[] = [hits(1, 3), 'S1 S2 0'];
    for (let r = 1; r < 6; r++) v.push(hits(r * 3 + 1, r * 3 + 3), hits(r * 3, r * 3 + 2));
    const beforeLast = play(two, v.join(' '));
    v.push('S19 S20');
    // Le joueur 1 a fini en 20 fléchettes : la manche continue pour le joueur 2.
    expect(play(two, v.join(' ')).status).toBe('in_progress');
    v.push('S18 S19 S20');
    const s = play(two, v.join(' '));
    expect(beforeLast.status).toBe('in_progress');
    expect(s.status).toBe('finished');
    expect(s.winners).toEqual([0]);
    expect(s.ranking.map((r) => r.value)).toEqual([20, 21]);
  });

  it('égalité de fléchettes en fin de manche : ex aequo', () => {
    const two = config('clock', { bullFinish: 'none' });
    const v: string[] = [];
    for (let i = 0; i < 7; i++) {
      const nums = [i * 3 + 1, i * 3 + 2, i * 3 + 3].filter((n) => n <= 20).map((n) => `S${n}`).join(' ');
      v.push(nums, nums);
    }
    const s = play(two, v.join(' '));
    expect(s.winners).toEqual([0, 1]);
  });
});
