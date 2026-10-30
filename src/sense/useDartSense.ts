import { useCallback, useEffect, useRef, useState } from 'react';
import type { Dart } from '../game-engine/darts';
import type { GameState } from '../game-engine/types';
import { senseDarts, senseEnabled, senseEvents, senseState, type SenseEvent, type SenseStatus } from './sense';

function dartTotal(state: GameState): number {
  return state.turns.reduce((n, t) => n + t.darts.length, 0) + (state.current?.darts.length ?? 0);
}

/**
 * Saisie automatique des fléchettes vues par Dart Sense pendant une partie.
 * Les événements sont traités un par un : après une saisie, on attend que la partie
 * l'ait prise en compte (aller-retour serveur) avant de traiter le suivant.
 */
export function useDartSense(state: GameState, canPlay: boolean, onDart: (dart: Dart) => void) {
  const enabled = senseEnabled();
  const [active, setActive] = useState(true);
  const [status, setStatus] = useState<SenseStatus>('off');
  const live = useRef({ state, canPlay, onDart });
  live.current = { state, canPlay, onDart };
  const queue = useRef<SenseEvent[]>([]);
  const visits = useRef(new Map<number, number>());
  const waiting = useRef<{ total: number; until: number } | null>(null);

  const drain = useCallback(() => {
    while (queue.current.length) {
      const wait = waiting.current;
      if (wait && dartTotal(live.current.state) < wait.total && Date.now() < wait.until) return;
      waiting.current = null;
      const event = queue.current.shift()!;
      const { state, canPlay, onDart } = live.current;
      const darts = senseDarts(state, event, visits.current, canPlay);
      if (!darts.length) continue;
      waiting.current = { total: dartTotal(state) + darts.length, until: Date.now() + 3000 };
      darts.forEach(onDart);
    }
  }, []);

  useEffect(drain, [state, drain]);

  useEffect(() => {
    if (!enabled || !active) return;
    const abort = new AbortController();
    let stopped = false;
    void (async () => {
      // On part du dernier événement connu : rien de ce qui précède l'ouverture de la partie n'est saisi.
      let after = (await senseState(abort.signal)).last;
      while (!stopped) {
        try {
          const { events, last } = await senseEvents(after, abort.signal);
          // Dart Sense relancé : sa numérotation repart de zéro.
          after = last < after ? 0 : last;
          if (events.length) {
            queue.current.push(...events);
            drain();
          }
        } catch {
          if (stopped) return;
          await new Promise((r) => setTimeout(r, 3000));
          after = (await senseState(abort.signal)).last;
        }
      }
    })();
    const poll = async () => setStatus((await senseState(abort.signal)).status);
    void poll();
    const timer = setInterval(() => void poll(), 3000);
    // Débloque une attente dont la saisie n'est jamais arrivée (annulation entre-temps).
    const unstick = setInterval(drain, 1000);
    return () => {
      stopped = true;
      abort.abort();
      clearInterval(timer);
      clearInterval(unstick);
      queue.current = [];
    };
  }, [enabled, active, drain]);

  return { enabled, active, status, toggle: () => setActive((a) => !a) };
}
