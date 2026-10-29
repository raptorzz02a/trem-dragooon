import { useEffect, useRef, useState } from 'react';
import { wsUrl } from './api';
import type { RoomView, ServerMessage } from './protocol';
import type { LiveGame } from './saloons';
import { accountToken, api } from './useAccount';

// Parties en cours d'un saloon, et connexion d'un spectateur à l'une d'elles.

const REFRESH_MS = 15_000;

export function useLiveGames(saloonId: string): LiveGame[] {
  const [games, setGames] = useState<LiveGame[]>([]);
  useEffect(() => {
    let stopped = false;
    const load = () =>
      api<{ games: LiveGame[] }>(`/api/saloons/${encodeURIComponent(saloonId)}/games`)
        .then((r) => !stopped && setGames(r.games))
        .catch(() => undefined);
    setGames([]);
    void load();
    const timer = setInterval(load, REFRESH_MS);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [saloonId]);
  return games;
}

export interface Watching {
  room: RoomView | null;
  /** La partie n'est plus là (terminée et effacée, ou accès refusé). */
  closed: boolean;
}

/** Regarder une partie : on reçoit son état à chaque fléchette, sans pouvoir rien y faire. */
export function useWatch(saloonId: string, watchKey: string): Watching {
  const [room, setRoom] = useState<RoomView | null>(null);
  const [closed, setClosed] = useState(false);
  const socket = useRef<WebSocket | null>(null);

  useEffect(() => {
    let stopped = false;
    let retry: ReturnType<typeof setTimeout> | undefined;
    let received = false;
    const connect = () => {
      const path = `/api/saloons/${encodeURIComponent(saloonId)}/games/${encodeURIComponent(watchKey)}/ws?token=${encodeURIComponent(accountToken() ?? '')}`;
      const ws = new WebSocket(wsUrl(path));
      socket.current = ws;
      ws.onmessage = (event) => {
        const message = JSON.parse(String(event.data)) as ServerMessage;
        if (message.type === 'room') {
          received = true;
          setRoom(message.room);
        }
      };
      ws.onclose = (event) => {
        if (stopped) return;
        // Partie effacée, ou refusée avant tout envoi : inutile d'insister ; coupure réseau : on réessaie.
        if (event.code === 4404 || event.code === 4410 || !received) {
          setClosed(true);
          return;
        }
        retry = setTimeout(connect, 3000);
      };
    };
    connect();
    return () => {
      stopped = true;
      clearTimeout(retry);
      socket.current?.close(1000);
    };
    // La partie regardée ne change pas pendant la vie de l'écran.
  }, [saloonId, watchKey]);

  return { room, closed };
}
