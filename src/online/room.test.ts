import { describe, expect, it } from 'vitest';
import { D, S, T } from '../game-engine/darts';
import { sessionState } from '../game-session/session';
import { DEFAULT_AVATAR } from '../ui/components/Avatar';
import { isValidCode, normalizeCode, randomCode } from './protocol';
import { addLocalPlayer, applyMessage, archiveChange, canThrow, canUndo, createRoom, joinRoom, roomView, setConnected, type Room } from './room';

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

/** Règle le 301 (sortie simple ou double) comme le ferait l'hôte. */
const x01 = (room: Room, host: string, out: 'straight' | 'double') =>
  applyMessage(room, host, { type: 'setup', setup: { ...room.setup, x01: { startScore: 301, out, maxRounds: null } } });

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

  it('seul l’hôte règle la partie et la lance ; seul, c’est un entraînement', () => {
    const solo = applyMessage(lobby('Ju'), 'p1', { type: 'start' }, NOW);
    expect(solo.session!.config.training).toBe(true);
    const room = lobby('Ju', 'Max');
    expect(() => applyMessage(room, 'p2', { type: 'start' }, NOW)).toThrow(/hôte/);
    expect(() => x01(room, 'p2', 'straight')).toThrow(/hôte/);
    expect(x01(room, 'p1', 'straight').setup.x01).toEqual({ startScore: 301, out: 'straight', maxRounds: null });
  });

  it('n’accepte que les réglages proposés à l’écran', () => {
    const room = lobby('Ju', 'Max');
    const bad = { ...room.setup, mode: 'golf', x01: { startScore: 123, out: 'double', maxRounds: null } } as never;
    const set = applyMessage(room, 'p1', { type: 'setup', setup: bad });
    expect(set.setup.mode).toBe('x01');
    expect(set.setup.x01.startScore).toBe(501);
  });

  it('lance les quatre jeux, en individuel ou en équipes', () => {
    for (const mode of ['x01', 'cricket', 'clock', 'random'] as const) {
      let room = lobby('Ju', 'Max', 'Léo', 'Zoé');
      room = applyMessage(room, 'p1', { type: 'setup', setup: { ...room.setup, mode, teamMode: true, teamCount: 2 } });
      room = applyMessage(room, 'p1', { type: 'drawTeams' }, NOW, first);
      room = applyMessage(room, 'p1', { type: 'start' }, NOW, first);
      expect(room.session!.config.mode).toBe(mode);
      expect(room.session!.config.sides.map((s) => s.playerIds.length)).toEqual([2, 2]);
    }
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
    let room = x01(lobby('Ju', 'Max'), 'p1', 'double');
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
    room = x01(room, 'acc-ju', 'straight');
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

describe('même cible', () => {
  const ju = { id: 'acc-ju', ...who('Ju') };
  const pierre = { id: 'acc-pierre', ...who('Pierre') };
  const jacques = { id: 'acc-jacques', ...who('Jacques') };

  function borne(): Room {
    let room = joinRoom(createRoom('ABCDEF', 'same'), null, ju, token, ju.id).room;
    room = addLocalPlayer(room, ju.id, pierre, token);
    return addLocalPlayer(room, ju.id, jacques, token);
  }

  it('l’hôte ajoute les joueurs sans téléphone, une seule fois chacun', () => {
    const room = borne();
    expect(room.players.map((p) => p.id)).toEqual(['acc-ju', 'acc-pierre', 'acc-jacques']);
    expect(room.players[1]!.local).toBe(true);
    expect(() => addLocalPlayer(room, ju.id, pierre, token)).toThrow(/déjà/);
    expect(() => addLocalPlayer(room, 'acc-pierre', { id: 'x', ...who('X') }, token)).toThrow(/hôte/);
  });

  it('l’appareil de l’hôte saisit pour tout le monde', () => {
    let room = applyMessage(borne(), ju.id, { type: 'start' }, NOW, first);
    expect(room.session!.config.sides).toHaveLength(3);
    for (let i = 0; i < 3; i++) {
      expect(canThrow(room, ju.id)).toBe(true);
      room = applyMessage(room, ju.id, { type: 'endTurn' }, NOW);
    }
    expect(room.session!.events).toHaveLength(3);
    // Pierre suit sur son téléphone, sans saisir : pas de double saisie avec la borne.
    room = joinRoom(room, null, pierre, token, pierre.id).room;
    room = applyMessage(room, ju.id, { type: 'endTurn' }, NOW);
    expect(current(room)).toBe('acc-pierre');
    expect(canThrow(room, 'acc-pierre')).toBe(false);
    expect(canUndo(room, 'acc-pierre')).toBe(false);
  });

  it('« Je ne joue pas » : l’hôte saisit sans faire partie de la partie', () => {
    let room = applyMessage(borne(), ju.id, { type: 'setPlaying', playing: false });
    room = applyMessage(room, ju.id, { type: 'start' }, NOW, first);
    expect(room.session!.config.sides.flatMap((s) => s.playerIds)).toEqual(['acc-pierre', 'acc-jacques']);
    expect(current(room)).toBe('acc-pierre');
    room = applyMessage(room, ju.id, { type: 'dart', dart: T(20) }, NOW);
    expect(room.session!.events).toHaveLength(1);
  });

  it('à distance, l’hôte ne saisit pas pour un joueur connecté', () => {
    let room = joinRoom(createRoom('ABCDEF', 'remote'), null, ju, token, ju.id).room;
    room = joinRoom(room, null, who('Max'), token, 'acc-max').room;
    room = applyMessage(room, ju.id, { type: 'start' }, NOW, first);
    room = applyMessage(room, ju.id, { type: 'endTurn' }, NOW);
    expect(canThrow(room, ju.id)).toBe(false);
    expect(() => applyMessage(room, ju.id, { type: 'endTurn' }, NOW)).toThrow(/pas ton tour/);
    // Connexion coupée : l'hôte peut finir la volée pour lui.
    expect(canThrow(setConnected(room, 'acc-max', false), ju.id)).toBe(true);
  });

  it('l’hôte range la liste et retire un joueur avant le lancement', () => {
    let room = applyMessage(borne(), ju.id, { type: 'movePlayer', playerId: 'acc-jacques', delta: -1 });
    expect(room.players.map((p) => p.id)).toEqual(['acc-ju', 'acc-jacques', 'acc-pierre']);
    room = applyMessage(room, ju.id, { type: 'removePlayer', playerId: 'acc-pierre' });
    expect(room.players.map((p) => p.id)).toEqual(['acc-ju', 'acc-jacques']);
  });

  it('une partie arrêtée par l’hôte est enregistrée comme abandonnée', () => {
    let room = applyMessage(borne(), ju.id, { type: 'start' }, NOW, first);
    room = applyMessage(room, ju.id, { type: 'dart', dart: S(5) }, NOW);
    const next = applyMessage(room, ju.id, { type: 'abandon' }, NOW);
    expect(next.status).toBe('lobby');
    const change = archiveChange(room, next);
    expect(change && 'record' in change && change.record.session.status).toBe('abandoned');
  });
});
