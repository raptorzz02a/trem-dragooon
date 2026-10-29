import { useCallback, useEffect, useState } from 'react';
import type { AvatarConfig } from '../profiles/types';
import { apiUrl } from './api';
import type { Community, Login, PublicAccount } from './accounts';

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

export const loadCommunity = () => api<Community>('/api/community');

export interface AccountState {
  account: PublicAccount | null;
  signup: (name: string, password: string, color: string, avatar: AvatarConfig) => Promise<void>;
  login: (name: string, password: string) => Promise<void>;
  logout: () => void;
  update: (changes: Pick<PublicAccount, 'name' | 'color' | 'avatar'>) => Promise<void>;
}

export function useAccount(): AccountState {
  const [account, setAccount] = useState<PublicAccount | null>(cachedAccount);

  const remember = useCallback((token: string | null, next: PublicAccount | null) => {
    write(TOKEN_KEY, token);
    write(ACCOUNT_KEY, next ? JSON.stringify(next) : null);
    setAccount(next);
  }, []);

  // Le compte gardé en mémoire est rafraîchi (pseudo ou avatar changés ailleurs, session révoquée).
  useEffect(() => {
    if (!accountToken()) return;
    api<{ account: PublicAccount }>('/api/account')
      .then((r) => remember(accountToken(), r.account))
      .catch((e: { status?: number }) => {
        if (e.status === 401) remember(null, null);
      });
  }, [remember]);

  const signup = async (name: string, password: string, color: string, avatar: AvatarConfig) => {
    const r = await api<Login>('/api/account/signup', { method: 'POST', body: JSON.stringify({ name, password, color, avatar }) });
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

  return { account, signup, login, logout, update };
}
