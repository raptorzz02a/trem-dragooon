// Saisie automatique par caméra : Dart Sense (dart-sense/trem_sense.py) tourne sur le PC de la borne,
// repère chaque fléchette plantée et la sert sur 127.0.0.1:55445. L'appli l'interroge et saisit
// la fléchette comme un appui sur le pavé ; le retrait des fléchettes termine la volée.

import { MISS, type Dart } from '../game-engine/darts';
import type { GameState } from '../game-engine/types';

export const SENSE_URL = 'http://127.0.0.1:55445';
const KEY = 'trem-dragooon.camera';

export type SenseEvent =
  | { id: number; type: 'flechette'; volee: number; rang: number; code: string; flechette: Dart }
  | { id: number; type: 'retrait'; volee: number; flechettes: number };

/** État de la caméra vu par l'appli : ok, cible non repérée, ou Dart Sense injoignable. */
export type SenseStatus = 'ok' | 'cible' | 'off';

/** Comme l'ampoule : activée une fois pour toutes sur l'appareil où Dart Sense tourne. */
export function senseEnabled(): boolean {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

export function setSenseEnabled(enabled: boolean): void {
  try {
    if (enabled) localStorage.setItem(KEY, '1');
    else localStorage.removeItem(KEY);
  } catch {
    // Réglage non conservé : la saisie reste manuelle.
  }
}

/** Lien de lancement de la borne : « ?camera=1 » active la caméra sur cet appareil, « ?camera=0 » la coupe. */
export function readSenseParam(search: string): void {
  const value = new URLSearchParams(search).get('camera');
  if (value === '1' || value === '0') setSenseEnabled(value === '1');
}

/**
 * Fléchettes à saisir pour un événement de la caméra.
 * `visits` retient à quel tour chaque volée de la caméra a été attribuée : une volée déjà close
 * par l'appli (bust, victoire, fin de tour à la main) ne déborde jamais sur le joueur suivant.
 * Au retrait, les fléchettes que la caméra n'a pas vues (tombées, hors cible) comptent comme ratées.
 */
export function senseDarts(state: GameState, event: SenseEvent, visits: Map<number, number>, canPlay: boolean): Dart[] {
  const current = state.current;
  if (state.status !== 'in_progress' || !current) return [];
  if (!visits.has(event.volee)) {
    // Volée commencée pendant le tour d'un joueur qui ne lance pas ici : on l'ignore jusqu'au retrait.
    visits.set(event.volee, canPlay && event.type === 'flechette' ? current.turnIndex : -1);
  }
  if (!canPlay || visits.get(event.volee) !== current.turnIndex) return [];
  if (event.type === 'flechette') return current.darts.length < 3 ? [event.flechette] : [];
  if (current.darts.length === 0) return [];
  return Array.from({ length: 3 - current.darts.length }, () => MISS);
}

function request(path: string, signal?: AbortSignal): Promise<Response> {
  return fetch(`${SENSE_URL}${path}`, {
    signal,
    // Chrome et Edge : déclare l'accès au réseau local (autorisation demandée une fois).
    targetAddressSpace: 'loopback',
  } as RequestInit);
}

export async function senseState(signal?: AbortSignal): Promise<{ status: SenseStatus; last: number }> {
  try {
    const res = await request('/etat', signal);
    const body = (await res.json()) as { camera: string; dernier: number };
    return { status: body.camera === 'ok' ? 'ok' : 'cible', last: body.dernier };
  } catch {
    return { status: 'off', last: 0 };
  }
}

/** Attente longue : rend les événements qui suivent `after` dès qu'il y en a (ou une liste vide au bout de 15 s). */
export async function senseEvents(after: number, signal?: AbortSignal): Promise<{ events: SenseEvent[]; last: number }> {
  const res = await request(`/flechettes?apres=${after}&attente=15`, signal);
  const body = (await res.json()) as { evenements: SenseEvent[]; dernier: number };
  return { events: body.evenements, last: body.dernier };
}
