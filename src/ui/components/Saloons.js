import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import { canEditSaloon, cleanMinGames, inviteLink, MAX_SALOON_MEMBERS, MIN_GAMES_MAX, MIN_GAMES_MIN, PUBLIC_SALOON_ID, SALOON_COLORS, SALOON_ICONS, saloonNameProblem, saloonPasswordProblem, } from '../../online/saloons';
import { api } from '../../online/useAccount';
import { ROLE_NAMES, SaloonMembersList, SaloonSettings } from './SaloonManager';
import './Saloons.css';
// Choix du saloon à l'accueil, façon Discord : une colonne d'icônes sur PC, un menu déroulant sur téléphone.
function SaloonIcon({ saloon, size = 56 }) {
    return (_jsxs("span", { className: `saloon-icon${saloon.public ? ' saloon-icon-public' : ''}`, style: { width: size, height: size, fontSize: size * 0.5, ...(saloon.color ? { background: saloon.color } : {}) }, "aria-hidden": true, children: [saloon.icon, !!saloon.live && _jsx("span", { className: "saloon-live", title: "Partie en cours" })] }));
}
/** Colonne d'icônes (PC). */
export function SaloonRail({ state, onAdd }) {
    return (_jsxs("nav", { className: "saloon-rail", "aria-label": "Saloons", children: [state.saloons.map((s) => (_jsx("button", { className: `saloon-rail-item${s.id === state.current.id ? ' selected' : ''}`, title: s.name, "aria-label": s.name, "aria-current": s.id === state.current.id, onClick: () => state.select(s.id), children: _jsx(SaloonIcon, { saloon: s }) }, s.id))), _jsx("button", { className: "saloon-rail-add", title: "Cr\u00E9er ou rejoindre un saloon", "aria-label": "Cr\u00E9er ou rejoindre un saloon", onClick: onAdd, children: "+" })] }));
}
/** Saloon ouvert : son nom, et sur téléphone le menu déroulant pour en changer. */
export function SaloonHeader({ state, onAdd, onInfo }) {
    const [open, setOpen] = useState(false);
    const { current } = state;
    return (_jsxs("div", { className: `saloon-header${state.fixed ? ' saloon-fixed' : ''}`, children: [_jsxs("button", { className: "saloon-header-toggle", "aria-haspopup": "menu", "aria-expanded": open, onClick: () => setOpen((o) => !o), children: [_jsx(SaloonIcon, { saloon: current, size: 40 }), _jsx("span", { className: "saloon-header-name", children: current.name }), _jsx("span", { className: "saloon-header-caret", children: open ? '▴' : '▾' })] }), _jsxs("span", { className: "saloon-header-name saloon-header-static", children: [_jsx(SaloonIcon, { saloon: current, size: 40 }), current.name] }), _jsx("button", { className: "saloon-header-info", onClick: onInfo, children: current.public ? ('Saloon public, ouvert à tous') : (_jsxs(_Fragment, { children: [current.members, " membre", current.members > 1 ? 's' : '', current.invite ? ' · Inviter' : ''] })) }), open && (_jsxs(_Fragment, { children: [_jsx("div", { className: "home-menu-backdrop", onClick: () => setOpen(false) }), _jsxs("div", { className: "saloon-menu", role: "menu", children: [state.saloons.map((s) => (_jsxs("button", { role: "menuitem", className: s.id === current.id ? 'selected' : '', onClick: () => {
                                    setOpen(false);
                                    state.select(s.id);
                                }, children: [_jsx(SaloonIcon, { saloon: s, size: 36 }), s.name] }, s.id))), _jsx("button", { role: "menuitem", className: "saloon-menu-add", onClick: () => {
                                    setOpen(false);
                                    onAdd();
                                }, children: "+ Cr\u00E9er ou rejoindre un saloon" })] })] }))] }));
}
/** Créer un saloon, ou en rejoindre un avec son nom et son mot de passe. */
export function SaloonDialog({ state, myId, onClose }) {
    const [tab, setTab] = useState('join');
    const [name, setName] = useState('');
    const [password, setPassword] = useState('');
    const [color, setColor] = useState(SALOON_COLORS[0]);
    const [icon, setIcon] = useState(SALOON_ICONS[0]);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState(null);
    const [created, setCreated] = useState(null);
    const problem = tab === 'create' ? ((name && saloonNameProblem(name)) || (password && saloonPasswordProblem(password)) || null) : null;
    const submit = async () => {
        setBusy(true);
        setError(null);
        try {
            if (tab === 'create')
                setCreated(await state.create(name, password, color, icon));
            else {
                await state.join(name, password);
                onClose();
            }
        }
        catch (e) {
            setError(e instanceof Error ? e.message : 'Action impossible.');
        }
        finally {
            setBusy(false);
        }
    };
    if (created)
        return _jsx(SaloonInfo, { saloon: created, state: state, myId: myId, onClose: onClose, welcome: true });
    return (_jsx("div", { className: "overlay", children: _jsxs("form", { className: "dialog saloon-dialog", onSubmit: (e) => {
                e.preventDefault();
                if (!busy && name && password && !problem)
                    void submit();
            }, children: [_jsxs("div", { className: "segmented", children: [_jsx("button", { type: "button", className: tab === 'join' ? 'selected' : '', onClick: () => setTab('join'), children: "Rejoindre" }), _jsx("button", { type: "button", className: tab === 'create' ? 'selected' : '', onClick: () => setTab('create'), children: "Cr\u00E9er" })] }), _jsx("input", { "aria-label": "Nom du saloon", placeholder: "Nom du saloon", value: name, maxLength: 30, onChange: (e) => setName(e.target.value), autoFocus: true }), _jsx("input", { "aria-label": "Mot de passe du saloon", placeholder: "Mot de passe du saloon", type: "password", autoComplete: tab === 'create' ? 'new-password' : 'off', value: password, onChange: (e) => setPassword(e.target.value) }), tab === 'create' && (_jsxs(_Fragment, { children: [_jsx("div", { className: "saloon-choices", role: "radiogroup", "aria-label": "Couleur", children: SALOON_COLORS.map((c) => (_jsx("button", { type: "button", role: "radio", "aria-checked": c === color, "aria-label": `Couleur ${c}`, className: `saloon-swatch${c === color ? ' selected' : ''}`, style: { background: c }, onClick: () => setColor(c) }, c))) }), _jsx("div", { className: "saloon-choices", role: "radiogroup", "aria-label": "Ic\u00F4ne", children: SALOON_ICONS.map((i) => (_jsx("button", { type: "button", role: "radio", "aria-checked": i === icon, className: `saloon-choice-icon${i === icon ? ' selected' : ''}`, style: i === icon ? { background: color } : undefined, onClick: () => setIcon(i), children: i }, i))) })] })), (problem || error) && _jsx("div", { className: "online-error", children: problem || error }), _jsxs("div", { className: "dialog-actions", children: [_jsx("button", { type: "button", onClick: onClose, children: "Annuler" }), _jsx("button", { type: "submit", className: "btn-gold", disabled: busy || !name || !password || !!problem, children: tab === 'create' ? 'Créer le saloon' : 'Entrer' })] })] }) }));
}
/** Nombre de parties à jouer dans le saloon pour être classé : réglé par les admins du saloon. */
function RankingSetting({ saloon, onSaved }) {
    const [value, setValue] = useState(String(saloon.minGames));
    const [message, setMessage] = useState(null);
    const n = cleanMinGames(Number(value));
    const save = () => {
        setMessage(null);
        api(`/api/saloons/${encodeURIComponent(saloon.id)}/ranking`, { method: 'PUT', body: JSON.stringify({ minGames: n }) })
            .then(() => {
            setMessage({ text: 'Enregistré.' });
            onSaved();
        })
            .catch((e) => setMessage({ text: e.message, error: true }));
    };
    return (_jsxs("div", { className: "saloon-ranking", children: [_jsx("div", { className: "label", children: "Classement" }), _jsxs("label", { className: "saloon-ranking-row", children: ["Class\u00E9 \u00E0 partir de", _jsx("input", { "aria-label": "Parties minimum pour \u00EAtre class\u00E9", type: "number", inputMode: "numeric", min: MIN_GAMES_MIN, max: MIN_GAMES_MAX, value: value, onChange: (e) => setValue(e.target.value) }), "parties", _jsx("button", { type: "button", disabled: n === null || n === saloon.minGames, onClick: save, children: "Enregistrer" })] }), message && _jsx("div", { className: message.error ? 'online-error' : 'saloon-hint', children: message.text })] }));
}
/** Le saloon ouvert : lien d'invitation, membres, réglages (selon le rôle), et le quitter. */
export function SaloonInfo({ saloon, state, myId, onClose, welcome }) {
    // Le saloon peut changer pendant que la fenêtre est ouverte (nouveau lien, renommé).
    const current = state.saloons.find((s) => s.id === saloon.id) ?? saloon;
    const [tab, setTab] = useState('saloon');
    const [copied, setCopied] = useState(false);
    const [confirmLeave, setConfirmLeave] = useState(false);
    const [error, setError] = useState(null);
    const link = current.invite ? inviteLink(location.origin, current.invite) : null;
    const tabs = [
        ['saloon', 'Saloon'],
        ['members', 'Membres'],
        ...(canEditSaloon(current.role) ? [['settings', 'Réglages']] : []),
    ];
    const run = (action) => {
        setError(null);
        action().catch((e) => setError(e.message));
    };
    return (_jsx("div", { className: "overlay", children: _jsxs("div", { className: "dialog saloon-dialog", children: [_jsxs("h2", { children: [current.icon, " ", current.name] }), !current.public && (_jsx("div", { className: "segmented saloon-tabs", children: tabs.map(([t, label]) => (_jsx("button", { className: tab === t ? 'selected' : '', onClick: () => setTab(t), children: label }, t))) })), tab === 'members' && _jsx(SaloonMembersList, { saloonId: current.id, actor: current.role, myId: myId, onChanged: () => void state.refresh() }), tab === 'settings' && (_jsx(SaloonSettings, { saloonId: current.id, actor: current.role, initial: current, onChanged: () => void state.refresh(), onDeleted: () => {
                        state.select(PUBLIC_SALOON_ID);
                        void state.refresh();
                        onClose();
                    } })), tab === 'saloon' && (_jsxs(_Fragment, { children: [welcome && _jsx("div", { children: "Ton saloon est pr\u00EAt. Envoie ce lien \u00E0 tes amis : il les fait entrer directement, sans mot de passe." }), current.public ? (_jsx("div", { children: "Le saloon public, ouvert \u00E0 tous : chacun y lance une partie comme il veut, avec un pote, en solo ou chez lui. Tous les joueurs en font partie, et son classement est celui de tout le monde." })) : (_jsxs("div", { className: "saloon-info-line", children: [ROLE_NAMES[current.role], " \u00B7 ", current.members, " / ", MAX_SALOON_MEMBERS, " membres"] })), canEditSaloon(current.role) && _jsx(RankingSetting, { saloon: current, onSaved: () => void state.refresh() }), link && (_jsxs("div", { className: "saloon-invite", children: [_jsx("input", { "aria-label": "Lien d'invitation", readOnly: true, value: link, onFocus: (e) => e.target.select() }), _jsxs("div", { className: "dialog-actions", children: [_jsx("button", { type: "button", onClick: () => run(async () => {
                                                await navigator.clipboard.writeText(link);
                                                setCopied(true);
                                            }), children: copied ? 'Copié' : 'Copier le lien' }), _jsx("button", { type: "button", onClick: () => run(() => state.renewInvite(current.id).then(() => setCopied(false))), children: "Nouveau lien" })] }), _jsx("div", { className: "saloon-hint", children: "\u00AB Nouveau lien \u00BB rend l'ancien inutilisable. Sans lien, on entre avec le nom et le mot de passe du saloon." })] }))] })), error && _jsx("div", { className: "online-error", children: error }), _jsxs("div", { className: "dialog-actions", children: [!current.public &&
                            tab === 'saloon' &&
                            (confirmLeave ? (_jsx("button", { type: "button", className: "btn-danger", onClick: () => run(() => state.leave(current.id).then(onClose)), children: "Confirmer : quitter" })) : (_jsx("button", { type: "button", className: "btn-danger", onClick: () => setConfirmLeave(true), children: "Quitter le saloon" }))), _jsx("button", { type: "button", className: "btn-gold", onClick: onClose, children: "Fermer" })] }), confirmLeave && current.role === 'owner' && (_jsx("div", { className: "saloon-hint", children: "Tu es propri\u00E9taire : la propri\u00E9t\u00E9 passera \u00E0 l'admin le plus ancien, \u00E0 d\u00E9faut au membre le plus ancien." }))] }) }));
}
