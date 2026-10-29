// E. Chiffre aléatoire
import { describe, expect, it } from 'vitest';
import { drawTargets, RANDOM_TARGETS, type RandomState } from './random';
import { config, play, teams } from '../../test/helpers';

const st = (s: { mode: unknown }) => s.mode as RandomState;
const misses = (turns: number) => Array(turns).fill('/').join(' ');
const targets = [5, 20, 25, 1, 5, 7, 8, 9, 10, 11];
const cfg = (extra = {}) => config('random', { rounds: 10, targets, ...extra });

describe('E. Chiffre aléatoire', () => {
  it('E01 : seul le numéro tiré rapporte', () => {
    const s = st(play(cfg(), 'S5 S2 T20'));
    expect(s.target).toBe(5);
    expect(s.scores[0]).toBe(5);
  });

  it('E02 : simple, double et triple du numéro comptent', () => {
    expect(st(play(cfg(), 'S5 D5 T5')).scores[0]).toBe(30);
  });

  it('E03 : un nouveau numéro à chaque manche', () => {
    const s = play(cfg(), '/ / T20');
    expect(st(s).target).toBe(20);
    expect(st(s).scores[0]).toBe(60);
  });

  it('E04 : manche du Bull, 25 et 50', () => {
    expect(st(play(cfg(), `${misses(4)} 25 50 S5`)).scores[0]).toBe(75);
  });

  it('E05 : fin après le dernier tour, le plus de points gagne', () => {
    const s = play(cfg(), `S5 / ${misses(19)}`);
    expect(s.status).toBe('finished');
    expect(s.winners).toEqual([0]);
    expect(s.ranking.map((r) => r.value)).toEqual([5, 0]);
    expect(play(cfg(), `S5 / ${misses(18)}`).status).toBe('in_progress');
  });

  it('E06 : en équipe, le total est collectif et les joueurs se relaient', () => {
    const t = play(config('random', { rounds: 10, targets }, teams(2, 1)), 'S5 S5 / T5 / T20 / S20');
    expect(st(t).scores).toEqual([10 + 60, 15 + 20]);
    expect(t.turns.map((x) => x.playerId)).toEqual(['p1', 'p3', 'p2']);
  });

  it('égalité finale : ex aequo', () => {
    expect(play(cfg(), misses(20)).winners).toEqual([0, 1]);
  });

  it('tirage : un numéro par manche, de 1 à 20 ou le Bull, jamais deux fois de suite', () => {
    let seed = 1;
    const rng = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (const rounds of [10, 15, 20]) {
      const t = drawTargets(rounds, rng);
      expect(t).toHaveLength(rounds);
      t.forEach((n, i) => {
        expect(RANDOM_TARGETS).toContain(n);
        if (i > 0) expect(n).not.toBe(t[i - 1]);
      });
    }
  });
});
