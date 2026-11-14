import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { loadCommunity, loadPlayer } from '../../online/useAccount';
import { Profile } from './Profile';
import { Rankings } from './Rankings';
import './Online.css';
function Loading({ error, onBack }) {
    return (_jsxs("div", { className: "screen online online-center", children: [_jsx("div", { className: error ? 'online-error' : 'label', children: error ?? 'Chargement…' }), _jsx("button", { onClick: onBack, children: "Retour" })] }));
}
/**
 * Fiche d'un joueur en ligne. La sienne montre toutes ses parties, tous saloons confondus ; celle d'un autre
 * seulement ses parties dans les saloons partagés, en commençant par le saloon ouvert.
 */
function PlayerSheet({ id, saloon, settings, onSettings, onBack, backLabel }) {
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);
    useEffect(() => {
        loadPlayer(id)
            .then(setData)
            .catch((e) => setError(e.message));
    }, [id]);
    if (!data)
        return _jsx(Loading, { error: error, onBack: onBack });
    const profiles = data.accounts.some((a) => a.id === data.account.id) ? data.accounts : [...data.accounts, data.account];
    return (_jsx(Profile, { profile: data.account, profiles: profiles, games: data.games, settings: settings, onSettings: onSettings, onSave: () => undefined, onDelete: () => undefined, onBack: onBack, readOnly: true, backLabel: backLabel, saloons: data.saloons, initialSaloon: data.own ? 'all' : saloon.id, allSaloonsLabel: data.own ? 'Tous saloons' : 'Saloons en commun' }));
}
/** Classement du saloon ouvert (le saloon public : classement mondial) et fiches des joueurs. */
export function Community({ saloon, myId, mine = false, settings, onSettings, onBack }) {
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);
    const [openId, setOpenId] = useState(mine ? myId : null);
    useEffect(() => {
        if (mine)
            return;
        loadCommunity(saloon.id)
            .then(setData)
            .catch((e) => setError(e.message));
    }, [saloon.id, mine]);
    if (openId) {
        return (_jsx(PlayerSheet, { id: openId, saloon: saloon, settings: settings, onSettings: onSettings, onBack: mine ? onBack : () => setOpenId(null), backLabel: mine ? '← Accueil' : '← Classement' }, openId));
    }
    if (!data)
        return _jsx(Loading, { error: error, onBack: onBack });
    return (_jsx(Rankings, { profiles: data.accounts, games: data.games, onOpen: setOpenId, onBack: onBack, title: `Classement · ${saloon.name}`, backLabel: "\u2190 Retour", minGames: data.minGames, note: saloon.public
            ? 'Classement mondial : tous les joueurs, parties jouées dans le saloon public.'
            : `Membres du saloon, parties jouées dans le saloon. Classé à partir de ${data.minGames} partie${data.minGames > 1 ? 's' : ''}.` }));
}
