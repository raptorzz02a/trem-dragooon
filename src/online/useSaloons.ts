import { useCallback, useEffect, useState } from 'react';
import { PUBLIC_SALOON_ID, PUBLIC_SALOON_NAME, type Saloon } from './saloons';
import { api } from './useAccount';

// Saloons du compte connecté et saloon ouvert sur cet appareil (le dernier utilisé est rouvert à la visite suivante).

const CURRENT_KEY = 'trem-dragooon.saloon';

function storedCurrent(): string {
  try {
    return localStorage.getItem(CURRENT_KEY) ?? PUBLIC_SALOON_ID;
  } catch {
    return PUBLIC_SALOON_ID;
  }
}

function storeCurrent(id: string): void {
  try {
    localStorage.setItem(CURRENT_KEY, id);
  } catch {
    // Sans stockage, on rouvre le saloon public à chaque visite.
  }
}

/** Le saloon public, tel qu'affiché avant la première réponse du serveur. */
const PUBLIC: Saloon = { id: PUBLIC_SALOON_ID, name: PUBLIC_SALOON_NAME, color: '', icon: '🎯', public: true, role: 'member', members: 0 };

export interface SaloonsState {
  saloons: Saloon[];
  current: Saloon;
  select: (id: string) => void;
  create: (name: string, password: string, color: string, icon: string) => Promise<Saloon>;
  join: (name: string, password: string) => Promise<Saloon>;
  joinByInvite: (invite: string) => Promise<Saloon>;
  renewInvite: (id: string) => Promise<Saloon>;
  leave: (id: string) => Promise<void>;
}

export function useSaloons(accountId: string): SaloonsState {
  const [saloons, setSaloons] = useState<Saloon[]>([PUBLIC]);
  const [currentId, setCurrentId] = useState(storedCurrent);

  const select = useCallback((id: string) => {
    storeCurrent(id);
    setCurrentId(id);
  }, []);

  const refresh = useCallback(async () => {
    const r = await api<{ saloons: Saloon[] }>('/api/saloons');
    setSaloons(r.saloons);
    return r.saloons;
  }, []);

  useEffect(() => {
    if (accountId) void refresh().catch(() => undefined);
    else setSaloons([PUBLIC]);
  }, [refresh, accountId]);

  /** Un saloon qu'on vient de créer ou de rejoindre devient le saloon ouvert. */
  const entered = async (saloon: Saloon) => {
    await refresh().catch(() => setSaloons((list) => [...list.filter((s) => s.id !== saloon.id), saloon]));
    select(saloon.id);
    return saloon;
  };

  const post = (path: string, data: unknown) => api<{ saloon: Saloon }>(path, { method: 'POST', body: JSON.stringify(data) }).then((r) => r.saloon);

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
    leave: async (id) => {
      await api(`/api/saloons/${encodeURIComponent(id)}/leave`, { method: 'POST' });
      await refresh();
      if (id === currentId) select(PUBLIC_SALOON_ID);
    },
  };
}
