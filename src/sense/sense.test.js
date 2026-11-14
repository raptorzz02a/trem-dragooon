import { describe, expect, it } from 'vitest';
import { computeState, MISS, S, T } from '../game-engine';
import { senseDarts } from './sense';
const config = {
    mode: 'x01',
    options: { startScore: 301, out: 'double', maxRounds: null },
    teamMode: false,
    training: false,
    sides: [
        { id: 'a', name: 'A', playerIds: ['a'] },
        { id: 'b', name: 'B', playerIds: ['b'] },
    ],
};
const darts = (...list) => list.map((dart) => ({ type: 'dart', dart }));
const dart = (volee, d) => ({ id: 0, type: 'flechette', volee, rang: 1, code: '', flechette: d });
const takeout = (volee) => ({ id: 0, type: 'retrait', volee, flechettes: 1 });
/** Rejoue les événements de la caméra comme le fait l'appli, et rend les événements de partie obtenus. */
function play(events, start = [], canPlay = true, cfg = config) {
    const visits = new Map();
    const log = [...start];
    for (const e of events)
        log.push(...darts(...senseDarts(computeState(cfg, log), e, visits, canPlay)));
    return log;
}
describe('saisie par la caméra', () => {
    it('saisit chaque fléchette vue, puis complète la volée par des ratés au retrait', () => {
        const log = play([dart(1, T(20)), dart(1, S(5)), takeout(1)]);
        expect(log).toEqual(darts(T(20), S(5), MISS));
        expect(computeState(config, log).current?.playerId).toBe('b');
    });
    it('transmet le point d’impact vu par la caméra', () => {
        const event = { id: 0, type: 'flechette', volee: 1, rang: 1, code: 'T20', flechette: T(20), position: { x: 1.5, y: -102 } };
        expect(senseDarts(computeState(config, []), event, new Map(), true)).toEqual([{ ...T(20), pos: { x: 1.5, y: -102 } }]);
    });
    it('volée complète : le retrait ne rajoute rien', () => {
        expect(play([dart(1, T(20)), dart(1, T(20)), dart(1, T(20)), takeout(1)])).toEqual(darts(T(20), T(20), T(20)));
    });
    it('bust : les fléchettes suivantes de la même volée ne passent pas au joueur suivant', () => {
        // A reste à 41 : un T20 le fait buster.
        const start = darts(T(20), T(20), T(20), MISS, MISS, MISS, T(20), T(20), T(20), MISS, MISS, MISS, T(20), S(20), MISS, MISS, MISS, MISS);
        expect(computeState(config, start).current?.playerId).toBe('a');
        const log = play([dart(7, T(20)), dart(7, S(1)), takeout(7)], start, true, config);
        expect(log.slice(start.length)).toEqual(darts(T(20)));
        expect(computeState(config, log).current?.playerId).toBe('b');
    });
    it("rien n'est saisi quand ce n'est pas le tour de cet appareil, même si le tour arrive en cours de volée", () => {
        const visits = new Map();
        expect(senseDarts(computeState(config, []), dart(1, T(20)), visits, false)).toEqual([]);
        expect(senseDarts(computeState(config, []), dart(1, T(20)), visits, true)).toEqual([]);
        expect(senseDarts(computeState(config, []), takeout(1), visits, true)).toEqual([]);
        expect(senseDarts(computeState(config, []), dart(2, S(1)), visits, true)).toEqual([S(1)]);
    });
    it('retrait sans fléchette saisie (annulée à la main) : rien', () => {
        const visits = new Map([[1, 0]]);
        expect(senseDarts(computeState(config, []), takeout(1), visits, true)).toEqual([]);
    });
});
