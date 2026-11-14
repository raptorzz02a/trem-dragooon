import { useCallback, useEffect, useState } from 'react';
import { apiUrl } from './api';
// Compte du mode en ligne sur cet appareil : le jeton de connexion est gardé dans le navigateur.
const TOKEN_KEY = 'trem-dragooon.account.token';
const ACCOUNT_KEY = 'trem-dragooon.account';
function read(key) {
    try {
        return localStorage.getItem(key);
    }
    catch {
        return null;
    }
}
function write(key, value) {
    try {
        if (value)
            localStorage.setItem(key, value);
        else
            localStorage.removeItem(key);
    }
    catch {
        // Sans stockage, il faudra se reconnecter à chaque visite.
    }
}
export const accountToken = () => read(TOKEN_KEY);
function cachedAccount() {
    try {
        return accountToken() ? JSON.parse(read(ACCOUNT_KEY) ?? 'null') : null;
    }
    catch {
        return null;
    }
}
export async function api(path, init = {}) {
    const token = accountToken();
    const res = await fetch(apiUrl(path), {
        ...init,
        headers: { 'content-type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...init.headers },
    }).catch(() => {
        throw new Error('Serveur en ligne injoignable.');
    });
    const data = (await res.json().catch(() => ({})));
    if (!res.ok)
        throw Object.assign(new Error(data.error ?? 'Serveur en ligne injoignable.'), { status: res.status });
    return data;
}
/** Classement d'un saloon : ses membres et ses parties. */
export const loadCommunity = (saloonId) => api(`/api/community?saloon=${encodeURIComponent(saloonId)}`);
/** Fiche d'un joueur, limitée aux saloons partagés (la sienne : tout). */
export const loadPlayer = (accountId) => api(`/api/players/${encodeURIComponent(accountId)}`);
export function useAccount() {
    const [account, setAccount] = useState(cachedAccount);
    const [admin, setAdmin] = useState(false);
    const [hasRecovery, setHasRecovery] = useState(true);
    const [recovery, setRecovery] = useState(null);
    const remember = useCallback((token, next) => {
        write(TOKEN_KEY, token);
        write(ACCOUNT_KEY, next ? JSON.stringify(next) : null);
        setAccount(next);
        if (!next)
            setAdmin(false);
    }, []);
    // Le compte gardé en mémoire est rafraîchi (pseudo ou avatar changés ailleurs, session révoquée).
    useEffect(() => {
        if (!account)
            return;
        api('/api/account')
            .then((r) => {
            remember(accountToken(), r.account);
            setAdmin(r.admin);
            setHasRecovery(r.recovery);
        })
            .catch((e) => {
            if (e.status === 401)
                remember(null, null);
        });
        // Relu à chaque connexion (account?.id), pour savoir si le nouveau compte est administrateur.
    }, [remember, account?.id]);
    const signup = async (name, password, color, avatar) => {
        const r = await api('/api/account/signup', { method: 'POST', body: JSON.stringify({ name, password, color, avatar }) });
        setRecovery(r.recovery ?? null);
        remember(r.token, r.account);
    };
    const login = async (name, password) => {
        const r = await api('/api/account/login', { method: 'POST', body: JSON.stringify({ name, password }) });
        remember(r.token, r.account);
    };
    const logout = () => {
        void api('/api/account/logout', { method: 'POST' }).catch(() => undefined);
        remember(null, null);
    };
    const update = async (changes) => {
        const r = await api('/api/account', { method: 'PUT', body: JSON.stringify(changes) });
        remember(accountToken(), r.account);
    };
    const changePassword = async (current, next) => {
        // Les autres appareils sont déconnectés ; celui-ci reçoit un nouveau jeton.
        const r = await api('/api/account/password', { method: 'POST', body: JSON.stringify({ current, next }) });
        remember(r.token, account);
    };
    const renewRecovery = async (password) => {
        const r = await api('/api/account/recovery', { method: 'POST', body: JSON.stringify({ password }) });
        setHasRecovery(true);
        setRecovery(r.recovery);
    };
    const recover = async (name, code, password) => {
        const r = await api('/api/account/recover', { method: 'POST', body: JSON.stringify({ name, code, password }) });
        setRecovery(r.recovery ?? null);
        remember(r.token, r.account);
    };
    const requestPassword = async (name) => {
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
