import { describe, expect, it } from 'vitest';
import { cleanDart, S, T } from '../game-engine/darts';
import { correctDart, createSession, startSession, throwDart } from '../game-session/session';
import { config, players } from '../test/helpers';
import { heatmap } from './heatmap';
import { playerGames } from './stats';
const training = () => ({ ...config('training', {}, players(1)), training: true });
function play(darts) {
    let session = startSession(createSession('h1', training(), '2026-11-01T10:00:00.000Z'));
    for (const d of darts)
        session = throwDart(session, d);
    return { id: 'h1', session: { ...session, status: 'finished', endedAt: '2026-11-01T11:00:00.000Z' }, players: [{ id: 'p1', name: 'p1' }] };
}
describe('position des fléchettes', () => {
    it('garde une position plausible, arrondie au dixième, et rien d’autre', () => {
        expect(cleanDart({ ...T(20), pos: { x: 1.234, y: -102.06 }, extra: 1 })).toEqual({ ...T(20), pos: { x: 1.2, y: -102.1 } });
        expect(cleanDart({ ...T(20), pos: { x: 500, y: 0 } })).toEqual(T(20));
        expect(cleanDart({ ...T(20), pos: { x: 'a', y: 0 } })).toEqual(T(20));
    });
    it('une correction à la main efface la position', () => {
        let session = startSession(createSession('c', training()));
        session = throwDart(session, { ...S(20), pos: { x: 0, y: -60 } });
        session = correctDart(session, 0, { ...S(5), pos: { x: 0, y: -60 } });
        expect(session.events[0]).toEqual({ type: 'dart', dart: S(5) });
    });
});
describe('heat map', () => {
    it('ne place que les fléchettes vues par la caméra et compte les saisies à la main à part', () => {
        const record = play([{ ...T(20), pos: { x: 0, y: -100 } }, S(1), { ...S(20), pos: { x: 6, y: -92 } }]);
        const map = heatmap(playerGames([record], 'p1'));
        expect(map.points).toEqual([
            { x: 0, y: -100, zone: 'T20' },
            { x: 6, y: -92, zone: 'S20' },
        ]);
        expect(map.manual).toBe(1);
        expect(map.center).toEqual({ x: 3, y: -96 });
        expect(map.spread).toBeCloseTo(5);
    });
    it('sans caméra : carte vide', () => {
        const map = heatmap(playerGames([play([S(1), S(2), S(3)])], 'p1'));
        expect(map).toEqual({ points: [], manual: 3, center: null, spread: null });
    });
});
