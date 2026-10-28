// A. Saisie et calcul des points
import { describe, expect, it } from 'vitest';
import { dartScore, formatDart, isValidDart, parseDart } from './darts';
import { computeState } from './engine';
import { config, events, play } from '../test/helpers';

const x01 = config('x01', { out: 'straight' });

describe('A. Saisie et calcul des points', () => {
  it.each([
    ['A01', 'S20', 20],
    ['A02', 'D20', 40],
    ['A03', 'T20', 60],
    ['A04', '25', 25],
    ['A05', '50', 50],
    ['A06', '0', 0],
  ])('%s : %s vaut %i points', (_id, dart, points) => {
    expect(dartScore(parseDart(dart))).toBe(points);
    const state = play(x01, dart);
    expect(state.current!.darts[0]!.points).toBe(points);
    expect(state.current!.dartsLeft).toBe(2); // la fléchette est consommée, même ratée
  });

  it('A07 : sans fléchette saisie, aucun score ne change', () => {
    // Le choix du multiplicateur est un état d'écran : seule une fléchette complète atteint le moteur.
    const state = computeState(x01, []);
    expect(state.mode).toMatchObject({ remaining: [501, 501] });
  });

  it('A08 : annuler la dernière fléchette la retire et recalcule', () => {
    const evs = events('T20 T20');
    const after = computeState(x01, evs.slice(0, -1));
    expect(after.current!.darts).toHaveLength(1);
    expect(after.mode).toMatchObject({ remaining: [441, 501] });
  });

  it('A09 : terminer après deux fléchettes passe au joueur suivant sans fléchette fictive', () => {
    const state = play(x01, 'S20 S20 /');
    expect(state.turns[0]!.darts).toHaveLength(2);
    expect(state.turns[0]!.outcome).toBe('ended');
    expect(state.current!.playerId).toBe('p2');
    expect(state.current!.dartsLeft).toBe(3);
  });

  it('A10 : une quatrième fléchette ne peut pas aller au même joueur', () => {
    const state = play(x01, 'S1 S1 S1 S1');
    expect(state.turns[0]!.darts).toHaveLength(3);
    expect(state.current!.playerId).toBe('p2');
    expect(state.current!.darts).toHaveLength(1);
  });

  it('refuse les fléchettes impossibles (triple Bull, numéro 21, raté doublé)', () => {
    expect(isValidDart({ segment: 25, multiplier: 3 })).toBe(false);
    expect(isValidDart({ segment: 21, multiplier: 1 })).toBe(false);
    expect(isValidDart({ segment: 0, multiplier: 2 })).toBe(false);
    expect(() => computeState(x01, [{ type: 'dart', dart: { segment: 25, multiplier: 3 } }])).toThrow();
  });

  it('notation courte aller-retour', () => {
    for (const t of ['S1', 'D16', 'T20', '25', '50', '0']) expect(formatDart(parseDart(t))).toBe(t);
  });
});
