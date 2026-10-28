// B. Modes 301, 501 et 701
import { describe, expect, it } from 'vitest';
import { suggestCheckout } from '../checkout';
import { formatDart } from '../darts';
import type { X01State } from './x01';
import { config, play } from '../../test/helpers';

const remaining = (s: { mode: unknown }) => (s.mode as X01State).remaining;
const so = config('x01', { out: 'straight' });
const dout = config('x01', { out: 'double' });

describe('B. 301 / 501 / 701', () => {
  it.each([301, 501, 701] as const)('B01 : chaque joueur commence à %i', (start) => {
    expect(remaining(play(config('x01', { startScore: start }), ''))).toEqual([start, start]);
  });

  it('B02 : T20 T20 T20 en Straight Out laisse 321', () => {
    expect(remaining(play(so, 'T20 T20 T20'))[0]).toBe(321);
  });

  // 501 - 180 - 180 - 101 = 40 pour le joueur 1, le joueur 2 rate tout.
  const to40 = 'T20 T20 T20 0 0 0 T20 T20 T20 0 0 0 T20 T7 S20';

  it('B03 : finir sur un simple en Double Out = bust, retour au score du début de volée', () => {
    const s = play(dout, `${to40} 0 0 0 S20 S20`);
    expect(s.turns.at(-1)!.outcome).toBe('bust');
    expect(remaining(s)[0]).toBe(40);
    expect(s.status).toBe('in_progress');
  });

  it('B04 : arriver à 1 en Double Out = bust', () => {
    const s = play(dout, `${to40} 0 0 0 S19 S20`);
    expect(s.turns.at(-1)!.outcome).toBe('bust');
    expect(remaining(s)[0]).toBe(40);
  });

  it('B04 bis : arriver à 1 est permis en Straight Out', () => {
    expect(remaining(play(so, `${to40} 0 0 0 S19 S20`))[0]).toBe(1);
  });

  it('B05 : dépasser zéro = bust', () => {
    const s = play(so, `${to40} 0 0 0 T20`);
    expect(s.turns.at(-1)!.outcome).toBe('bust');
    expect(remaining(s)[0]).toBe(40);
  });

  it('B06 : finir sur un double valide termine la partie', () => {
    const s = play(dout, `${to40} 0 0 0 D20`);
    expect(s.status).toBe('finished');
    expect(s.winners).toEqual([0]);
    expect(s.current).toBeNull();
    expect(s.ranking[0]).toMatchObject({ sideIndex: 0, rank: 1, value: 0 });
  });

  it('B07 : Bull intérieur finit en Double Out quand il reste 50', () => {
    const to50 = 'T20 T20 T20 0 0 0 T20 T20 T20 0 0 0 T20 T7 S10';
    expect(remaining(play(dout, to50))[0]).toBe(50);
    const s = play(dout, `${to50} 0 0 0 50`);
    expect(s.status).toBe('finished');
    expect(s.winners).toEqual([0]);
  });

  it('B08 : pas de Double In (supprimé du périmètre) : le premier simple décompte', () => {
    expect(remaining(play(dout, 'S5'))[0]).toBe(496);
  });

  it('B09 : bust après trois fléchettes, retour au début de volée', () => {
    const s = play(so, `${to40} 0 0 0 S20 S10 S20`);
    expect(s.turns.at(-1)!.outcome).toBe('bust');
    expect(remaining(s)[0]).toBe(40);
  });

  it('B10 : bust à la deuxième fléchette, la troisième est consommée', () => {
    const s = play(so, `${to40} 0 0 0 S20 T20 S1`);
    const bustTurn = s.turns.at(-1)!;
    expect(bustTurn.outcome).toBe('bust');
    expect(bustTurn.darts).toHaveLength(2);
    // la fléchette suivante appartient au joueur 2
    expect(s.current!.playerId).toBe('p2');
    expect(remaining(s)).toEqual([40, 500]);
  });

  it('la partie terminée n’accepte plus de lancers', () => {
    const s = play(dout, `${to40} 0 0 0 D20 T20 T20`);
    expect(s.ignoredEvents).toBe(2);
    expect(remaining(s)[1]).toBe(501);
  });

  it('limite de manches : le plus petit reste gagne', () => {
    const s = play(config('x01', { maxRounds: 1 }), 'T20 0 0 T19 0 0');
    expect(s.status).toBe('finished');
    expect(s.winners).toEqual([0]);
  });
});

describe('Suggestions de finition', () => {
  const fmt = (r: number, left: number, out: 'straight' | 'double' = 'double') =>
    suggestCheckout(r, left, out)?.map(formatDart).join(' ') ?? null;

  it('finitions classiques en Double Out', () => {
    expect(fmt(170, 3)).toBe('T20 T20 50');
    expect(fmt(100, 3)).toBe('T20 D20');
    expect(fmt(40, 3)).toBe('D20');
    expect(fmt(32, 1)).toBe('D16');
    expect(fmt(50, 1)).toBe('50');
    expect(fmt(3, 2)).toBe('S1 D1');
  });

  it('pas de suggestion impossible', () => {
    expect(fmt(169, 3)).toBeNull();
    expect(fmt(171, 3)).toBeNull();
    expect(fmt(1, 3)).toBeNull();
    expect(fmt(100, 1)).toBeNull();
    expect(fmt(41, 1)).toBeNull();
  });

  it('en Straight Out, une seule fléchette suffit quand c’est possible', () => {
    expect(fmt(57, 1, 'straight')).toBe('T19');
    expect(fmt(180, 3, 'straight')).toBe('T20 T20 T20');
  });

  it('chaque suggestion en Double Out est exacte et finit sur un double, de 2 à 170', () => {
    for (let r = 2; r <= 170; r++) {
      const s = suggestCheckout(r, 3, 'double');
      if (!s) continue;
      expect(s.reduce((a, d) => a + d.segment * d.multiplier, 0)).toBe(r);
      expect(s.at(-1)!.multiplier).toBe(2);
    }
    const impossible = [159, 162, 163, 165, 166, 168, 169];
    for (const r of impossible) expect(suggestCheckout(r, 3, 'double')).toBeNull();
  });
});
