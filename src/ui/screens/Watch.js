import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useMemo } from 'react';
import { sessionState } from '../../game-session/session';
import { useWatch } from '../../online/useLiveGames';
import { Avatar } from '../components/Avatar';
import { Game } from './Game';
import { PLACE_NAMES } from './Setup';
import './Online.css';
const noop = () => undefined;
/** Regarder une partie du saloon en spectateur : on voit tout, on ne saisit rien. */
export function WatchScreen({ saloonId, watchKey, settings, onBack }) {
    const { room, closed } = useWatch(saloonId, watchKey);
    const state = useMemo(() => (room?.session && room.status === 'playing' ? sessionState(room.session) : null), [room?.session, room?.status]);
    if (closed || !room) {
        return (_jsxs("div", { className: "screen online online-center", children: [_jsx("div", { className: closed ? 'online-error' : 'label', children: closed ? 'Cette partie n’est plus en cours.' : 'Connexion à la partie…' }), _jsx("button", { className: "btn-primary", onClick: onBack, children: "Retour \u00E0 l\u2019accueil" })] }));
    }
    const eye = _jsxs("div", { className: "watch-badge", children: ["\uD83D\uDC41 ", room.watchers, " \u00B7 Tu regardes"] });
    if (room.status === 'playing' && room.session && state) {
        const players = room.players.map((p) => ({ id: p.id, name: p.name }));
        const profiles = room.players.map((p) => ({ ...p, createdAt: '' }));
        return (_jsxs(_Fragment, { children: [_jsx(Game, { session: room.session, state: state, players: players, profiles: profiles, settings: settings, myId: "spectateur", canPlay: false, canUndo: false, onDart: noop, onEndTurn: noop, onUndo: noop, quitMessage: "Arr\u00EAter de regarder et revenir \u00E0 l\u2019accueil ?", quitLabel: "Accueil", onQuit: onBack, onHome: onBack, endNote: "Partie termin\u00E9e." }), eye] }));
    }
    return (_jsxs("div", { className: "screen online online-center", children: [_jsxs("h1", { children: ["Salle d\u2019attente \u00B7 ", PLACE_NAMES[room.place]] }), _jsx("div", { className: "label", children: "La partie n\u2019a pas encore commenc\u00E9." }), _jsx("ol", { className: "setup-list", children: room.players
                    .filter((p) => !p.spectator)
                    .map((p) => (_jsxs("li", { children: [_jsx(Avatar, { avatar: p.avatar, color: p.color, size: 44 }), _jsx("span", { className: "setup-name", children: p.name })] }, p.id))) }), _jsx("button", { className: "btn-primary", onClick: onBack, children: "Retour \u00E0 l\u2019accueil" }), eye] }));
}
