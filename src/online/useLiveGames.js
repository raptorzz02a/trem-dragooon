import { useEffect, useRef, useState } from 'react';
import { wsUrl } from './api';
import { accountToken, api } from './useAccount';
// Parties en cours d'un saloon, et connexion d'un spectateur à l'une d'elles.
const REFRESH_MS = 15_000;
export function useLiveGames(saloonId) {
    const [games, setGames] = useState([]);
    const reload = useRef(async () => undefined);
    useEffect(() => {
        let stopped = false;
        const load = () => api(`/api/saloons/${encodeURIComponent(saloonId)}/games`)
            .then((r) => void (!stopped && setGames(r.games)))
            .catch(() => undefined);
        reload.current = load;
        setGames([]);
        void load();
        const timer = setInterval(load, REFRESH_MS);
        return () => {
            stopped = true;
            clearInterval(timer);
        };
    }, [saloonId]);
    /** Supprime la partie (hôte ou administrateur du saloon) : elle disparaît aussitôt de la liste. */
    const remove = async (watchKey) => {
        await api(`/api/saloons/${encodeURIComponent(saloonId)}/games/${encodeURIComponent(watchKey)}`, { method: 'DELETE' });
        setGames((list) => list.filter((g) => g.watchKey !== watchKey));
        void reload.current();
    };
    return { games, remove };
}
/** Regarder une partie : on reçoit son état à chaque fléchette, sans pouvoir rien y faire. */
export function useWatch(saloonId, watchKey) {
    const [room, setRoom] = useState(null);
    const [closed, setClosed] = useState(false);
    const socket = useRef(null);
    useEffect(() => {
        let stopped = false;
        let retry;
        let received = false;
        const connect = () => {
            const path = `/api/saloons/${encodeURIComponent(saloonId)}/games/${encodeURIComponent(watchKey)}/ws?token=${encodeURIComponent(accountToken() ?? '')}`;
            const ws = new WebSocket(wsUrl(path));
            socket.current = ws;
            ws.onmessage = (event) => {
                const message = JSON.parse(String(event.data));
                if (message.type === 'room') {
                    received = true;
                    setRoom(message.room);
                }
            };
            ws.onclose = (event) => {
                if (stopped)
                    return;
                // Partie effacée, ou refusée avant tout envoi : inutile d'insister ; coupure réseau : on réessaie.
                if (event.code === 4404 || event.code === 4410 || event.code === 4411 || !received) {
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
