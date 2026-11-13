// Autres jeux, lots 2 à 4.
import { describe, expect, it } from 'vitest';
import { computeState } from '../engine';
import { config, events, play, players, teams } from '../../test/helpers';
import type { GameConfig, ModeOptions } from '../types';
import type { BaseballState } from './baseball';
import { baseballTotal } from './baseball';
import type { BermudaState } from './bermuda';
import type { BigSixState } from './bigsix';
import type { BombeState } from './bombe';
import type { Bobs27State } from './bobs27';
import type { CoffresState } from './coffres';
import { bestBonus, type ContratState } from './contrat';
import { dtSuccess, type DtChallengeState } from './dtchallenge';
import type { FivesState } from './fives';
import { golfTotal, type GolfState } from './golf';
import type { KillerDoublesState } from './killerdoubles';
import type { LowScoreState } from './lowscore';
import type { NineLivesState } from './ninelives';
import type { OneDartState } from './onedart';
import type { PyramideState } from './pyramide';
import type { RoiState } from './roi';
import type { SurvieState } from './survie';
import type { VingtEtUnState } from './vingtetun';
import { parseDart } from '../darts';

const cfg = (mode: ModeOptions['mode'], options: object, sides = players(2)) =>
  config(mode as never, options as never, sides) as GameConfig;
const st = <S>(s: { mode: unknown }) => s.mode as S;
const skip = (n: number) => Array(n).fill('/').join(' ');

describe('Baseball', () => {
  const c = (tiebreak = true, sides = players(2)) => cfg('baseball', { tiebreak }, sides);
  it('seul le numéro de la manche compte : simple 1, double 2, triple 3', () => {
    const s = st<BaseballState>(play(c(), 'S1 D1 T2 / S2 T2 S3'));
    expect(s.innings[0]).toEqual([3, 4]);
    expect(baseballTotal(s, 0)).toBe(7);
  });
  it('égalité après 9 manches : manche au Bull pour les seuls ex aequo', () => {
    const s = play(c(true, players(3)), `${skip(27)}`);
    expect(s.status).toBe('in_progress');
    const end = play(c(true, players(3)), `S1 / S1 / / ${skip(24)} 50 / 25 /`);
    expect(end.status).toBe('finished');
    expect(end.winners).toEqual([0]);
  });
  it('sans manche au Bull, ex aequo', () => {
    expect(play(c(false), skip(18)).winners).toEqual([0, 1]);
  });
});

describe("Bob's 27", () => {
  const c = (penalty = 'once', bull = true, sides = players(2)) => cfg('bobs27', { penalty, bull }, sides);
  it('un double rapporte sa valeur, aucun double coûte sa valeur une fois', () => {
    expect(st<Bobs27State>(play(c(), 'D1 D1 S1')).scores[0]).toBe(31);
    expect(st<Bobs27State>(play(c(), 'S1 S1 S1')).scores[0]).toBe(25);
  });
  it('à zéro on est éliminé et sauté', () => {
    // D1 −2 → 25, D2 −4 → 21, ... joueur 1 rate tout, joueur 2 touche tout
    let script = '';
    for (let n = 1; n <= 6; n++) script += `/ D${n} / `;
    const s = play(c(), script);
    expect(st<Bobs27State>(s).outOrder[0]).toBeGreaterThan(0); // 27-2-4-6-8-10 = -3
    expect(s.status).toBe('finished');
    expect(s.winners).toEqual([1]);
  });
  it('pénalité à chaque fléchette ratée', () => {
    expect(st<Bobs27State>(play(c('each'), 'S1 S1 D1')).scores[0]).toBe(25);
  });
});

describe('Golf', () => {
  const c = () => cfg('golf', { holes: 9 });
  it('la dernière fléchette compte, Fin de tour garde le coup', () => {
    expect(golfTotal(st<GolfState>(play(c(), 'D1 / ')), 0)).toBe(2);
    expect(golfTotal(st<GolfState>(play(c(), 'D1 S5 S1')), 0)).toBe(3);
    expect(golfTotal(st<GolfState>(play(c(), '/')), 0)).toBe(4);
  });
  it('un triple termine le trou', () => {
    const s = play(c(), 'T1');
    expect(s.current?.sideIndex).toBe(1);
    expect(golfTotal(st<GolfState>(s), 0)).toBe(1);
  });
  it('le plus petit total gagne', () => {
    expect(play(c(), `T1 / ${skip(17)}`).winners).toEqual([0]);
  });
});

describe('Bermuda', () => {
  const targets = [
    { segment: 14, ring: 'T' },
    { segment: 25, ring: 'D' },
    { segment: 3, ring: 'SO' },
  ];
  const c = () => cfg('bermuda', { goal: 200, targets });
  it('une touche rapporte la valeur, une volée ratée retire la valeur simple', () => {
    const s = st<BermudaState>(play(c(), 'T14 S14 / / 50 50 /'));
    expect(s.scores[0]).toBe(142);
    expect(s.scores[1]).toBe(0);
  });
  it('premier à l’objectif (on finit la manche)', () => {
    const s = play(c(), 'T14 T14 T14 / 50 50 50 /');
    expect(s.status).toBe('finished');
    expect(s.winners).toEqual([0]);
  });
});

describe('Fives', () => {
  const c = () => cfg('fives', { goal: 31 });
  it('volée divisible par 5 : total ÷ 5, sinon 0', () => {
    expect(st<FivesState>(play(c(), 'T5 S20 S10')).scores[0]).toBe(9);
    expect(st<FivesState>(play(c(), 'S1 S2 S3')).scores[0]).toBe(0);
  });
  it('dépasser l’objectif annule la volée ; pile = victoire en fin de manche', () => {
    const over = st<FivesState>(play(c(), 'T20 T20 T15'));
    expect(over.scores[0]).toBe(0);
    expect(over.over[0]).toBe(1);
    const win = play(c(), 'T20 T20 S15 / S10 S10 / /');
    expect(st<FivesState>(win).scores[0]).toBe(31);
    expect(win.status).toBe('finished');
    expect(win.winners).toEqual([0]);
  });
});

describe('21', () => {
  const c = () => cfg('vingtetun', { limit: 0 });
  it('au-delà de 21, la volée est annulée', () => {
    const s = play(c(), 'S20 / / S5');
    expect(st<VingtEtUnState>(s).scores[0]).toBe(20);
    expect(s.turns.at(-1)!.outcome).toBe('bust');
  });
  it('21 pile gagne en fin de manche', () => {
    const s = play(c(), 'S20 S1 S5 S5 /');
    expect(s.status).toBe('finished');
    expect(s.winners).toEqual([0]);
  });
});

describe('Low Score', () => {
  it('hors cible +50, le plus petit total gagne', () => {
    const s = play(cfg('lowscore', { rounds: 5 }), `S1 S1 0 S1 S1 S1 ${skip(8)}`);
    expect(st<LowScoreState>(s).scores).toEqual([52, 3]);
    expect(s.winners).toEqual([1]);
  });
});

describe('Nine Lives', () => {
  const c = (sides = players(2)) => cfg('ninelives', { lives: 5 }, sides);
  it('les numéros dans l’ordre, une volée vide coûte une vie', () => {
    const s = st<NineLivesState>(play(c(), 'S1 D2 S4 S5 S6 S7'));
    expect(s.progress).toEqual([2, 0]);
    expect(s.lives).toEqual([5, 4]);
  });
  it('le dernier en vie gagne', () => {
    const s = play(c(), `S1 / ${skip(1)} ${skip(8)}`);
    expect(s.status).toBe('finished');
    expect(s.winners).toEqual([0]);
  });
});

describe('Big Six', () => {
  const c = () => cfg('bigsix', { lives: 3, start: { segment: 6, ring: 'S' } }, players(3));
  it('toucher la cible, puis la fléchette suivante impose la nouvelle', () => {
    const s = st<BigSixState>(play(c(), 'S6 T20'));
    expect(s.target).toEqual({ segment: 20, ring: 'T' });
    expect(s.setter).toBe(0);
  });
  it('pas de touche : une vie en moins ; le dernier survivant gagne', () => {
    const s = st<BigSixState>(play(c(), 'S6 D16 S1 S1 S1'));
    expect(s.lives).toEqual([3, 2, 3]);
    const end = play(c(), 'S6 D16 / / D16 D16 / / D16 D16 / /');
    expect(end.status).toBe('finished');
    expect(end.winners).toEqual([0]);
  });
});

describe('Défi doubles et triples', () => {
  it('une touche valide le numéro et passe au suivant', () => {
    const s = play(cfg('dtchallenge', { kind: 'D' }), 'D1 S2 S2 S2');
    expect(dtSuccess(st<DtChallengeState>(s), 0)).toBe(1);
    expect(st<DtChallengeState>(s).results[1]).toEqual([false]);
  });
});

describe('Killer Doubles', () => {
  const c = () => cfg('killerdoubles', { numbers: [1, 2, 3] }, players(3));
  it('son double +1 vie (5 max), celui des autres −1', () => {
    const s = st<KillerDoublesState>(play(c(), 'D1 D2 T2'));
    expect(s.lives).toEqual([4, 2, 3]);
  });
  it('le dernier survivant gagne tout de suite', () => {
    const s = play(c(), 'D2 D2 D2 / / D1 D1 D1');
    expect(s.status).toBe('finished');
    expect(s.winners).toEqual([2]);
  });
});

describe('One Dart', () => {
  it('une seule fléchette, barème selon la zone', () => {
    const targets = [
      { segment: 10, ring: 'D' },
      { segment: 25, ring: 'D' },
    ];
    const s = play(cfg('onedart', { rounds: 10, targets }), 'D10 S1');
    expect(st<OneDartState>(s).scores).toEqual([2, 0]);
    expect(s.current?.round).toBe(1);
  });
});

describe('Survie', () => {
  it('une touche suffit, une volée vide coûte une vie', () => {
    const targets = Array.from({ length: 60 }, () => ({ segment: 20, ring: 'any' }));
    const s = st<SurvieState>(play(cfg('survie', { lives: 3, step: 5, targets }), 'S20 /'));
    expect(s.held).toEqual([1, 0]);
    expect(s.lives).toEqual([3, 2]);
  });
});

describe('Le Contrat', () => {
  it('la meilleure prime remplie compte', () => {
    const offers = Array.from({ length: 10 }, () => [
      { kind: 'double', bonus: 20 },
      { kind: 'atLeast', n: 60, bonus: 40 },
      { kind: 'exact', n: 50, bonus: 50 },
    ]);
    const s = play(cfg('contrat', { rounds: 10, offers }), 'T20 D5 S1 / S1 S1 S1');
    expect(st<ContratState>(s).scores).toEqual([40, 0]);
    expect(bestBonus(offers[0] as never, [parseDart('50')])).toBe(50);
  });
});

describe('La Pyramide', () => {
  it('étage « tous » : chaque numéro, dans n’importe quel ordre', () => {
    const s = st<PyramideState>(play(cfg('pyramide', { variant: 'simple' }), 'S2 S2 S1'));
    expect(s.floor[0]).toBe(1);
  });
  it('Spicy : une seule touche suffit aux étages 2 à 5', () => {
    const s = play(cfg('pyramide', { variant: 'spicy' }, players(1)), 'S1 S2 S3 / S4 S5 D7 / D15 T16 50');
    expect(s.status).toBe('finished');
    expect(s.winners).toEqual([0]);
  });
});

describe('La Bombe', () => {
  const c = () => cfg('bombe', { lives: 1, fuses: [2, 10], numbers: [5] }, players(3));
  it('touché +1, raté −2 ; elle explose chez celui qui la fait tomber à 0', () => {
    const s = st<BombeState>(play(c(), 'S5 S1 S1'));
    expect(s.fuse).toBe(10);
    expect(s.lives[0]).toBe(0);
  });
});

describe('Les Coffres', () => {
  it('le premier sur la zone ouvre le coffre et prend le bonus, une seule fois', () => {
    const chests = [
      { segment: 20, ring: 'T' },
      { segment: 1, ring: 'S' },
      { segment: 2, ring: 'S' },
      { segment: 3, ring: 'S' },
      { segment: 4, ring: 'S' },
      { segment: 5, ring: 'S' },
    ];
    const s = st<CoffresState>(play(cfg('coffres', { rounds: 5, chests }), 'T20 / T20'));
    expect(s.scores).toEqual([120, 60]);
    expect(s.opened[0]?.side).toBe(0);
  });
});

describe('Le Roi de la Cible', () => {
  it('toucher la cible royale donne la couronne ; le roi marque en fin de manche', () => {
    const targets = Array.from({ length: 10 }, () => ({ segment: 16, ring: 'D' }));
    const s = st<RoiState>(play(cfg('roi', { rounds: 10, targets }, players(2)), 'D16 / / / / D16 /'));
    expect(s.king).toBe(1);
    expect(s.crowns).toEqual([2, 1]);
  });
});

describe('Équipes', () => {
  it('Baseball en équipes : total collectif', () => {
    const s = st<BaseballState>(play(cfg('baseball', { tiebreak: true }, teams(2, 2)), 'T1 / S1 /'));
    expect(baseballTotal(s, 0)).toBe(3);
  });
  it('les jeux à élimination refusent les équipes', () => {
    expect(() => computeState(cfg('bombe', { lives: 3, fuses: [9], numbers: [5] }, teams(2, 2)), events(''))).toThrow();
  });
});
