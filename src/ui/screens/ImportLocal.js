import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { IMPORT_BATCH, involves } from '../../online/accounts';
import { api } from '../../online/useAccount';
import { openStore } from '../../storage/db';
import { Avatar } from '../components/Avatar';
import './Online.css';
/** Profils et parties enregistrés sur cet appareil avant le passage en ligne (vide sur un téléphone). */
export async function localData() {
    try {
        const { store, durable } = await openStore();
        if (!durable)
            return { profiles: [], games: [] };
        const [profiles, games] = await Promise.all([store.listProfiles(), store.listGames()]);
        return { profiles: profiles.filter((p) => !p.deleted && games.some((g) => involves(g, p.id))), games };
    }
    catch {
        return { profiles: [], games: [] };
    }
}
/**
 * Reprise des stats de la borne : le joueur connecté choisit quel profil de la borne était le sien,
 * et ses parties rejoignent son compte. Chaque joueur le fait une fois avec son compte.
 */
export function ImportLocal({ onBack }) {
    const [data, setData] = useState(null);
    const [chosen, setChosen] = useState(null);
    const [progress, setProgress] = useState(null);
    const [error, setError] = useState(null);
    const [done, setDone] = useState(null);
    useEffect(() => {
        void localData().then(setData);
    }, []);
    const run = async (profile) => {
        if (!data)
            return;
        setError(null);
        const games = data.games.filter((g) => involves(g, profile.id));
        let imported = 0;
        try {
            for (let i = 0; i < games.length; i += IMPORT_BATCH) {
                setProgress(`Envoi des parties… ${i}/${games.length}`);
                const r = await api('/api/account/import', {
                    method: 'POST',
                    body: JSON.stringify({ localId: profile.id, games: games.slice(i, i + IMPORT_BATCH) }),
                });
                imported += r.imported;
            }
            setDone(imported);
        }
        catch (e) {
            setError(e instanceof Error ? e.message : 'Envoi impossible.');
        }
        finally {
            setProgress(null);
        }
    };
    return (_jsxs("div", { className: "screen online", children: [_jsxs("header", { className: "online-top", children: [_jsx("button", { onClick: onBack, children: "\u2190 Accueil" }), _jsx("h1", { children: "Stats de la borne" }), _jsx("span", {})] }), _jsx("section", { className: "online-block", children: done !== null ? (_jsxs(_Fragment, { children: [_jsxs("div", { className: "online-rules", children: [done, " partie(s) ajout\u00E9e(s) \u00E0 ton compte."] }), _jsx("div", { className: "online-hint", children: "Les autres joueurs de la borne peuvent faire de m\u00EAme en se connectant \u00E0 leur compte." }), _jsx("button", { className: "btn-gold", onClick: onBack, children: "Termin\u00E9" })] })) : chosen ? (_jsxs(_Fragment, { children: [_jsxs("div", { className: "online-me", children: [_jsx(Avatar, { avatar: chosen.avatar, color: chosen.color, size: 64 }), _jsx("span", { className: "online-me-name", children: chosen.name })] }), _jsxs("div", { children: ["Les parties de ", _jsx("strong", { children: chosen.name }), " sur cette borne vont rejoindre ton compte. Un joueur de la borne ne peut \u00EAtre rattach\u00E9 qu\u2019\u00E0 un seul compte."] }), error && _jsx("div", { className: "online-error", children: error }), _jsxs("div", { className: "dialog-actions", children: [_jsx("button", { disabled: progress !== null, onClick: () => setChosen(null), children: "Retour" }), _jsx("button", { className: "btn-gold", disabled: progress !== null, onClick: () => run(chosen), children: progress ?? 'Ajouter à mon compte' })] })] })) : (_jsxs(_Fragment, { children: [_jsx("div", { className: "label", children: "Quel joueur de la borne es-tu ?" }), !data && _jsx("div", { className: "online-hint", children: "Lecture des stats de la borne\u2026" }), data && data.profiles.length === 0 && _jsx("div", { className: "online-hint", children: "Aucune stat sur cet appareil." }), _jsx("div", { className: "online-profiles", children: data?.profiles.map((p) => (_jsxs("button", { className: "online-profile", onClick: () => setChosen(p), children: [_jsx(Avatar, { avatar: p.avatar, color: p.color, size: 56 }), _jsx("span", { children: p.name })] }, p.id))) })] })) })] }));
}
