import { useCallback, useEffect, useState } from 'react';
import type { AvatarConfig } from '../profiles/types';
import { apiUrl } from './api';
import type { Community, Login, PlayerStats, PublicAccount } from './accounts';

// Compte du mode en ligne sur cet appareil : le jeton de connexion est gardé dans le navigateur.

const TOKEN_KEY = 'trem-dragooon.account.token';
const ACCOUNT_KEY = 'trem-dragooon.account';

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string | null): void {
  try {
    if (value) localStorage.setItem(key, value);
    else localStorage.removeItem(key);
  } catch {
    // Sans stockage, il faudra se reconnecter à chaque visite.
  }
}

export const accountToken = (): string | null => read(TOKEN_KEY);

function cachedAccount(): PublicAccount | null {
  try {
    return accountToken() ? (JSON.parse(read(ACCOUNT_KEY) ?? 'null') as PublicAccount | null) : null;
  } catch {
    return null;
  }
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = accountToken();
  const res = await fetch(apiUrl(path), {
    ...init,
    headers: { 'content-type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...init.headers },
  }).catch(() => {
    throw new Error('Serveur en ligne injoignable.');
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw Object.assign(new Error(data.error ?? 'Serveur en ligne injoignable.'), { status: res.status });
  return data;
}

/** Classement d'un saloon : ses membres et ses parties. */
export const loadCommunity = (saloonId: string) => api<Community>(`/api/community?saloon=${encodeURIComponent(saloonId)}`);

/** Fiche d'un joueur, limitée aux saloons partagés (la sienne : tout). */
export const loadPlayer = (accountId: string) => api<PlayerStats>(`/api/players/${encodeURIComponent(accountId)}`);

export interface AccountState {
  account: PublicAccount | null;
  /** Le compte connecté a accès à l'espace administrateur. */
  admin: boolean;
  signup: (name: string, password: string, color: string, avatar: AvatarConfig) => Promise<void>;
  login: (name: string, password: string) => Promise<void>;
  logout: () => void;
  update: (changes: Pick<PublicAccount, 'name' | 'color' | 'avatar'>) => Promise<void>;
  changePassword: (current: string, next: string) => Promise<void>;
  /** Le compte a un code de secours (les comptes d'avant les codes n'en ont pas tant qu'ils n'en créent pas). */
  hasRecovery: boolean;
  /** Code de secours à montrer une fois au joueur, puis oublié. */
  recovery: string | null;
  clearRecovery: () => void;
  renewRecovery: (password: string) => Promise<void>;
  /** Mot de passe oublié : nouveau mot de passe avec le code de secours. */
  recover: (name: string, code: string, password: string) => Promise<void>;
  /** Sans code de secours : la demande part à l'administrateur. */
  requestPassword: (name: string) => Promise<void>;
}

export function useAccount(): AccountState {
  const [account, setAccount] = useState<PublicAccount | null>(cachedAccount);
  const [admin, setAdmin] = useState(false);
  const [hasRecovery, setHasRecovery] = useState(true);
  const [recovery, setRecovery] = useState<string | null>(null);

  const remember = useCallback((token: string | null, next: PublicAccount | null) => {
    write(TOKEN_KEY, token);
    write(ACCOUNT_KEY, next ? JSON.stringify(next) : null);
    setAccount(next);
    if (!next) setAdmin(false);
  }, []);

  // Le compte gardé en mémoire est rafraîchi (pseudo ou avatar changés ailleurs, session révoquée).
  useEffect(() => {
    if (!account) return;
    api<{ account: PublicAccount; admin: boolean; recovery: boolean }>('/api/account')
      .then((r) => {
        remember(accountToken(), r.account);
        setAdmin(r.admin);
        setHasRecovery(r.recovery);
      })
      .catch((e: { status?: number }) => {
        if (e.status === 401) remember(null, null);
      });
    // Relu à chaque connexion (account?.id), pour savoir si le nouveau compte est administrateur.
  }, [remember, account?.id]);

  const signup = async (name: string, password: string, color: string, avatar: AvatarConfig) => {
    const r = await api<Login>('/api/account/signup', { method: 'POST', body: JSON.stringify({ name, password, color, avatar }) });
    setRecovery(r.recovery ?? null);
    remember(r.token, r.account);
  };
  const login = async (name: string, password: string) => {
    const r = await api<Login>('/api/account/login', { method: 'POST', body: JSON.stringify({ name, password }) });
    remember(r.token, r.account);
  };
  const logout = () => {
    void api('/api/account/logout', { method: 'POST' }).catch(() => undefined);
    remember(null, null);
  };
  const update = async (changes: Pick<PublicAccount, 'name' | 'color' | 'avatar'>) => {
    const r = await api<{ account: PublicAccount }>('/api/account', { method: 'PUT', body: JSON.stringify(changes) });
    remember(accountToken(), r.account);
  };

  const changePassword = async (current: string, next: string) => {
    // Les autres appareils sont déconnectés ; celui-ci reçoit un nouveau jeton.
    const r = await api<{ token: string }>('/api/account/password', { method: 'POST', body: JSON.stringify({ current, next }) });
    remember(r.token, account);
  };

  const renewRecovery = async (password: string) => {
    const r = await api<{ recovery: string }>('/api/account/recovery', { method: 'POST', body: JSON.stringify({ password }) });
    setHasRecovery(true);
    setRecovery(r.recovery);
  };
  const recover = async (name: string, code: string, password: string) => {
    const r = await api<Login>('/api/account/recover', { method: 'POST', body: JSON.stringify({ name, code, password }) });
    setRecovery(r.recovery ?? null);
    remember(r.token, r.account);
  };
  const requestPassword = async (name: string) => {
    await api('/api/account/password-request', { method: 'POST', body: JSON.stringify({ name }) });
  };

  return {
    account,
    admin,
    signup,
    login,
    logout,
    update,
    changePassword,
    hasRecovery,
    recovery,
    clearRecovery: () => setRecovery(null),
    renewRecovery,
    recover,
    requestPassword,
  };
}
