// Effets lumineux de la borne : l'appli repère les moments forts d'une partie
// et les envoie au pont local (bridge/pont-yeelight.mjs) qui pilote l'ampoule Yeelight.
// Un navigateur ne peut pas parler directement à l'ampoule (TCP brut sur le réseau local),
// d'où ce petit relais sur le PC de la borne.

import { BULL } from '../game-engine/darts';
import type { GameState } from '../game-engine/types';

export type LightEffect =
  /** Triple ou Bull : stroboscope multicolore. */
  | { effect: 'strobe' }
  /** Double : vague de couleurs. */
  | { effect: 'wave' }
  /** Raté ou bust : rouge pendant une seconde. */
  | { effect: 'red' }
  /** Victoire : dix flashs à la couleur de l'équipe ou du joueur gagnant. */
  | { effect: 'victory'; color: string };

export const BRIDGE_URL = 'http://127.0.0.1:55444';
const KEY = 'trem-dragooon.ampoule';

function dartCount(state: GameState): number {
  return state.turns.reduce((n, t) => n + t.darts.length, 0) + (state.current?.darts.length ?? 0);
}

/**
 * Effet à jouer quand l'état passe de prev à next, ou null.
 * Seules les fléchettes nouvelles comptent : une annulation ou l'arrivée sur une partie en cours ne déclenche rien.
 */
export function lightEffectFor(
  prev: GameState | null,
  next: GameState,
  colorOfSide: (sideIndex: number) => string,
): LightEffect | null {
  if (!prev) return null;
  if (prev.status === 'in_progress' && next.status === 'finished') {
    const winner = next.winners[0];
    return winner === undefined ? null : { effect: 'victory', color: colorOfSide(winner) };
  }
  if (next.status !== 'in_progress' || dartCount(next) <= dartCount(prev) || next.turns.length < prev.turns.length) {
    return null;
  }
  const closed = next.turns.length > prev.turns.length ? next.turns.at(-1) : undefined;
  if (closed?.outcome === 'bust') return { effect: 'red' };
  const last = (next.current?.darts.length ? next.current.darts.at(-1) : closed?.darts.at(-1))?.dart;
  if (!last) return null;
  if (last.segment === 0) return { effect: 'red' };
  if (last.segment === BULL || last.multiplier === 3) return { effect: 'strobe' };
  if (last.multiplier === 2) return { effect: 'wave' };
  return null;
}

/** L'ampoule n'est pilotée que depuis l'appareil où le pont tourne (la borne), activée une fois pour toutes. */
export function lightEnabled(): boolean {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

export function setLightEnabled(enabled: boolean): void {
  try {
    if (enabled) localStorage.setItem(KEY, '1');
    else localStorage.removeItem(KEY);
  } catch {
    // Réglage non conservé : l'ampoule reste éteinte côté appli.
  }
}

/** Lien de lancement de la borne : « ?ampoule=1 » active l'ampoule sur cet appareil, « ?ampoule=0 » la coupe. */
export function readLightParam(search: string): void {
  const value = new URLSearchParams(search).get('ampoule');
  if (value === '1' || value === '0') setLightEnabled(value === '1');
}

/** Envoie l'effet au pont. Sans pont qui écoute, l'échec est silencieux : la partie continue. */
export async function sendLight(effect: LightEffect): Promise<boolean> {
  try {
    const res = await fetch(`${BRIDGE_URL}/effet`, {
      method: 'POST',
      // text/plain évite la requête préalable CORS.
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify(effect),
      // Chrome et Edge : déclare l'accès au réseau local (autorisation demandée une fois).
      targetAddressSpace: 'loopback',
    } as RequestInit);
    return res.ok;
  } catch {
    return false;
  }
}
