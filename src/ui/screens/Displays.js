import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { api } from '../../online/useAccount';
import { dateTime } from '../format';
import './Online.css';
/** Adresse de la page tableau : celle du serveur en ligne, même quand la borne sert l'appli elle-même. */
const TABLET_URL = `${import.meta.env.VITE_API_URL ? new URL(import.meta.env.VITE_API_URL).host : location.host}/tableau.html`;
/**
 * Tablettes « tableau de scores » (vieil iPad fixé au-dessus de la cible) : on les relie au compte avec le code
 * qu'elles affichent, puis on les règle d'ici, sans avoir à y toucher.
 */
export function Displays({ onBack }) {
    const [displays, setDisplays] = useState(null);
    const [code, setCode] = useState('');
    const [error, setError] = useState(null);
    const [message, setMessage] = useState(null);
    const [busy, setBusy] = useState(false);
    const load = () => api('/api/displays')
        .then((r) => setDisplays(r.displays))
        .catch((e) => setError(e instanceof Error ? e.message : 'Chargement impossible.'));
    useEffect(() => {
        void load();
    }, []);
    const run = async (action, done) => {
        setBusy(true);
        setError(null);
        setMessage(null);
        try {
            await action();
            await load();
            if (done)
                setMessage(done);
        }
        catch (e) {
            setError(e instanceof Error ? e.message : 'Action refusée.');
        }
        finally {
            setBusy(false);
        }
    };
    const link = () => run(async () => {
        await api('/api/displays', { method: 'POST', body: JSON.stringify({ code }) });
        setCode('');
    }, 'Tablette reliée : elle affichera les parties de ce compte.');
    const update = (d, settings, done) => run(() => api(`/api/displays/${encodeURIComponent(d.id)}`, { method: 'PUT', body: JSON.stringify({ settings }) }), done);
    const unlink = (d) => run(() => api(`/api/displays/${encodeURIComponent(d.id)}`, { method: 'DELETE' }), 'Tablette déliée : elle affiche un nouveau code.');
    return (_jsxs("div", { className: "screen online", children: [_jsxs("header", { className: "online-top", children: [_jsx("button", { onClick: onBack, children: "\u2190 Accueil" }), _jsx("h1", { children: "Tableau iPad" }), _jsx("span", {})] }), _jsxs("section", { className: "online-block", children: [_jsx("div", { className: "label", children: "Relier une tablette" }), _jsxs("div", { className: "online-hint", children: ["Sur la tablette, ouvre ", _jsx("strong", { children: TABLET_URL }), " dans Safari : elle affiche un code \u00E0 4 chiffres. Tape-le ici."] }), _jsxs("form", { className: "online-join", onSubmit: (e) => {
                            e.preventDefault();
                            void link();
                        }, children: [_jsx("input", { "aria-label": "Code affich\u00E9 sur la tablette", inputMode: "numeric", autoComplete: "off", maxLength: 4, placeholder: "Code de la tablette", value: code, onChange: (e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 4)) }), _jsx("button", { className: "btn-gold", type: "submit", disabled: busy || code.length !== 4, children: "Relier" })] }), error && _jsx("div", { className: "online-error", children: error }), message && _jsx("div", { className: "online-rules", children: message })] }), _jsxs("section", { className: "online-block", children: [_jsx("div", { className: "label", children: "Tablettes reli\u00E9es \u00E0 ce compte" }), !displays && !error && _jsx("div", { className: "online-hint", children: "Chargement\u2026" }), displays?.length === 0 && _jsx("div", { className: "online-hint", children: "Aucune tablette pour l\u2019instant." }), _jsx("div", { className: "admin-list", children: displays?.map((d, i) => (_jsxs("div", { className: "admin-row", children: [_jsxs("div", { className: "admin-who", children: [_jsxs("span", { className: "admin-name", children: ["Tablette ", i + 1] }), _jsxs("span", { className: "admin-dates", children: ["Reli\u00E9e le ", dateTime(d.createdAt), d.seenAt ? ` · vue le ${dateTime(d.seenAt)}` : ''] })] }), _jsxs("div", { className: "admin-actions", children: [_jsxs("button", { disabled: busy, "aria-pressed": d.settings.animations, onClick: () => update(d, { animations: !d.settings.animations }), children: ["Animations : ", d.settings.animations ? 'oui' : 'non'] }), _jsxs("button", { disabled: busy, "aria-pressed": d.settings.dim, onClick: () => update(d, { dim: !d.settings.dim }), children: ["Att\u00E9nuer hors partie : ", d.settings.dim ? 'oui' : 'non'] }), _jsx("button", { disabled: busy, onClick: () => update(d, { reload: Date.now() }, 'La tablette va se recharger (sous 10 secondes).'), children: "Recharger" }), _jsx("button", { disabled: busy, onClick: () => unlink(d), children: "D\u00E9lier" })] })] }, d.id))) }), _jsx("div", { className: "online-hint", children: "La tablette suit toute seule la partie en cours de ce compte. R\u00E9glages conseill\u00E9s sur l\u2019iPad : Luminosit\u00E9 \u203A Verrouillage auto : Jamais, page ajout\u00E9e \u00E0 l\u2019\u00E9cran d\u2019accueil, Acc\u00E8s guid\u00E9 activ\u00E9, chargeur branch\u00E9." })] })] }));
}
