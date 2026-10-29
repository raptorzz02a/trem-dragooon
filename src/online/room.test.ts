import { describe, expect, it } from 'vitest';
import { D, S, T } from '../game-engine/darts';
import { sessionState } from '../game-session/session';
import { DEFAULT_AVATAR } from '../ui/components/Avatar';
import { isValidCode, normalizeCode, randomCode } from './protocol';
import { applyMessage, archiveChange, canUndo, createRoom, joinRoom, roomView, setConnected, type Room } from './room';

const NOW = '2026-10-29T20:00:00.000Z';
const who = (name: string) => ({ name, color: '#ff0000', avatar: DEFAULT_AVATAR });
let tokens = 0;
const token = () => `t${++tokens}`;
const first = () => 0.999; // ordre de passage = ordre d'arrivée

function lobby(...names: string[]): Room {
  return names.reduce((room, n) => joinRoom(room, null, who(n), token).room, createRoom('ABCDEF'));
}

function playing(...names: string[]): Room {
  return applyMessage(lobby(...names), 'p1', { type: 'start' }, NOW, first);
}

const current = (room: Room) => sessionState(room.session!).current!.playerId;

describe('codes de salon', () => {
  it('produit des codes de 6 caractères sans caractère ambigu', () => {
    for (let i = 0; i < 50; i++) {
      const code = randomCode();
      expect(isValidCode(code)).toBe(true);
      expect(code).not.toMatch(/[01OIL]/);
    }
  });

  it('accepte un code tapé en minuscules avec des espaces', () => {
    expect(normalizeCode(' abc-def ')).toBe('ABCDEF');
    expect(isValidCode('ABCDE0')).toBe(false);
  });
});

describe('salle d’attente', () => {
  it('le premier arrivé est l’hôte, les suivants reçoivent un identifiant propre', () => {
    const room = lobby('Ju', 'Max');
    expect(room.hostId).toBe('p1');
    expect(room.players.map((p) => p.id)).toEqual(['p1', 'p2']);
  });

  it('distingue deux surnoms identiques', () => {
    const room = lobby('Ju', 'ju');
    expect(room.players.map((p) => p.name)).toEqual(['Ju', 'ju 2']);
  });

  it('ne montre jamais les tokens aux autres joueurs', () => {
    expect(JSON.stringify(roomView(lobby('Ju', 'Max')))).not.toContain('"token"');
  });

  it('un joueur qui revient avec son token reprend sa place', () => {
    let room = lobby('Ju', 'Max');
    const max = room.players[1]!;
    room = setConnected(room, 'p2', false);
    const back = joinRoom(room, max.token, who('Autre'), token);
    expect(back.player.id).toBe('p2');
    expect(back.player.name).toBe('Max');
    expect(back.room.players).toHaveLength(2);
  });

  it('seul l’hôte règle la partie et la lance, à partir de 2 joueurs', () => {
    const solo = lobby('Ju');
    expect(() => applyMessage(solo, 'p1', { type: 'start' }, NOW)).toThrow(/au moins 2/);
    const room = lobby('Ju', 'Max');
    expect(() => applyMessage(room, 'p2', { type: 'start' }, NOW)).toThrow(/hôte/);
    const set = applyMessage(room, 'p1', { type: 'options', options: { startScore: 301, out: 'straight', maxRounds: null } });
    expect(set.options.startScore).toBe(301);
    expect(() => applyMessage(room, 'p1', { type: 'options', options: { startScore: 123 as 301, out: 'double', maxRounds: null } })).toThrow();
  });

  it('si l’hôte s’en va, le joueur suivant devient hôte', () => {
    const room = applyMessage(lobby('Ju', 'Max'), 'p1', { type: 'leave' });
    expect(room.players.map((p) => p.id)).toEqual(['p2']);
    expect(room.hostId).toBe('p2');
    expect(setConnected(lobby('Ju', 'Max'), 'p1', false).hostId).toBe('p2');
  });

  it('refuse un nouveau joueur une fois la partie lancée', () => {
    expect(() => joinRoom(playing('Ju', 'Max'), null, who('Léo'), token)).toThrow(/déjà commencé/);
  });
});

describe('partie en ligne', () => {
  it('seul le joueur dont c’est le tour peut saisir', () => {
    let room = playing('Ju', 'Max');
    expect(current(room)).toBe('p1');
    expect(() => applyMessage(room, 'p2', { type: 'dart', dart: T(20) }, NOW)).toThrow(/pas ton tour/);
    room = applyMessage(room, 'p1', { type: 'dart', dart: T(20) }, NOW);
    room = applyMessage(room, 'p1', { type: 'endTurn' }, NOW);
    expect(current(room)).toBe('p2');
  });

  it('annuler : le joueur qui a lancé ou l’hôte, pas les autres', () => {
    let room = playing('Ju', 'Max', 'Léo');
    room = applyMessage(room, 'p1', { type: 'dart', dart: S(5) }, NOW);
    expect(canUndo(room, 'p1')).toBe(true);
    expect(canUndo(room, 'p2')).toBe(false);
    room = applyMessage(room, 'p1', { type: 'endTurn' }, NOW);
    room = applyMessage(room, 'p2', { type: 'dart', dart: S(1) }, NOW);
    expect(canUndo(room, 'p2')).toBe(true);
    expect(canUndo(room, 'p1')).toBe(true); // hôte
    expect(canUndo(room, 'p3')).toBe(false);
    expect(() => applyMessage(room, 'p3', { type: 'undo' }, NOW)).toThrow();
    room = applyMessage(room, 'p2', { type: 'undo' }, NOW);
    expect(room.session!.events).toHaveLength(2);
  });

  it('va jusqu’à la victoire puis revient à la salle d’attente', () => {
    let room = applyMessage(lobby('Ju', 'Max'), 'p1', { type: 'options', options: { startScore: 301, out: 'double', maxRounds: null } });
    room = applyMessage(room, 'p1', { type: 'start' }, NOW, first);
    const volley = (id: string, darts: ReturnType<typeof T>[]) => {
      for (const dart of darts) room = applyMessage(room, id, { type: 'dart', dart }, NOW);
    };
    volley('p1', [T(20), T(20), T(20)]); // 121
    volley('p2', [S(1), S(1), S(1)]);
    volley('p1', [T(20), S(11), D(25)]); // 121 : finit sur le Bull (double)
    expect(room.session!.status).toBe('finished');
    expect(sessionState(room.session!).winners).toEqual([0]);
    expect(() => applyMessage(room, 'p2', { type: 'backToLobby' })).toThrow(/hôte/);
    room = applyMessage(room, 'p1', { type: 'backToLobby' });
    expect(room.status).toBe('lobby');
    expect(room.players).toHaveLength(2);
  });

  it('un joueur déconnecté garde sa place dans la partie', () => {
    const room = applyMessage(playing('Ju', 'Max'), 'p2', { type: 'leave' });
    expect(room.players.find((p) => p.id === 'p2')!.connected).toBe(false);
    expect(room.session!.config.sides).toHaveLength(2);
  });
});

describe('comptes et parties enregistrées', () => {
  it('un compte joue sous son identifiant et retrouve sa place depuis un autre appareil', () => {
    let room = joinRoom(createRoom('ABCDEF'), null, who('Ju'), token, 'acc-ju').room;
    room = joinRoom(room, null, who('Max'), token, 'acc-max').room;
    expect(room.players.map((p) => p.id)).toEqual(['acc-ju', 'acc-max']);
    room = applyMessage(room, 'acc-ju', { type: 'start' }, NOW, first);
    room = applyMessage(room, 'acc-max', { type: 'leave' });
    // Autre appareil, sans le jeton du salon, partie déjà lancée : même joueur, nouvel avatar.
    const back = joinRoom(room, null, { ...who('Maxou'), color: '#00ff00' }, token, 'acc-max');
    expect(back.player.id).toBe('acc-max');
    expect(back.player.name).toBe('Maxou');
    expect(back.room.players).toHaveLength(2);
    expect(back.room.players.find((p) => p.id === 'acc-max')!.connected).toBe(true);
  });

  it('enregistre la partie à sa fin et l’oublie si une annulation la rouvre', () => {
    let room = joinRoom(createRoom('ABCDEF'), null, who('Ju'), token, 'acc-ju').room;
    room = joinRoom(room, null, who('Max'), token, 'acc-max').room;
    room = applyMessage(room, 'acc-ju', { type: 'options', options: { startScore: 301, out: 'straight', maxRounds: null } });
    room = applyMessage(room, 'acc-ju', { type: 'start' }, NOW, first);
    const play = (id: string, darts: ReturnType<typeof T>[]) => {
      for (const dart of darts) {
        const next = applyMessage(room, id, { type: 'dart', dart }, NOW);
        const change = archiveChange(room, next);
        room = next;
        if (change) return change;
      }
      return null;
    };
    expect(play('acc-ju', [T(20), T(20), T(20)])).toBeNull();
    expect(play('acc-max', [S(1), S(1), S(1)])).toBeNull();
    const done = play('acc-ju', [T(20), S(11), D(25)]);
    expect(done && 'record' in done && done.record.players.map((p) => p.id)).toEqual(['acc-ju', 'acc-max']);
    expect(done && 'record' in done && done.record.session.status).toBe('finished');
    const undone = applyMessage(room, 'acc-ju', { type: 'undo' }, NOW);
    expect(archiveChange(room, undone)).toEqual({ forget: room.session!.id });
    expect(archiveChange(room, applyMessage(room, 'acc-ju', { type: 'backToLobby' }))).toBeNull();
  });
});
