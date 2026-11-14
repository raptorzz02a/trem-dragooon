import { useCallback, useEffect, useState } from 'react';
import { MIN_RANKED_GAMES } from '../profiles/stats';
import { PUBLIC_SALOON_ID, PUBLIC_SALOON_NAME } from './saloons';
import { api } from './useAccount';
// Saloons du compte connecté et saloon ouvert sur cet appareil (le dernier utilisé est rouvert à la visite suivante).
const CURRENT_KEY = 'trem-dragooon.saloon';
/** Saloon fixé sur cet appareil (la borne du bar) : le sélecteur est masqué. */
const FIXED_KEY = 'trem-dragooon.saloon.fixed';
/** Les points verts (parties lancées) sont rafraîchis à ce rythme. */
const REFRESH_MS = 30_000;
function stored(key) {
    try {
        return localStorage.getItem(key);
    }
    catch {
        return null;
    }
}
function store(key, value) {
    try {
        if (value)
            localStorage.setItem(key, value);
        else
            localStorage.removeItem(key);
    }
    catch {
        // Sans stockage, on rouvre le saloon public à chaque visite.
    }
}
/** Le saloon public, tel qu'affiché avant la première réponse du serveur. */
const PUBLIC = { id: PUBLIC_SALOON_ID, name: PUBLIC_SALOON_NAME, color: '', icon: '🎯', public: true, role: 'member', members: 0, minGames: MIN_RANKED_GAMES };
export function useSaloons(accountId) {
    const [saloons, setSaloons] = useState([PUBLIC]);
    const [fixedId, setFixedId] = useState(() => stored(FIXED_KEY));
    const [currentId, setCurrentId] = useState(() => fixedId ?? stored(CURRENT_KEY) ?? PUBLIC_SALOON_ID);
    const select = useCallback((id) => {
        if (fixedId)
            return;
        store(CURRENT_KEY, id);
        setCurrentId(id);
    }, [fixedId]);
    const refresh = useCallback(async () => {
        const r = await api('/api/saloons');
        setSaloons(r.saloons);
        return r.saloons;
    }, []);
    useEffect(() => {
        if (!accountId) {
            setSaloons([PUBLIC]);
            return;
        }
        void refresh().catch(() => undefined);
        const timer = setInterval(() => void refresh().catch(() => undefined), REFRESH_MS);
        return () => clearInterval(timer);
    }, [refresh, accountId]);
    /** Un saloon qu'on vient de créer ou de rejoindre devient le saloon ouvert. */
    const entered = async (saloon) => {
        await refresh().catch(() => setSaloons((list) => [...list.filter((s) => s.id !== saloon.id), saloon]));
        select(saloon.id);
        return saloon;
    };
    const post = (path, data) => api(path, { method: 'POST', body: JSON.stringify(data) }).then((r) => r.saloon);
    return {
        saloons,
        // Un saloon quitté ou inconnu (autre compte sur cet appareil) : on retombe sur le saloon public.
        current: saloons.find((s) => s.id === currentId) ?? saloons[0] ?? PUBLIC,
        select,
        create: async (name, password, color, icon) => entered(await post('/api/saloons', { name, password, color, icon })),
        join: async (name, password) => entered(await post('/api/saloons/join', { name, password })),
        joinByInvite: async (invite) => entered(await post('/api/saloons/join', { invite })),
        renewInvite: async (id) => {
            const saloon = await post(`/api/saloons/${encodeURIComponent(id)}/invite`, {});
            setSaloons((list) => list.map((s) => (s.id === id ? saloon : s)));
            return saloon;
        },
        refresh,
        fixed: fixedId !== null,
        setFixed: (fixed) => {
            const id = fixed ? currentId : null;
            store(FIXED_KEY, id);
            setFixedId(id);
        },
        leave: async (id) => {
            await api(`/api/saloons/${encodeURIComponent(id)}/leave`, { method: 'POST' });
            await refresh();
            if (id === currentId)
                select(PUBLIC_SALOON_ID);
        },
    };
}
