import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { canDeleteSaloon, canEditSaloon, canManage, SALOON_COLORS, SALOON_ICONS, saloonKey, saloonNameProblem, saloonPasswordProblem, } from '../../online/saloons';
import { api } from '../../online/useAccount';
import { Avatar } from './Avatar';
// Administration d'un saloon : membres et rôles, réglages, suppression. Sert au propriétaire et aux admins du saloon,
// et à l'administrateur de l'appli depuis l'espace Administration.
export const ROLE_NAMES = { owner: 'Propriétaire', admin: 'Admin', member: 'Membre' };
const ACTIONS = [
    { action: 'promote', label: 'Nommer admin' },
    { action: 'demote', label: 'Retirer admin' },
    { action: 'transfer', label: 'Donner la propriété', confirm: (n) => `${n} devient propriétaire du saloon ; l'actuel propriétaire reste admin.` },
    { action: 'kick', label: 'Exclure', confirm: (n) => `${n} sort du saloon. Il pourra revenir avec le mot de passe ou un lien.`, danger: true },
    { action: 'ban', label: 'Bannir', confirm: (n) => `${n} sort du saloon et ne pourra plus y revenir, même avec le mot de passe.`, danger: true },
];
const base = (saloonId) => `/api/saloons/${encodeURIComponent(saloonId)}`;
/** Liste des membres, avec les actions permises à celui qui regarde. */
export function SaloonMembersList({ saloonId, actor, myId, onChanged }) {
    const [data, setData] = useState(null);
    const [pending, setPending] = useState(null);
    const [error, setError] = useState(null);
    const load = () => api(`${base(saloonId)}/members`)
        .then(setData)
        .catch((e) => setError(e.message));
    useEffect(() => {
        void load();
        // Rechargée seulement quand on change de saloon ; les actions la rechargent elles-mêmes.
    }, [saloonId]);
    const act = async (accountId, action) => {
        setError(null);
        try {
            await api(`${base(saloonId)}/members/${encodeURIComponent(accountId)}/${action}`, { method: 'POST' });
            setPending(null);
            await load();
            onChanged?.();
        }
        catch (e) {
            setError(e instanceof Error ? e.message : 'Action impossible.');
        }
    };
    if (!data)
        return _jsx("div", { className: "saloon-hint", children: error ?? 'Chargement des membres…' });
    return (_jsxs("div", { className: "saloon-members", children: [data.members.map((m) => {
                const allowed = ACTIONS.filter((a) => (m.id !== myId || actor === 'global') && canManage(actor, m.role, a.action));
                return (_jsxs("div", { className: "saloon-member", children: [_jsx(Avatar, { avatar: m.avatar, color: m.color, size: 40 }), _jsx("span", { className: "saloon-member-name", children: m.name }), m.role !== 'member' && _jsx("span", { className: `saloon-role saloon-role-${m.role}`, children: ROLE_NAMES[m.role] }), allowed.length > 0 && (_jsx("div", { className: "saloon-member-actions", children: allowed.map((a) => (_jsx("button", { className: a.danger ? 'btn-danger' : '', onClick: () => (a.confirm ? setPending({ member: m, action: a }) : void act(m.id, a.action)), children: a.label }, a.action))) }))] }, m.id));
            }), data.banned.length > 0 && (_jsxs(_Fragment, { children: [_jsx("div", { className: "label", children: "Bannis" }), data.banned.map((b) => (_jsxs("div", { className: "saloon-member", children: [_jsx("span", { className: "saloon-member-name", children: b.name }), _jsx("div", { className: "saloon-member-actions", children: _jsx("button", { onClick: () => void act(b.id, 'unban'), children: "Lever le bannissement" }) })] }, b.id)))] })), pending && (_jsxs("div", { className: "saloon-confirm", children: [_jsx("div", { children: pending.action.confirm(pending.member.name) }), _jsxs("div", { className: "dialog-actions", children: [_jsx("button", { onClick: () => setPending(null), children: "Annuler" }), _jsx("button", { className: pending.action.danger ? 'btn-danger' : 'btn-gold', onClick: () => void act(pending.member.id, pending.action.action), children: pending.action.label })] })] })), error && _jsx("div", { className: "online-error", children: error })] }));
}
/** Réglages du saloon (propriétaire, admins) et suppression (propriétaire). */
export function SaloonSettings({ saloonId, actor, initial, onChanged, onDeleted }) {
    const [name, setName] = useState(initial.name);
    const [color, setColor] = useState(initial.color);
    const [icon, setIcon] = useState(initial.icon);
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [message, setMessage] = useState(null);
    const problem = saloonNameProblem(name) ?? (password ? saloonPasswordProblem(password) : null);
    const save = async () => {
        setMessage(null);
        try {
            await api(base(saloonId), { method: 'PUT', body: JSON.stringify({ name, password, color, icon }) });
            setPassword('');
            setMessage({ text: password ? 'Enregistré. Nouveau mot de passe actif : les membres restent membres.' : 'Enregistré.' });
            onChanged();
        }
        catch (e) {
            setMessage({ text: e instanceof Error ? e.message : 'Action impossible.', error: true });
        }
    };
    const remove = async () => {
        setMessage(null);
        try {
            await api(base(saloonId), { method: 'DELETE', body: JSON.stringify({ confirm }) });
            onDeleted();
        }
        catch (e) {
            setMessage({ text: e instanceof Error ? e.message : 'Action impossible.', error: true });
        }
    };
    return (_jsxs("div", { className: "saloon-settings", children: [canEditSaloon(actor) && (_jsxs(_Fragment, { children: [_jsx("input", { "aria-label": "Nom du saloon", value: name, maxLength: 30, onChange: (e) => setName(e.target.value) }), _jsx("input", { "aria-label": "Nouveau mot de passe du saloon", placeholder: "Nouveau mot de passe (facultatif)", type: "password", autoComplete: "new-password", value: password, onChange: (e) => setPassword(e.target.value) }), _jsx("div", { className: "saloon-choices", role: "radiogroup", "aria-label": "Couleur", children: SALOON_COLORS.map((c) => (_jsx("button", { type: "button", role: "radio", "aria-checked": c === color, "aria-label": `Couleur ${c}`, className: `saloon-swatch${c === color ? ' selected' : ''}`, style: { background: c }, onClick: () => setColor(c) }, c))) }), _jsx("div", { className: "saloon-choices", role: "radiogroup", "aria-label": "Ic\u00F4ne", children: SALOON_ICONS.map((i) => (_jsx("button", { type: "button", role: "radio", "aria-checked": i === icon, className: `saloon-choice-icon${i === icon ? ' selected' : ''}`, style: i === icon ? { background: color } : undefined, onClick: () => setIcon(i), children: i }, i))) }), problem && _jsx("div", { className: "online-error", children: problem }), _jsx("div", { className: "dialog-actions", children: _jsx("button", { className: "btn-gold", disabled: !!problem, onClick: () => void save(), children: "Enregistrer" }) })] })), canDeleteSaloon(actor) && (_jsxs("div", { className: "saloon-delete", children: [_jsx("div", { className: "label", children: "Supprimer le saloon" }), _jsx("div", { className: "saloon-hint", children: "Ses parties restent dans les stats de ceux qui les ont jou\u00E9es. Retape le nom du saloon pour confirmer." }), _jsx("input", { "aria-label": "Nom du saloon \u00E0 supprimer", placeholder: initial.name, value: confirm, onChange: (e) => setConfirm(e.target.value) }), _jsx("div", { className: "dialog-actions", children: _jsx("button", { className: "btn-danger", disabled: saloonKey(confirm) !== saloonKey(initial.name), onClick: () => void remove(), children: "Supprimer d\u00E9finitivement" }) })] })), message && _jsx("div", { className: message.error ? 'online-error' : 'saloon-hint', children: message.text })] }));
}
