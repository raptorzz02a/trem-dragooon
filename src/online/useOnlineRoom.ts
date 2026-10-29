import { useCallback, useEffect, useRef, useState } from 'react';
import type { GameSetup } from '../game-setup/setup';
import { apiUrl, wsUrl } from './api';
import type { ClientMessage, OnlineIdentity, RoomPlace, RoomView, ServerMessage } from './protocol';
import { accountToken } from './useAccount';

// Connexion de l'appli à un salon en ligne, avec reconnexion automatique après une coupure réseau.

export type Connection = 'connecting' | 'open' | 'reconnecting' | 'closed';

const tokenKey = (code: string) => `trem-dragooon.online.${code}`;

function storedToken(code: string): string | null {
  try {
    return localStorage.getItem(tokenKey(code));
  } catch {
    return null;
  }
}

function storeToken(code: string, token: string | null): void {
  try {
    if (token) localStorage.setItem(tokenKey(code), token);
    else localStorage.removeItem(tokenKey(code));
  } catch {
    // Sans stockage, une page rechargée reviendra comme un nouveau joueur.
  }
}

const socketUrl = (code: string) => wsUrl(`/api/rooms/${code}/ws`);

/** Demande un nouveau salon au serveur et renvoie son code. */
export async function createOnlineRoom(place: RoomPlace, setup: GameSetup): Promise<string> {
  const res = await fetch(apiUrl('/api/rooms'), { method: 'POST', body: JSON.stringify({ place, setup }) }).catch(() => {
    throw new Error('Serveur en ligne injoignable.');
  });
  const data = (await res.json().catch(() => ({}))) as { code?: string; error?: string };
  if (!res.ok || !data.code) throw new Error(data.error ?? 'Serveur en ligne injoignable.');
  return data.code;
}

/** Codes de fermeture envoyés par le serveur quand il ne sert à rien de se reconnecter. */
const FINAL_CLOSE = new Set([4404, 4410, 1000]);

export interface OnlineRoom {
  connection: Connection;
  room: RoomView | null;
  playerId: string | null;
  /** Dernier refus du serveur (ex. « Ce n'est pas ton tour. »), effacé au bout de quelques secondes. */
  error: string | null;
  /** Pourquoi la connexion est définitivement fermée (code inconnu, partie déjà lancée…). */
  closedReason: string | null;
  send: (message: ClientMessage) => void;
  leave: () => void;
}

export function useOnlineRoom(code: string, identity: OnlineIdentity): OnlineRoom {
  const [connection, setConnection] = useState<Connection>('connecting');
  const [room, setRoom] = useState<RoomView | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [closedReason, setClosedReason] = useState<string | null>(null);
  const socket = useRef<WebSocket | null>(null);
  // L'identité n'est envoyée qu'à l'arrivée : la garder hors des dépendances évite des reconnexions inutiles.
  const identityRef = useRef(identity);

  useEffect(() => {
    let stopped = false;
    let retry: ReturnType<typeof setTimeout> | undefined;
    let attempt = 0;
    let joined = false;
    const fail = (reason: string) => {
      stopped = true;
      storeToken(code, null);
      setClosedReason(reason);
      setConnection('closed');
      socket.current?.close(1000);
    };

    const connect = () => {
      const ws = new WebSocket(socketUrl(code));
      socket.current = ws;
      ws.onopen = () => {
        attempt = 0;
        ws.send(
          JSON.stringify({ type: 'hello', token: storedToken(code), identity: identityRef.current, account: accountToken() } satisfies ClientMessage),
        );
      };
      ws.onmessage = (event) => {
        const message = JSON.parse(String(event.data)) as ServerMessage;
        if (message.type === 'welcome') {
          joined = true;
          storeToken(code, message.token);
          setPlayerId(message.playerId);
          setConnection('open');
        } else if (message.type === 'room') {
          setRoom(message.room);
        } else if (!joined) {
          // Arrivée refusée (code inconnu, partie déjà lancée, salon complet) : inutile d'insister.
          fail(message.message);
        } else {
          setError(message.message);
        }
      };
      ws.onclose = (event) => {
        if (socket.current === ws) socket.current = null;
        if (stopped) return;
        joined = false;
        if (FINAL_CLOSE.has(event.code)) {
          fail(event.code === 4410 ? 'Ce salon a expiré.' : event.code === 1000 ? 'Tu as quitté le salon.' : 'Aucune partie avec ce code.');
          return;
        }
        // Coupure réseau : nouvel essai de plus en plus espacé, sans dépasser 10 secondes.
        setConnection('reconnecting');
        retry = setTimeout(connect, Math.min(10_000, 1000 * 2 ** attempt++));
      };
    };

    connect();
    return () => {
      stopped = true;
      clearTimeout(retry);
      socket.current?.close(1000);
    };
  }, [code]);

  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(() => setError(null), 3500);
    return () => clearTimeout(timer);
  }, [error]);

  const send = useCallback((message: ClientMessage) => {
    const ws = socket.current;
    if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify(message));
    else setError('Connexion perdue : action non envoyée.');
  }, []);

  const leave = useCallback(() => {
    send({ type: 'leave' });
    storeToken(code, null);
  }, [code, send]);

  return { connection, room, playerId, error, closedReason, send, leave };
}

// Salon en cours sur cet appareil, pour y revenir après un rechargement de la page (écran verrouillé, appli fermée).
const CURRENT_KEY = 'trem-dragooon.online.current';

export function currentOnlineRoom(): string | null {
  try {
    const code = localStorage.getItem(CURRENT_KEY);
    return code && storedToken(code) ? code : null;
  } catch {
    return null;
  }
}

export function setCurrentOnlineRoom(code: string | null): void {
  try {
    if (code) localStorage.setItem(CURRENT_KEY, code);
    else localStorage.removeItem(CURRENT_KEY);
  } catch {
    // Sans stockage, il faudra retaper le code.
  }
}
