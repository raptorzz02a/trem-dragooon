// F. Joueurs et équipes
import { describe, expect, it } from 'vitest';
import { computeState, validateConfig } from '../game-engine/engine';
import { assignPlayer, emptyTeams, moveSide, randomOrder, randomTeams, TEAM_COLORS } from './teams';
import { config, play, players, teams } from '../test/helpers';

// Générateur déterministe pour des tests reproductibles.
function seeded(seed: number) {
  return () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
}

describe('F. Joueurs et équipes', () => {
  it('F01 : partie à 1 joueur (entraînement)', () => {
    const cfg = config('x01', {}, players(1));
    expect(cfg.training).toBe(true);
    const s = play(cfg, 'T20 T20 T20 T20');
    expect(s.current!.playerId).toBe('p1');
    expect(s.current!.round).toBe(1);
  });

  it('F02 : 10 joueurs gérés, 11 refusés', () => {
    const s = play(config('x01', {}, players(10)), Array(30).fill('S1').join(' '));
    expect(s.current!.round).toBe(1);
    expect(s.current!.playerId).toBe('p1');
    expect(() => validateConfig(config('x01', {}, players(11)))).toThrow(/10 joueurs/);
  });

  it('F03 : équipes de tailles différentes (7 joueurs : 2, 2 et 3)', () => {
    expect(() => validateConfig(config('x01', {}, teams(2, 2, 3)))).not.toThrow();
  });

  it('équipes : entre 2 et 5, au moins un joueur chacune, un joueur dans une seule équipe', () => {
    expect(() => validateConfig(config('x01', {}, teams(5)))).toThrow(/entre 2 et 5/);
    expect(() => validateConfig(config('x01', {}, teams(2, 2, 2, 2, 1, 1)))).toThrow(/entre 2 et 5/);
    expect(() => validateConfig(config('x01', {}, [...teams(2), { id: 't9', name: 'Vide', playerIds: [] }]))).toThrow(
      /au moins un joueur/,
    );
    const dup = teams(2, 2);
    dup[1]!.playerIds[0] = 'p1';
    expect(() => validateConfig(config('x01', {}, dup))).toThrow(/une seule équipe/);
  });

  it('F04 : un joueur ajouté à une équipe entre dans l’ordre de passage', () => {
    let sides = emptyTeams(2);
    for (const [p, t] of [['a', 'team-1'], ['b', 'team-2'], ['c', 'team-1']] as const) sides = assignPlayer(sides, p, t);
    const s = play(config('x01', {}, sides), '/ / / /');
    expect(s.turns.map((t) => t.playerId)).toEqual(['a', 'b', 'c', 'b']);
  });

  it('F05 : à la fin d’une volée, le prochain joueur et son équipe sont connus', () => {
    const s = play(config('x01', {}, teams(2, 3)), 'S20 S20 S20');
    expect(s.current).toMatchObject({ sideIndex: 1, playerId: 'p3', dartsLeft: 3 });
  });

  it('équipes déséquilibrées : alternance des équipes, rotation dans chaque équipe', () => {
    const s = play(config('x01', {}, teams(2, 2, 3)), Array(9).fill('/').join(' '));
    expect(s.turns.map((t) => t.playerId)).toEqual(['p1', 'p3', 'p5', 'p2', 'p4', 'p6', 'p1', 'p3', 'p7']);
  });

  it('X01 en équipe : score partagé, le changement de joueur ne le remet pas à zéro', () => {
    const s = play(config('x01', { out: 'straight' }, teams(2, 2)), 'T20 0 0 / T20');
    expect(s.mode).toMatchObject({ remaining: [501 - 60 - 60, 501] });
    expect(s.current!.playerId).toBe('p2');
  });

  it('F07 : modifier l’ordre avant le départ', () => {
    const sides = moveSide(players(3), 2, 0);
    const s = play(config('x01', {}, sides), '/');
    expect(s.turns[0]!.playerId).toBe('p3');
  });

  it('F08 : victoire d’une équipe', () => {
    const s = play(config('cricket', { bull: false }, teams(2, 1)), 'T20 T19 T18 0 / T17 T16 T15');
    expect(s.winners).toEqual([0]);
    expect(s.turns.at(-1)).toMatchObject({ playerId: 'p2', outcome: 'win' });
  });

  it('tirage aléatoire équilibré : 7 joueurs en 3 équipes = 3, 2, 2', () => {
    const ids = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];
    const t = randomTeams(ids, 3, seeded(42));
    expect(t.map((s) => s.playerIds.length)).toEqual([3, 2, 2]);
    expect(t.flatMap((s) => s.playerIds).sort()).toEqual(ids);
  });

  it('ordre aléatoire : tous les joueurs restent présents', () => {
    const sides = randomOrder(teams(2, 3), seeded(7));
    expect(sides.flatMap((s) => s.playerIds).sort()).toEqual(['p1', 'p2', 'p3', 'p4', 'p5']);
  });

  it('10 couleurs d’équipe distinctes', () => {
    expect(new Set(TEAM_COLORS.map((c) => c.hex)).size).toBe(10);
  });

  it('H10 : deux parties ne se contaminent pas', () => {
    const a = play(config('x01'), 'T20');
    const b = computeState(config('cricket'), []);
    expect(a.mode).not.toBe(b.mode);
    expect(computeState(config('x01'), []).mode).toMatchObject({ remaining: [501, 501] });
  });
});
