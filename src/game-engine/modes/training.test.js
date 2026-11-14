// F. Entraînement
import { describe, expect, it } from 'vitest';
import { trainingAverage } from './training';
import { config, play, players, teams } from '../../test/helpers';
const st = (s) => s.mode;
const cfg = (n = 2) => config('training', {}, players(n));
describe('F. Entraînement', () => {
    it('F01 : on part de 0 et chaque fléchette rapporte sa valeur', () => {
        const s = play(cfg(), 'T20 D5 25 S1 50 0');
        expect(st(s).scores).toEqual([95, 51]);
        expect(st(s).darts).toEqual([3, 3]);
    });
    it('F02 : pas de bust ni de limite, la partie ne finit jamais seule', () => {
        const s = play(cfg(1), Array(200).fill('T20').join(' '));
        expect(s.status).toBe('in_progress');
        expect(st(s).scores[0]).toBe(200 * 60);
        expect(s.turns.every((t) => t.outcome === 'complete')).toBe(true);
    });
    it('F03 : un seul joueur possible, et la partie est un entraînement', () => {
        const c = cfg(1);
        expect(c.training).toBe(true);
        expect(play(c, 'S20 S20 S20 S1').current?.playerId).toBe('p1');
    });
    it('F04 : « terminer » arrête la partie et classe sur les points', () => {
        const s = play(cfg(), 'T20 T20 T20 S1 S1 S1 !');
        expect(s.status).toBe('finished');
        expect(s.winners).toEqual([0]);
        expect(s.ranking.map((r) => r.value)).toEqual([180, 3]);
        expect(s.current).toBeNull();
    });
    it('F05 : la volée entamée est gardée à la fin', () => {
        const s = play(cfg(), 'T20 T20 T20 S5 !');
        expect(s.turns).toHaveLength(2);
        expect(s.turns[1].outcome).toBe('ended');
        expect(st(s).scores).toEqual([180, 5]);
    });
    it('F06 : en équipes, le total est commun', () => {
        const s = play(config('training', {}, teams(2, 1)), 'S20 / S1 / S5');
        expect(st(s).scores).toEqual([25, 1]);
    });
    it('F07 : moyenne sur 3 fléchettes, même volée entamée', () => {
        const s = st(play(cfg(), 'T20 S1 S2'));
        expect(trainingAverage(s, 0)).toBe(63);
        expect(trainingAverage(st(play(cfg(1), 'T20 T20 T20 S20')), 0)).toBe(150);
        expect(trainingAverage(s, 1)).toBeNull();
    });
});
