import { jsxs as _jsxs, jsx as _jsx, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from 'react';
import { MAX_PLAYERS } from '../../game-engine/engine';
import { sessionState } from '../../game-session/session';
import { setupProblem } from '../../game-setup/setup';
import { passwordProblem, pseudoKey, pseudoProblem } from '../../online/accounts';
import { PUBLIC_SALOON_ID } from '../../online/saloons';
import { canFinish, canThrow, canUndo, startingPlayers } from '../../online/room';
import { loadCommunity } from '../../online/useAccount';
import { useOnlineRoom } from '../../online/useOnlineRoom';
import { TEAM_COLORS } from '../../teams/teams';
import { Avatar } from '../components/Avatar';
import { newProfile, ProfileEditor } from '../components/ProfileEditor';
import { Game } from './Game';
import { PLACE_NAMES, SetupPanel } from './Setup';
import './Online.css';
/** Un salon : la salle d'attente (réglages et joueurs), puis la partie. */
export function RoomScreen(props) {
    const { connection, room, playerId, error, closedReason, send, leave } = useOnlineRoom(props.code, props.identity);
    const state = useMemo(() => (room?.session && room.status === 'playing' ? sessionState(room.session) : null), [room?.session, room?.status]);
    const banners = (_jsxs(_Fragment, { children: [!!room?.watchers && _jsxs("div", { className: "watch-badge", children: ["\uD83D\uDC41 ", room.watchers, " spectateur", room.watchers > 1 ? 's' : ''] }), connection === 'reconnecting' && _jsx("div", { className: "online-banner", children: "Connexion perdue, reconnexion\u2026" }), error && _jsx("div", { className: "online-banner online-banner-error", children: error })] }));
    if (connection === 'closed') {
        return (_jsxs("div", { className: "screen online online-center", children: [_jsx("div", { className: "online-error", children: closedReason ?? 'Connexion fermée.' }), _jsx("button", { className: "btn-primary", onClick: props.onLeave, children: "Retour \u00E0 l\u2019accueil" })] }));
    }
    if (!room || !playerId) {
        return (_jsxs("div", { className: "screen online online-center", children: [_jsxs("div", { className: "label", children: ["Connexion \u00E0 la partie ", props.code, "\u2026"] }), _jsx("button", { onClick: props.onLeave, children: "Annuler" }), banners] }));
    }
    const host = room.hostId === playerId;
    const quit = () => {
        leave();
        props.onLeave();
    };
    if (room.status === 'playing' && room.session && state) {
        const players = room.players.map((p) => ({ id: p.id, name: p.name }));
        const profiles = room.players.map((p) => ({ ...p, createdAt: '' }));
        const restart = () => {
            send({ type: 'backToLobby' });
            send({ type: 'start' });
        };
        return (_jsxs(_Fragment, { children: [_jsx(Game, { session: room.session, state: state, players: players, profiles: profiles, settings: props.settings, myId: playerId, canPlay: canThrow(room, playerId), canUndo: canUndo(room, playerId), onDart: (dart) => send({ type: 'dart', dart }), onEndTurn: () => send({ type: 'endTurn' }), onUndo: () => send({ type: 'undo' }), onFinish: canFinish(room, playerId) ? () => send({ type: 'finish' }) : undefined, quitMessage: host
                        ? 'Arrêter la partie ? Elle sera supprimée pour tout le monde et ne comptera pas dans les stats.'
                        : `Revenir à l’accueil ? Tu pourras reprendre la partie avec le code ${room.code}.`, quitLabel: host ? 'Arrêter la partie' : 'Accueil', onQuit: host ? quit : props.onHome, onHome: quit, onRematch: host ? restart : undefined, onEditPlayers: host ? () => send({ type: 'backToLobby' }) : undefined, editPlayersLabel: "Changer les r\u00E9glages", endNote: host ? undefined : 'L’hôte peut relancer une partie.' }), banners] }));
    }
    return (_jsxs("div", { className: "screen online lobby", children: [_jsxs("header", { className: "online-top", children: [_jsx("button", { onClick: props.onHome, children: "\u2190 Accueil" }), _jsxs("h1", { children: ["Nouvelle partie \u00B7 ", PLACE_NAMES[room.place]] }), _jsx("button", { onClick: quit, children: host ? 'Fermer' : 'Quitter' })] }), _jsx(Lobby, { room: room, playerId: playerId, send: send, error: error, onSaveDefaults: host && props.canSetDefaults(room.saloonId ?? PUBLIC_SALOON_ID) ? (setup) => props.onSaveDefaults(room.saloonId ?? PUBLIC_SALOON_ID, setup) : undefined }), banners] }));
}
function ShareCode({ code }) {
    const [copied, setCopied] = useState(false);
    const link = `${location.origin}${location.pathname}?partie=${code}`;
    const share = async () => {
        try {
            if (navigator.share)
                await navigator.share({ title: 'TREM-DRAGOOON', text: `Rejoins ma partie de fléchettes : code ${code}`, url: link });
            else {
                await navigator.clipboard.writeText(link);
                setCopied(true);
            }
        }
        catch {
            // Partage annulé : le code reste affiché.
        }
    };
    return (_jsxs("div", { className: "lobby-code", children: [_jsx("span", { className: "label", children: "Code" }), _jsx("span", { className: "lobby-code-value", children: code }), _jsx("button", { onClick: share, children: copied ? 'Lien copié' : 'Partager' })] }));
}
function Lobby({ room, playerId, send, error, onSaveDefaults, }) {
    const [saved, setSaved] = useState(null);
    const host = room.hostId === playerId;
    const me = room.players.find((p) => p.id === playerId);
    const [adding, setAdding] = useState(false);
    const starting = startingPlayers(room);
    const problem = setupProblem(room.setup, starting);
    const setSetup = (patch) => send({ type: 'setup', setup: { ...room.setup, ...patch } });
    const team = (p) => TEAM_COLORS[room.setup.teamOf[p.id] ?? 0];
    const cycleTeam = (p) => setSetup({ teamOf: { ...room.setup.teamOf, [p.id]: ((room.setup.teamOf[p.id] ?? 0) + 1) % room.setup.teamCount } });
    return (_jsxs(_Fragment, { children: [_jsxs("div", { className: "lobby-body", children: [_jsxs("div", { className: "lobby-setup", children: [_jsx(SetupPanel, { setup: room.setup, place: room.place, playerCount: starting.length, host: host, onSetup: setSetup, onPlace: (place) => send({ type: 'place', place }), onDrawTeams: () => send({ type: 'drawTeams' }) }), onSaveDefaults && (_jsx("button", { className: "lobby-defaults", onClick: () => onSaveDefaults(room.setup)
                                    .then(() => setSaved('Réglages enregistrés pour les prochaines parties du saloon.'))
                                    .catch((e) => setSaved(e.message)), children: saved ?? 'Garder ces réglages par défaut pour le saloon' }))] }), _jsxs("section", { className: "lobby-players", children: [_jsx(ShareCode, { code: room.code }), _jsxs("div", { className: "label", children: ["Joueurs (", starting.length, "/", MAX_PLAYERS, ")"] }), _jsx("ol", { className: "setup-list", children: room.players.map((p, i) => (_jsxs("li", { className: `${p.spectator ? 'spectator' : ''} ${p.connected || p.local ? '' : 'offline'}`, children: [_jsx(Avatar, { avatar: p.avatar, color: p.color, size: 44 }), _jsxs("span", { className: "setup-name", children: [p.name, _jsxs("span", { className: "lobby-tags", children: [p.id === room.hostId && _jsx("span", { className: "online-tag", children: "H\u00F4te" }), p.id === playerId && _jsx("span", { className: "online-tag", children: "Toi" }), p.spectator && _jsx("span", { className: "online-tag", children: "Ne joue pas" }), !p.connected && !p.local && _jsx("span", { className: "online-tag", children: "Absent" })] })] }), room.setup.teamMode && !p.spectator && (_jsx("button", { className: "setup-team", disabled: !host, style: { borderColor: team(p).hex, color: team(p).hex }, onClick: () => cycleTeam(p), children: team(p).name })), host && (_jsxs(_Fragment, { children: [_jsx("button", { "aria-label": "Monter", disabled: i === 0, onClick: () => send({ type: 'movePlayer', playerId: p.id, delta: -1 }), children: "\u25B2" }), _jsx("button", { "aria-label": "Descendre", disabled: i === room.players.length - 1, onClick: () => send({ type: 'movePlayer', playerId: p.id, delta: 1 }), children: "\u25BC" }), p.id === playerId ? (_jsx("button", { className: "lobby-playing", onClick: () => send({ type: 'setPlaying', playing: !!p.spectator }), children: p.spectator ? 'Je joue' : 'Je ne joue pas' })) : (_jsx("button", { "aria-label": "Retirer", className: "btn-danger", onClick: () => send({ type: 'removePlayer', playerId: p.id }), children: "\u2715" }))] }))] }, p.id))) }), host && (_jsx("button", { className: "btn-primary", disabled: room.players.length >= MAX_PLAYERS, onClick: () => setAdding(true), children: "\uFF0B Ajouter un joueur" })), _jsx("div", { className: "online-hint", children: room.place === 'same'
                                    ? 'Les joueurs tapent leur mot de passe sur cet appareil. Ils peuvent aussi rejoindre avec le code depuis leur téléphone.'
                                    : 'Les autres joueurs rejoignent avec le code depuis leur téléphone.' })] })] }), _jsxs("footer", { className: "setup-footer", children: [_jsx("span", { className: "setup-error", children: problem ?? (starting.length === 1 ? 'Partie d’entraînement (1 joueur)' : `${starting.length} joueurs`) }), host ? (_jsx("button", { className: "btn-gold", disabled: problem !== null, onClick: () => send({ type: 'start' }), children: "Lancer la partie" })) : (_jsxs("span", { className: "online-hint", children: ["En attente du lancement par ", room.players.find((p) => p.id === room.hostId)?.name ?? 'l’hôte', "\u2026"] }))] }), adding && me && _jsx(AddPlayer, { room: room, send: send, error: error, onClose: () => setAdding(false) })] }));
}
/**
 * Ajout d'un joueur sur l'appareil de l'hôte : on le choisit parmi les comptes et il tape son mot de passe,
 * ou on lui crée un compte sur place.
 */
function AddPlayer({ room, send, error, onClose }) {
    const [accounts, setAccounts] = useState(null);
    const [loadError, setLoadError] = useState(null);
    const [chosen, setChosen] = useState(null);
    const [creating, setCreating] = useState(null);
    const [newcomer, setNewcomer] = useState(null);
    const [password, setPassword] = useState('');
    const [filter, setFilter] = useState('');
    /** Pseudo en cours d'ajout : la fenêtre se ferme quand il apparaît dans la partie. */
    const [pending, setPending] = useState(null);
    useEffect(() => {
        // Seuls les membres du saloon de la partie peuvent y jouer.
        loadCommunity(room.saloonId ?? PUBLIC_SALOON_ID)
            .then((c) => setAccounts(c.accounts))
            .catch((e) => setLoadError(e.message));
    }, [room.saloonId]);
    useEffect(() => {
        if (pending && room.players.some((p) => pseudoKey(p.name) === pseudoKey(pending)))
            onClose();
    }, [pending, room.players, onClose]);
    // Mot de passe refusé : on peut réessayer.
    useEffect(() => {
        if (error)
            setPending(null);
    }, [error]);
    const inRoom = new Set(room.players.map((p) => p.id));
    const list = (accounts ?? [])
        .filter((a) => !inRoom.has(a.id) && pseudoKey(a.name).includes(pseudoKey(filter)))
        .sort((a, b) => a.name.localeCompare(b.name, 'fr'));
    if (creating) {
        return (_jsx(ProfileEditor, { title: "Nouveau joueur", initial: creating, takenNames: (accounts ?? []).map((a) => a.name), onCancel: () => setCreating(null), onSave: (p) => {
                setCreating(null);
                setNewcomer(p);
                setPassword('');
            } }));
    }
    const who = chosen ?? newcomer;
    if (who) {
        const problem = newcomer ? (pseudoProblem(newcomer.name) ?? passwordProblem(password)) : password ? null : 'Tape ton mot de passe.';
        const submit = () => {
            if (problem || pending)
                return;
            setPending(who.name);
            if (newcomer)
                send({ type: 'createPlayer', name: newcomer.name, password, color: newcomer.color, avatar: newcomer.avatar });
            else
                send({ type: 'addPlayer', name: who.name, password });
        };
        return (_jsx("div", { className: "overlay", children: _jsxs("form", { className: "dialog add-player", onSubmit: (e) => {
                    e.preventDefault();
                    submit();
                }, children: [_jsxs("div", { className: "add-player-who", children: [_jsx(Avatar, { avatar: who.avatar, color: who.color, size: 72 }), _jsxs("div", { children: [_jsx("div", { className: "label", children: newcomer ? 'Nouveau compte' : 'Joueur' }), _jsx("div", { className: "add-player-name", children: who.name })] })] }), _jsx("input", { className: "text-input", type: "password", autoFocus: true, "aria-label": "Mot de passe", placeholder: newcomer ? 'Choisis un mot de passe' : 'Mot de passe', autoComplete: newcomer ? 'new-password' : 'off', value: password, onChange: (e) => setPassword(e.target.value) }), newcomer && _jsx("div", { className: "online-hint", children: password ? (problem ?? 'Retiens-le : il servira à chaque partie.') : 'Au moins 6 caractères.' }), error && _jsx("div", { className: "online-error", children: error }), _jsxs("div", { className: "dialog-actions", children: [_jsx("button", { type: "button", onClick: () => {
                                    setChosen(null);
                                    setNewcomer(null);
                                    setPassword('');
                                    setPending(null);
                                }, children: "Retour" }), _jsx("button", { type: "submit", className: "btn-gold", disabled: problem !== null || pending !== null, children: pending ? 'Vérification…' : 'Ajouter à la partie' })] })] }) }));
    }
    return (_jsx("div", { className: "overlay", children: _jsxs("div", { className: "dialog picker", children: [_jsxs("div", { className: "picker-head", children: [_jsx("h2", { children: "Ajouter un joueur" }), _jsx("button", { onClick: onClose, children: "Fermer" })] }), _jsx("input", { className: "text-input", placeholder: "Chercher un pseudo", "aria-label": "Chercher un pseudo", value: filter, onChange: (e) => setFilter(e.target.value) }), _jsxs("div", { className: "picker-grid", children: [_jsxs("button", { className: "picker-tile picker-new btn-primary", onClick: () => setCreating(newProfile(filter.trim())), children: [_jsx("span", { className: "picker-plus", children: "\uFF0B" }), _jsx("span", { children: "Nouveau joueur" })] }), list.map((a) => (_jsxs("button", { className: "picker-tile", onClick: () => setChosen(a), children: [_jsx(Avatar, { avatar: a.avatar, color: a.color, size: 72 }), _jsx("span", { className: "picker-name", children: a.name })] }, a.id)))] }), !accounts && _jsx("div", { className: loadError ? 'online-error' : 'online-hint', children: loadError ?? 'Chargement des joueurs…' })] }) }));
}
