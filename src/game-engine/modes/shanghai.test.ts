// E. Shanghai
import { describe, expect, it } from 'vitest';
import { shanghaiRemaining, type ShanghaiState } from './shanghai';
import { config, play, teams } from '../../test/helpers';

const st = (s: { mode: unknown }) => s.mode as ShanghaiState;
const misses = (turns: number) => Array(turns).fill('/').join(' ');

describe('E. Shanghai', () => {
  it('E01 : au tour 1, seul le 1 rapporte', () => {
    const s = st(play(config('shanghai'), 'S1 S2 T20'));
    expect(s.scores[0]).toBe(1);
  });

  it('E02 : au tour 10, T10 rapporte 30', () => {
    const s = play(config('shanghai'), `${misses(18)} T10`);
    expect(st(s).target).toBe(10);
    expect(st(s).scores[0]).toBe(30);
  });

  it('E03 : un autre numéro ne rapporte rien', () => {
    expect(st(play(config('shanghai'), 'S5 D7 50')).scores[0]).toBe(0);
  });

  it('E04 : classement final après le tour 20', () => {
    const s = play(config('shanghai'), `S1 / ${misses(39)}`);
    expect(s.status).toBe('finished');
    expect(s.winners).toEqual([0]);
    expect(s.ranking.map((r) => r.value)).toEqual([1, 0]);
  });

  it('E05 : simple, double et triple au même tour = victoire immédiate', () => {
    const s = play(config('shanghai'), 'D1 T1 S1');
    expect(s.status).toBe('finished');
    expect(s.winners).toEqual([0]);
  });

  it('E05 bis : la victoire immédiate passe devant un adversaire qui a plus de points', () => {
    const s = play(config('shanghai'), 'T1 T1 T1 0 0 0 T2 T2 T2 S2 D2 T2');
    expect(st(s).scores).toEqual([27, 12]);
    expect(s.winners).toEqual([1]);
    expect(s.ranking[0]).toMatchObject({ sideIndex: 1, rank: 1 });
  });

  it('E06 : variante désactivée, les points comptent normalement', () => {
    const s = play(config('shanghai', { shanghaiWins: false }), 'D1 T1 S1');
    expect(s.status).toBe('in_progress');
    expect(st(s).scores[0]).toBe(6);
  });

  it('E07 : en équipe, le total est collectif et les joueurs se relaient', () => {
    const s = play(config('shanghai', {}, teams(2, 1)), 'S1 S1 / T1 / T2 / S2');
    expect(st(s).scores).toEqual([2 + 6, 3 + 2]);
    expect(s.turns.map((t) => t.playerId)).toEqual(['p1', 'p3', 'p2']);
  });

  it('affiche ce qu’il reste à toucher pour le Shanghai', () => {
    expect(shanghaiRemaining(st(play(config('shanghai'), 'T1')))).toEqual([1, 2]);
  });

  it('partie courte en 7 tours', () => {
    expect(play(config('shanghai', { rounds: 7 }), misses(14)).status).toBe('finished');
    expect(play(config('shanghai', { rounds: 7 }), misses(13)).status).toBe('in_progress');
  });

  it('égalité finale : ex aequo', () => {
    expect(play(config('shanghai', { rounds: 7 }), misses(14)).winners).toEqual([0, 1]);
  });
});
