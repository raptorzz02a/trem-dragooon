import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { api } from '../../online/useAccount';
import { Avatar } from '../components/Avatar';
import { SaloonMembersList, SaloonSettings } from '../components/SaloonManager';
import '../components/Saloons.css';
import { dateTime, plural } from '../format';
import './Online.css';
const CONFIRM = {
    stats: {
        title: 'Remettre les stats à zéro',
        text: (n) => `Toutes les parties de ${n} ne compteront plus pour son compte. Elles restent valables pour ses adversaires. C’est définitif.`,
        button: 'Remettre à zéro',
    },
    password: {
        title: 'Nouveau mot de passe',
        text: (n) => `Un mot de passe provisoire va être créé pour ${n}, et ses appareils seront déconnectés.`,
        button: 'Créer le mot de passe',
    },
    delete: {
        title: 'Supprimer le compte',
        text: (n) => `Le compte ${n} sera supprimé. Ses parties restent pour ses adversaires, à son nom « Joueur supprimé ». C’est définitif.`,
        button: 'Supprimer',
    },
};
/** Espace administrateur : tous les comptes en ligne, et les actions de dépannage sur un compte. */
export function Admin({ myId, onBack }) {
    const [accounts, setAccounts] = useState(null);
    const [error, setError] = useState(null);
    const [pending, setPending] = useState(null);
    const [busy, setBusy] = useState(false);
    const [result, setResult] = useState(null);
    const [saloons, setSaloons] = useState(null);
    const [saloon, setSaloon] = useState(null);
    const loadSaloons = () => api('/api/admin/saloons')
        .then((r) => setSaloons(r.saloons))
        .catch((e) => setError(e.message));
    useEffect(() => {
        void loadSaloons();
    }, []);
    const load = () => api('/api/admin/accounts')
        .then((r) => setAccounts(r.accounts))
        .catch((e) => setError(e.message));
    useEffect(() => {
        void load();
    }, []);
    const run = async () => {
        if (!pending)
            return;
        const { account, action } = pending;
        const path = `/api/admin/accounts/${encodeURIComponent(account.id)}`;
        setBusy(true);
        setError(null);
        try {
            if (action === 'stats') {
                const r = await api(`${path}/reset-stats`, { method: 'POST' });
                setResult(`Stats de ${account.name} remises à zéro (${plural(r.games, 'partie')} retirée${r.games > 1 ? 's' : ''}).`);
            }
            else if (action === 'password') {
                const r = await api(`${path}/reset-password`, { method: 'POST' });
                setResult(`Mot de passe provisoire de ${account.name} : ${r.password}\nTransmets-le au joueur : il pourra le changer depuis l’accueil (« Mot de passe »).`);
            }
            else {
                await api(path, { method: 'DELETE' });
                setResult(`Compte ${account.name} supprimé.`);
            }
            setPending(null);
            await load();
        }
        catch (e) {
            setError(e instanceof Error ? e.message : 'Action impossible.');
        }
        finally {
            setBusy(false);
        }
    };
    return (_jsxs("div", { className: "screen online", children: [_jsxs("header", { className: "online-top", children: [_jsx("button", { onClick: onBack, children: "\u2190 Accueil" }), _jsx("h1", { children: "Administration" }), _jsx("span", {})] }), result && (_jsxs("div", { className: "online-block admin-result", children: [_jsx("div", { children: result }), _jsx("button", { onClick: () => setResult(null), children: "OK" })] })), error && !pending && _jsx("div", { className: "online-error", children: error }), !accounts && !error && _jsx("div", { className: "label", children: "Chargement des comptes\u2026" }), accounts && accounts.some((a) => a.passwordRequest) && (_jsxs("section", { className: "online-block admin-requests", children: [_jsx("div", { className: "label", children: "Demandes de mot de passe" }), _jsx("div", { className: "admin-list", children: accounts
                            .filter((a) => a.passwordRequest)
                            .map((a) => (_jsxs("div", { className: "admin-row", children: [_jsx(Avatar, { avatar: a.avatar, color: a.color, size: 48 }), _jsxs("div", { className: "admin-who", children: [_jsx("span", { className: "admin-name", children: a.name }), _jsxs("span", { className: "admin-dates", children: ["A oubli\u00E9 son mot de passe \u00B7 demande du ", dateTime(a.passwordRequest)] })] }), _jsxs("div", { className: "admin-actions", children: [_jsx("button", { className: "btn-gold", onClick: () => setPending({ account: a, action: 'password' }), children: "Mot de passe provisoire" }), _jsx("button", { onClick: () => void api(`/api/admin/accounts/${encodeURIComponent(a.id)}/request`, { method: 'DELETE' })
                                                .then(load)
                                                .catch((e) => setError(e.message)), children: "Ignorer" })] })] }, a.id))) }), _jsx("div", { className: "saloon-hint", children: "V\u00E9rifie que c\u2019est bien le joueur (en personne, par message) avant de lui transmettre le mot de passe." })] })), accounts && (_jsxs("section", { className: "online-block", children: [_jsx("div", { className: "label", children: plural(accounts.length, 'compte') }), _jsx("div", { className: "admin-list", children: accounts.map((a) => (_jsxs("div", { className: "admin-row", children: [_jsx(Avatar, { avatar: a.avatar, color: a.color, size: 48 }), _jsxs("div", { className: "admin-who", children: [_jsxs("span", { className: "admin-name", children: [a.name, a.admin && _jsx("span", { className: "admin-badge", children: "admin" })] }), _jsxs("span", { className: "admin-dates", children: ["Cr\u00E9\u00E9 le ", dateTime(a.createdAt), " \u00B7 Vu le ", a.lastSeenAt ? dateTime(a.lastSeenAt) : 'jamais', " \u00B7 ", plural(a.games, 'partie')] })] }), _jsxs("div", { className: "admin-actions", children: [_jsx("button", { onClick: () => setPending({ account: a, action: 'stats' }), children: "Reset stats" }), _jsx("button", { onClick: () => setPending({ account: a, action: 'password' }), children: "Reset mot de passe" }), a.id !== myId && (_jsx("button", { className: "btn-danger", onClick: () => setPending({ account: a, action: 'delete' }), children: "Supprimer" }))] })] }, a.id))) })] })), saloons && (_jsxs("section", { className: "online-block", children: [_jsxs("div", { className: "label", children: [plural(saloons.length, 'saloon'), " priv\u00E9", saloons.length > 1 ? 's' : '', " (plus le saloon public TREM-DRAGOOON)"] }), _jsx("div", { className: "admin-list", children: saloons.map((s) => (_jsxs("div", { className: "admin-row", children: [_jsx("span", { className: "saloon-icon", style: { width: 48, height: 48, fontSize: 24, background: s.color }, children: s.icon }), _jsxs("div", { className: "admin-who", children: [_jsx("span", { className: "admin-name", children: s.name }), _jsxs("span", { className: "admin-dates", children: ["Cr\u00E9\u00E9 le ", dateTime(s.createdAt), " \u00B7 ", plural(s.members, 'membre'), " \u00B7 Propri\u00E9taire : ", s.owner ?? 'aucun'] })] }), _jsx("div", { className: "admin-actions", children: _jsx("button", { onClick: () => setSaloon(s), children: "G\u00E9rer" }) })] }, s.id))) })] })), saloon && (_jsx("div", { className: "overlay", children: _jsxs("div", { className: "dialog saloon-dialog", children: [_jsxs("h2", { children: [saloon.icon, " ", saloon.name] }), _jsx(SaloonMembersList, { saloonId: saloon.id, actor: "global", myId: myId, onChanged: () => void loadSaloons() }), _jsx(SaloonSettings, { saloonId: saloon.id, actor: "global", initial: saloon, onChanged: () => void loadSaloons(), onDeleted: () => {
                                setSaloon(null);
                                setResult(`Saloon ${saloon.name} supprimé.`);
                                void loadSaloons();
                            } }, saloon.id), _jsx("div", { className: "dialog-actions", children: _jsx("button", { className: "btn-gold", onClick: () => setSaloon(null), children: "Fermer" }) })] }) })), pending && (_jsx("div", { className: "overlay", children: _jsxs("div", { className: "dialog", children: [_jsx("h2", { children: CONFIRM[pending.action].title }), _jsx("div", { children: CONFIRM[pending.action].text(pending.account.name) }), error && _jsx("div", { className: "online-error", children: error }), _jsxs("div", { className: "dialog-actions", children: [_jsx("button", { disabled: busy, onClick: () => setPending(null), children: "Annuler" }), _jsx("button", { className: pending.action === 'password' ? 'btn-gold' : 'btn-danger', disabled: busy, onClick: run, children: CONFIRM[pending.action].button })] })] }) }))] }));
}
