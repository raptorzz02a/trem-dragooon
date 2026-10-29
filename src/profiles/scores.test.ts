import { describe, expect, it } from 'vitest';
import type { X01Options } from '../game-engine/types';
import { config, players } from '../test/helpers';
import { profile, record } from '../test/records';
import { playerCsv } from './export';
import {
  comparePeriods,
  histogramBins,
  progression,
  scoreProfile,
  scoreRankings,
  scoreRecords,
  volleys,
  x01Closure,
} from './scores';
import { playerGames } from './stats';

const x01 = (o: Partial<X01Options> = {}, sides = players(2)) => config('x01', { startScore: 301, ...o }, sides);
// 301 Double Out : p1 marque 180, 81 puis 40 (victoire en 3 volées, 6 fléchettes) ; p2 marque 3 à chaque volée.
const x01Win = 'T20 T20 T20 S1 S1 S1 T20 T7 / S1 S1 S1 D20';
const games = (recs: ReturnType<typeof record>[], id = 'p1') => playerGames(recs, id);

describe('Avenant statistiques : scores par volée', () => {
  it('moyenne, écart type, record et nombre de fois où il est égalé', () => {
    const p = scoreProfile(games([record(x01(), x01Win), record(x01(), x01Win)]), 'x01', [100, 140], 20);
    expect(p.volleys).toBe(6);
    expect(p.games).toBe(2);
    expect(p.average).toBeCloseTo(301 / 3);
    const sd = Math.sqrt(((180 - 301 / 3) ** 2 + (81 - 301 / 3) ** 2 + (40 - 301 / 3) ** 2) / 3);
    expect(p.stdDev).toBeCloseTo(sd);
    expect([p.best, p.bestCount]).toEqual([180, 2]);
    expect(p.thresholds).toEqual([
      { threshold: 100, count: 2, share: (100 * 2) / 6 },
      { threshold: 140, count: 2, share: (100 * 2) / 6 },
    ]);
  });

  it('histogramme par tranches de 20 : 0–20, 21–40… et toutes les volées comptées une fois', () => {
    const p = scoreProfile(games([record(x01(), x01Win)], 'p2'), 'x01', [], 20);
    expect(p.histogram[0]).toMatchObject({ from: 0, to: 20, count: 2, share: 100 });
    expect(p.histogram[1]).toMatchObject({ from: 21, to: 40 });
    expect(p.histogram.at(-1)).toMatchObject({ from: 161, to: 180 });
    expect(p.histogram.reduce((a, b) => a + b.count, 0)).toBe(p.volleys);
  });

  it('un bust vaut 0 et compte comme une volée', () => {
    // p1 : 180, 81 (reste 40), puis S20 S19 = bust, puis D20.
    const script = 'T20 T20 T20 S1 S1 S1 T20 T7 / S1 S1 S1 S20 S19 S1 S1 S1 D20';
    expect(volleys(games([record(x01(), script)]), 'x01').map((v) => v.value)).toEqual([180, 81, 0, 40]);
  });

  it('au Cricket, une volée vaut ses marques ; une tranche par nombre de marques', () => {
    const script = 'T20 T20 S5 S1 S1 S1 T19 S19 / S1 S1 S1';
    const g = games([record(config('cricket', { maxRounds: 2 }), script)]);
    expect(volleys(g, 'cricket').map((v) => v.value)).toEqual([6, 4]);
    expect(histogramBins('cricket', 20)).toHaveLength(10);
  });

  it('sans aucune volée, les valeurs sont « non disponibles » (null), pas 0', () => {
    const p = scoreProfile([], 'shanghai', [60], 20);
    expect([p.average, p.stdDev, p.best]).toEqual([null, null, null]);
    expect(p.thresholds[0]!.share).toBeNull();
  });
});

describe('Avenant statistiques : progression et périodes', () => {
  // Septembre en sortie simple : 180 puis 121.
  const sept = record(x01({ out: 'straight' }), 'T20 T20 T20 S1 S1 S1 T20 T20 S1', '2026-09-15T20:00:00.000Z');
  const oct = record(x01(), x01Win, '2026-10-15T20:00:00.000Z');

  it('moyenne par mois, dans l’ordre chronologique', () => {
    const pts = progression(games([oct, sept]), 'x01', 'month');
    expect(pts.map((p) => [p.start.getMonth(), p.volleys, Math.round(p.average)])).toEqual([
      [8, 2, 151],
      [9, 3, 100],
    ]);
  });

  it('les semaines commencent le lundi', () => {
    const [pt] = progression(games([oct]), 'x01', 'week'); // jeudi 15 octobre 2026
    expect([pt!.start.getDate(), pt!.start.getDay()]).toEqual([12, 1]);
  });

  it('comparaison avec la période précédente de même durée, en points et en %', () => {
    const c = comparePeriods([sept, oct], 'p1', { mode: 'x01', from: '2026-10-01T00:00:00.000Z', to: '2026-10-31T00:00:00.000Z' });
    expect(c.current.games).toBe(1);
    expect(c.previous).toMatchObject({ games: 1, wins: 1 }); // du 1er au 30 septembre
    expect(c.previous.average).toBeCloseTo(150.5);
    expect(c.averageDelta).toBeCloseTo(301 / 3 - 150.5);
    expect(c.averageDeltaPct).toBeCloseTo((100 * (301 / 3 - 150.5)) / 150.5);
    // Une semaine en octobre : la semaine précédente est vide, l'écart n'est pas calculable.
    const week = comparePeriods([sept, oct], 'p1', { mode: 'x01', from: '2026-10-12T00:00:00.000Z', to: '2026-10-19T00:00:00.000Z' });
    expect([week.previous.games, week.averageDelta]).toEqual([0, null]);
  });
});

describe('Avenant statistiques : X01, records, classements, export', () => {
  it('clôture : volées et fléchettes pour finir une partie gagnée', () => {
    const [c] = x01Closure(games([record(x01(), x01Win), record(x01(), x01Win)]));
    expect(c).toMatchObject({ variant: '301 · Double Out', wins: 2, avgVolleys: 3, avgDarts: 6, bestDarts: 6 });
    expect(x01Closure(games([record(x01(), x01Win)], 'p2'))[0]).toMatchObject({ wins: 0, avgDarts: null });
  });

  it('records : meilleure volée et meilleure moyenne sur une partie d’au moins 3 volées', () => {
    const short = record(x01({ out: 'straight' }), 'T20 T20 T20 S1 S1 S1 T20 T20 S1'); // 2 volées
    const r = scoreRecords(games([short, record(x01(), x01Win)]), 'x01');
    expect(r.bestVolley!.value).toBe(180);
    expect(r.bestGameAverage).toMatchObject({ volleys: 3 });
    expect(r.bestGameAverage!.value).toBeCloseTo(301 / 3);
  });

  it('classement par moyenne, par record de volée et par progression', () => {
    const recs = [record(x01(), x01Win), record(x01(), x01Win)];
    const ps = [profile('p1', 'Alice'), profile('p2', 'Bruno')];
    const byAvg = scoreRankings(recs, ps, { mode: 'x01' }, 'average', 1);
    expect(byAvg.ranked.map((r) => [r.name, Math.round(r.average!)])).toEqual([
      ['Alice', 100],
      ['Bruno', 3],
    ]);
    expect(scoreRankings(recs, ps, { mode: 'x01' }, 'bestVolley', 1).ranked.map((r) => r.bestVolley)).toEqual([180, 3]);
    // Sans période choisie, la progression n'est pas calculable.
    expect(scoreRankings(recs, ps, { mode: 'x01' }, 'progression', 1).ranked.map((r) => r.progression)).toEqual([null, null]);
  });

  it('export CSV : une ligne par volée, séparateur « ; »', () => {
    const csv = playerCsv(games([record(x01(), x01Win)]));
    const lines = csv.replace('﻿', '').split('\r\n');
    expect(lines).toHaveLength(4);
    expect(lines[0]).toContain('Valeur de la volée');
    expect(lines[1]).toContain(';T20 T20 T20;180;points;');
    expect(lines[3]).toContain(';D20;40;points;victoire;victoire');
  });
});
