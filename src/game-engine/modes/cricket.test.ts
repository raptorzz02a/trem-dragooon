// C. Cricket
import { describe, expect, it } from 'vitest';
import { isClosed, type CricketState } from './cricket';
import { config, play } from '../../test/helpers';

const cs = (s: { mode: unknown }) => s.mode as CricketState;
const idx = (s: CricketState, n: number) => s.targets.indexOf(n);
const std = config('cricket');
// Le joueur 1 ferme tout (20 à 15 en triple, Bull en 50 + 25), le joueur 2 rate.
const closeAllP1 = 'T20 T19 T18 0 0 0 T17 T16 T15 0 0 0 50 25';

describe('C. Cricket', () => {
  it('C01 : trois simples ferment le 20', () => {
    const s = cs(play(std, 'S20 S20 S20'));
    expect(isClosed(s, 0, idx(s, 20))).toBe(true);
  });

  it('C02 : un double sur le 20 donne deux marques', () => {
    const s = cs(play(std, 'D20'));
    expect(s.marks[0]![idx(s, 20)]).toBe(2);
  });

  it('C03 : un triple ferme le 19', () => {
    const s = cs(play(std, 'T19'));
    expect(isClosed(s, 0, idx(s, 19))).toBe(true);
  });

  it('C04 : une marque en trop rapporte si l’adversaire n’a pas fermé', () => {
    const s = cs(play(std, 'T20 S20'));
    expect(s.points[0]).toBe(20);
  });

  it('C04 bis : un triple sur un numéro à deux marques ferme et rapporte une marque', () => {
    expect(cs(play(std, 'D20 T20')).points[0]).toBe(40);
  });

  it('C05 : rien ne rapporte sur un numéro fermé par tous', () => {
    const s = cs(play(std, 'T20 0 0 T20 0 0 S20'));
    expect(s.points).toEqual([0, 0]);
  });

  it('C06 : tout fermé et score au moins égal = victoire', () => {
    const s = play(std, closeAllP1);
    expect(s.status).toBe('finished');
    expect(s.winners).toEqual([0]);
  });

  it('C06 bis : à égalité de points, fermer tout suffit (règle « au moins égal »)', () => {
    // Le joueur 2 marque 36 sur le 18, le joueur 1 ferme tout puis remonte avec S20 et S16.
    const base = 'S1 0 0 T18 D18 0 T20 T19 T18 0 0 0 T17 T16 T15 0 0 0 50 25 S20 0 0 0';
    const before = play(std, base);
    expect(cs(before).points).toEqual([20, 36]);
    expect(before.status).toBe('in_progress');
    const tied = play(std, `${base} S16`);
    expect(cs(tied).points).toEqual([36, 36]);
    expect(tied.winners).toEqual([0]);
  });

  it('C07 : tout fermé mais score inférieur, la partie continue', () => {
    const s = play(std, 'S1 0 0 T20 S20 S20 T19 T18 T17 0 0 0 T16 T15 50 0 0 0 25');
    expect(s.status).toBe('in_progress');
  });

  it('C08 : sans Bull, le Bull n’est pas requis', () => {
    const s = play(config('cricket', { bull: false }), 'T20 T19 T18 0 0 0 T17 T16 T15');
    expect(cs(s).targets).not.toContain(25);
    expect(s.status).toBe('finished');
  });

  it('les numéros hors cricket et le raté ne comptent rien', () => {
    const s = cs(play(std, 'T14 S1 0'));
    expect(s.marks[0]!.every((m) => m === 0)).toBe(true);
    expect(s.points[0]).toBe(0);
  });

  it('à 3 joueurs, on marque tant qu’un adversaire n’a pas fermé', () => {
    const three = config('cricket', {}, [
      { id: 'a', name: 'A', playerIds: ['a'] },
      { id: 'b', name: 'B', playerIds: ['b'] },
      { id: 'c', name: 'C', playerIds: ['c'] },
    ]);
    const s = cs(play(three, 'T20 0 0 T20 0 0 0 0 0 S20'));
    expect(s.points[0]).toBe(20);
  });

  it('cut-throat : les points vont aux adversaires qui n’ont pas fermé', () => {
    const s = cs(play(config('cricket', { variant: 'cutthroat' }), 'T20 S20'));
    expect(s.points).toEqual([0, 20]);
  });

  it('limite de manches : plus de points, puis plus de marques', () => {
    const s = play(config('cricket', { maxRounds: 1 }), 'T20 S20 0 T19 0 0');
    expect(s.status).toBe('finished');
    expect(s.winners).toEqual([0]);
    const tie = play(config('cricket', { maxRounds: 1 }), 'S20 0 0 D20 0 0');
    expect(tie.winners).toEqual([1]);
  });
});
