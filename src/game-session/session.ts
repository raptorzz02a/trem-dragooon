import { computeState } from '../game-engine/engine';
import { assertValidDart, type Dart } from '../game-engine/darts';
import type { GameConfig, GameEvent, GameState } from '../game-engine/types';
import { randomOrder, type Rng } from '../teams/teams';

export type SessionStatus = 'setup' | 'ready' | 'in_progress' | 'finished' | 'abandoned' | 'cancelled';

export interface Correction {
  at: string;
  eventIndex: number;
  before: Dart;
  after: Dart;
}

/**
 * Une partie telle qu'elle est sauvegardée : la configuration et la liste brute des événements.
 * Scores, vainqueur et statistiques en sont toujours recalculés, jamais stockés en double.
 */
export interface GameSession {
  id: string;
  config: GameConfig;
  status: SessionStatus;
  events: GameEvent[];
  corrections: Correction[];
  createdAt: string;
  startedAt: string | null;
  endedAt: string | null;
}

const nowIso = () => new Date().toISOString();

export function createSession(id: string, config: GameConfig, now: string = nowIso()): GameSession {
  computeState(config, []); // valide la configuration
  return { id, config, status: 'ready', events: [], corrections: [], createdAt: now, startedAt: null, endedAt: null };
}

export function startSession(session: GameSession, now: string = nowIso()): GameSession {
  if (session.status !== 'ready') throw new Error('La partie n’est pas prête à démarrer.');
  return { ...session, status: 'in_progress', startedAt: now };
}

export function sessionState(session: GameSession): GameState {
  return computeState(session.config, session.events);
}

/** Rejoue les événements et met le statut à jour (une correction peut terminer ou rouvrir la partie). */
function withEvents(session: GameSession, events: GameEvent[], now: string, extra: Partial<GameSession> = {}): GameSession {
  const state = computeState(session.config, events);
  const finished = state.status === 'finished';
  return {
    ...session,
    ...extra,
    // Les événements devenus inutiles après une fin de partie anticipée sont retirés.
    events: state.ignoredEvents > 0 ? events.slice(0, events.length - state.ignoredEvents) : events,
    status: finished ? 'finished' : 'in_progress',
    endedAt: finished ? (session.status === 'finished' ? session.endedAt : now) : null,
  };
}

function assertPlaying(session: GameSession): void {
  if (session.status !== 'in_progress') throw new Error('Aucune partie en cours : action refusée.');
}

export function throwDart(session: GameSession, dart: Dart, now: string = nowIso()): GameSession {
  assertPlaying(session);
  assertValidDart(dart);
  return withEvents(session, [...session.events, { type: 'dart', dart }], now);
}

/** Termine la volée avant la troisième fléchette, sans fléchette fictive. */
export function endTurn(session: GameSession, now: string = nowIso()): GameSession {
  assertPlaying(session);
  return withEvents(session, [...session.events, { type: 'endTurn' }], now);
}

/** Annule la dernière action, y compris si elle a fait passer au joueur suivant. */
export function undoLast(session: GameSession, now: string = nowIso()): GameSession {
  assertPlaying(session);
  if (session.events.length === 0) return session;
  return withEvents(session, session.events.slice(0, -1), now);
}

/**
 * Corrige une fléchette déjà validée (volée en cours ou passée). La partie est rejouée :
 * scores, vainqueur et statut sont recalculés, et la correction est tracée.
 */
export function correctDart(session: GameSession, eventIndex: number, dart: Dart, now: string = nowIso()): GameSession {
  if (session.status !== 'in_progress' && session.status !== 'finished') {
    throw new Error('Cette partie ne peut plus être corrigée.');
  }
  assertValidDart(dart);
  const event = session.events[eventIndex];
  if (!event || event.type !== 'dart') throw new Error('Aucune fléchette à cette position.');
  const events = session.events.slice();
  events[eventIndex] = { type: 'dart', dart };
  const corrections = [...session.corrections, { at: now, eventIndex, before: event.dart, after: dart }];
  return withEvents(session, events, now, { corrections });
}

/** Abandon volontaire : la partie est conservée mais ne compte ni comme victoire ni comme défaite. */
export function abandonSession(session: GameSession, now: string = nowIso()): GameSession {
  assertPlaying(session);
  return { ...session, status: 'abandoned', endedAt: now };
}

export function cancelSession(session: GameSession, now: string = nowIso()): GameSession {
  if (session.status === 'finished') throw new Error('Une partie terminée ne peut pas être annulée.');
  return { ...session, status: 'cancelled', endedAt: now };
}

/** Configuration d'une revanche : mêmes règles, mêmes équipes, ordre de passage tiré au sort. */
export function rematchConfig(config: GameConfig, rng: Rng = Math.random): GameConfig {
  return { ...config, sides: randomOrder(config.sides, rng) };
}
