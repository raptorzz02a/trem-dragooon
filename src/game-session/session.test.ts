import { describe, expect, it } from 'vitest';
import { D, INNER_BULL, S, T } from '../game-engine/darts';
import {
  abandonSession,
  cancelSession,
  correctDart,
  createSession,
  endTurn,
  rematchConfig,
  sessionState,
  startSession,
  throwDart,
  undoLast,
  type GameSession,
} from './session';
import { config, events, players, teams } from '../test/helpers';

const NOW = '2026-10-28T20:00:00.000Z';

function started(cfg = config('x01', { out: 'double' })): GameSession {
  return startSession(createSession('g1', cfg, NOW), NOW);
}

function withScript(session: GameSession, script: string): GameSession {
  return events(script).reduce(
    (s, e) => (e.type === 'dart' ? throwDart(s, e.dart, NOW) : endTurn(s, NOW)),
    session,
  );
}

describe('Déroulement et corrections', () => {
  it('états : ready puis in_progress, et pas de lancer avant le départ', () => {
    const s = createSession('g1', config('x01'), NOW);
    expect(s.status).toBe('ready');
    expect(() => throwDart(s, S(20))).toThrow();
    expect(startSession(s, NOW).status).toBe('in_progress');
  });

  it('l’annulation traverse la fin de volée', () => {
    let s = withScript(started(), 'T20 T20 T20');
    expect(sessionState(s).current!.playerId).toBe('p2');
    s = undoLast(s, NOW);
    const st = sessionState(s);
    expect(st.current!.playerId).toBe('p1');
    expect(st.current!.darts).toHaveLength(2);
  });

  it('G08 : corriger une volée passée recalcule les scores, sans doublon', () => {
    let s = withScript(started(), 'T20 T20 T20 S1');
    s = correctDart(s, 0, S(20), NOW);
    expect(sessionState(s).mode).toMatchObject({ remaining: [501 - 140, 500] });
    expect(s.events).toHaveLength(4);
    expect(s.corrections).toEqual([{ at: NOW, eventIndex: 0, before: T(20), after: S(20) }]);
  });

  it('une correction qui donne la victoire termine la partie et retire les lancers devenus inutiles', () => {
    // Joueur 1 à 40 ; il lance S5 S5 S5, puis le joueur 2 joue. La première fléchette était en fait D20.
    const to40 = 'T20 T20 T20 0 0 0 T20 T20 T20 0 0 0 T20 T7 S20 0 0 0';
    let s = withScript(started(), `${to40} S5 S5 S5 S1`);
    expect(sessionState(s).status).toBe('in_progress');
    const firstDart = s.events.length - 4;
    s = correctDart(s, firstDart, D(20), NOW);
    expect(s.status).toBe('finished');
    expect(sessionState(s).winners).toEqual([0]);
    expect(s.events).toHaveLength(firstDart + 1);
    expect(s.endedAt).toBe(NOW);
  });

  it('une correction qui annule la victoire rouvre la partie', () => {
    const to50 = 'T20 T20 T20 0 0 0 T20 T20 T20 0 0 0 T20 T7 S10 0 0 0';
    let s = withScript(started(), `${to50} 50`);
    expect(s.status).toBe('finished');
    s = correctDart(s, s.events.length - 1, S(25), NOW);
    expect(s.status).toBe('in_progress');
    expect(sessionState(s).mode).toMatchObject({ remaining: [25, 501] });
    expect(s.endedAt).toBeNull();
  });

  it('une partie terminée refuse les lancers', () => {
    const s = withScript(started(config('clock', { bullFinish: 'none' }, players(1))),
      Array.from({ length: 20 }, (_, i) => `S${i + 1}`).join(' '));
    expect(s.status).toBe('finished');
    expect(() => throwDart(s, INNER_BULL)).toThrow();
  });

  it('G04 / G10 : abandon et annulation ne désignent pas de vainqueur', () => {
    const s = withScript(started(), 'T20');
    expect(abandonSession(s, NOW).status).toBe('abandoned');
    expect(cancelSession(s, NOW).status).toBe('cancelled');
    expect(sessionState(abandonSession(s, NOW)).winners).toEqual([]);
  });

  it('F06 : revanche avec les mêmes joueurs, règles et équipes', () => {
    const cfg = config('cricket', { variant: 'cutthroat' }, teams(2, 3));
    const again = rematchConfig(cfg, () => 0.5);
    expect(again.options).toEqual(cfg.options);
    expect(again.sides.map((s) => s.id).sort()).toEqual(['t1', 't2']);
    expect(again.sides.flatMap((s) => s.playerIds).sort()).toEqual(['p1', 'p2', 'p3', 'p4', 'p5']);
  });

  it('G01 : la partie se reconstruit à l’identique depuis sa sauvegarde JSON', () => {
    const s = withScript(started(), 'T20 S5 / D16 T19');
    const restored = JSON.parse(JSON.stringify(s)) as GameSession;
    expect(sessionState(restored)).toEqual(sessionState(s));
  });
});
