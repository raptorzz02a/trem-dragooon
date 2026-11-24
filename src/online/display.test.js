import { describe, expect, it } from 'vitest';
import { D, S, T } from '../game-engine/darts';
import { DEFAULT_AVATAR } from '../ui/components/Avatar';
import { boardView, cleanDisplaySettings, DEFAULT_DISPLAY_SETTINGS, isPairCode } from './display';
import { applyMessage, createRoom, joinRoom, roomView } from './room';
const NOW = '2026-11-23T14:00:00.000Z';
const who = (name) => ({ name, color: '#ff0000', avatar: DEFAULT_AVATAR });
let tokens = 0;
const token = () => `t${++tokens}`;
/** Partie de 301 Double Out entre ces joueurs, dans l'ordre d'arrivée. */
function x01(...names) {
    let room = names.reduce((r, n) => joinRoom(r, null, who(n), token).room, createRoom('ABCDEF'));
    room = applyMessage(room, 'p1', { type: 'setup', setup: { ...room.setup, mode: 'x01', x01: { startScore: 301, out: 'double', maxRounds: null } } });
    return applyMessage(room, 'p1', { type: 'start' }, NOW, () => 0.999);
}
/** Lance ces fléchettes avec le joueur qui a la main (la partie se joue sur la même cible : l'hôte saisit). */
function throwAll(room, darts) {
    return darts.reduce((r, dart) => {
        const player = r.players.find((p) => p.id === playerUp(r)) ?? r.players[0];
        return applyMessage(r, player.id, { type: 'dart', dart }, NOW);
    }, room);
}
const playerUp = (room) => {
    const board = boardView(roomView(room));
    const side = board.current ?? 0;
    return room.session.config.sides[side].playerIds[0];
};
describe('tableau de scores sur tablette', () => {
    it('ne montre rien en salle d’attente', () => {
        const room = joinRoom(createRoom('ABCDEF'), null, who('Ju'), token).room;
        expect(boardView(roomView(room))).toMatchObject({ status: 'lobby', game: null, sides: [] });
    });
    it('donne le reste, la volée en cours et la finition du joueur qui lance', () => {
        let room = x01('Ju', 'Pierre');
        room = throwAll(room, [T(20), T(20), T(20)]);
        const board = boardView(roomView(room));
        expect(board.title).toBe('301 · Double out');
        expect(board.sides.map((s) => s.value)).toEqual([121, 301]);
        expect(board.sides[0].avg).toBe(180);
        expect(board.current).toBe(1);
        expect(board.last).toMatchObject({ seq: 0, side: 0, total: 180, outcome: 'complete', darts: ['T20', 'T20', 'T20'] });
        room = throwAll(room, [S(20)]);
        const next = boardView(roomView(room));
        expect(next.darts).toEqual(['S20']);
        expect(next.checkout).toEqual([]);
    });
    it('signale un bust et remet le score d’avant la volée', () => {
        let room = x01('Ju', 'Pierre');
        // Ju : 301 - 180 = 121, puis T20 T20 laisserait 1, interdit en Double Out : bust à la 2e fléchette.
        room = throwAll(room, [T(20), T(20), T(20), S(1), S(1), S(1), T(20), T(20)]);
        const board = boardView(roomView(room));
        expect(board.last).toMatchObject({ side: 0, outcome: 'bust', total: 0, darts: ['T20', 'T20'] });
        expect(board.sides[0].value).toBe(121);
        expect(board.sides[0].avg).toBe(90);
        expect(board.current).toBe(1);
        // Pierre (298) : trop loin pour une finition.
        expect(board.checkout).toEqual([]);
    });
    it('donne le vainqueur, ses fléchettes, sa meilleure volée et sa finition', () => {
        let room = x01('Ju', 'Pierre');
        room = throwAll(room, [T(20), T(20), T(20), S(1), S(1), S(1), T(20), T(19)]);
        let board = boardView(roomView(room));
        expect(board.checkout).toEqual(['D2']);
        room = throwAll(room, [D(2)]);
        board = boardView(roomView(room));
        expect(board.status).toBe('finished');
        expect(board.current).toBeNull();
        expect(board.last).toMatchObject({ outcome: 'win', total: 121 });
        expect(board.winner).toEqual({ names: ['Ju'], darts: 6, best: 180, checkout: ['T20', 'T19', 'D2'], checkoutPoints: 121 });
    });
});
/** Partie de ce jeu (réglages par défaut) entre ces joueurs. */
function game(mode, ...names) {
    const room = names.reduce((r, n) => joinRoom(r, null, who(n), token).room, createRoom('ABCDEF'));
    const ready = applyMessage(room, 'p1', { type: 'setup', setup: { ...room.setup, mode } });
    return applyMessage(ready, 'p1', { type: 'start' }, NOW, () => 0.999);
}
describe('vues propres à certains jeux', () => {
    it('X01 et jeux sans vue dédiée : pas de vue', () => {
        expect(boardView(roomView(x01('Ju', 'Pierre'))).view).toBeNull();
    });
    it('Cricket : marques (trait, croix, rond) et points par joueur', () => {
        let room = game('cricket', 'Ju', 'Pierre');
        room = throwAll(room, [T(20), S(19), S(19)]);
        const view = boardView(roomView(room)).view;
        expect(view?.kind).toBe('cricket');
        if (view?.kind !== 'cricket')
            return;
        expect(view.targets).toEqual(['20', '19', '18', '17', '16', '15', 'Bull']);
        expect(view.marks[0].slice(0, 2)).toEqual([3, 2]);
        expect(view.marks[1].every((m) => m === 0)).toBe(true);
    });
    it('Horloge : parcours et progression de chacun', () => {
        let room = game('clock', 'Ju', 'Pierre');
        room = throwAll(room, [S(1), S(2), S(5)]);
        const view = boardView(roomView(room)).view;
        expect(view?.kind).toBe('clock');
        if (view?.kind !== 'clock')
            return;
        expect(view.steps[0]).toBe('1');
        expect(view.steps[view.steps.length - 1]).toMatch(/^Bull/);
        expect(view.progress).toEqual([2, 0]);
        expect(view.darts).toEqual([3, 0]);
    });
    it('Chiffre aléatoire : les cibles de la partie et la manche en cours', () => {
        const room = game('random', 'Ju', 'Pierre');
        const board = boardView(roomView(room));
        expect(board.view?.kind).toBe('targets');
        if (board.view?.kind !== 'targets')
            return;
        expect(board.view.targets).toHaveLength(room.session.config.options && room.session.config.options.rounds);
        expect(board.view.index).toBe(0);
        expect(board.view.targets.every((t) => /^(\d+|Bull)$/.test(t))).toBe(true);
    });
});
describe('réglages et code des tablettes', () => {
    it('reconnaît un code à 4 chiffres', () => {
        expect(isPairCode('0427')).toBe(true);
        expect(isPairCode('427')).toBe(false);
        expect(isPairCode(4270)).toBe(false);
    });
    it('nettoie les réglages reçus en gardant les valeurs connues', () => {
        expect(cleanDisplaySettings({ dim: false, animations: 'oui', extra: 1 })).toEqual({ ...DEFAULT_DISPLAY_SETTINGS, dim: false });
        expect(cleanDisplaySettings({ reload: 5 }, { dim: false, animations: false, reload: 1 })).toEqual({ dim: false, animations: false, reload: 5 });
    });
});
