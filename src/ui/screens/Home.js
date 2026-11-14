import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import { CODE_LENGTH, isValidCode, normalizeCode } from '../../online/protocol';
import { useLiveGames } from '../../online/useLiveGames';
import { Avatar } from '../components/Avatar';
import { SaloonHeader, SaloonRail } from '../components/Saloons';
import { Logo } from '../components/Logo';
import { GameIcon } from '../components/GameIcon';
import { PLACE_NAMES } from './Setup';
import { MODE_NAMES } from '../../game-setup/setup';
import { lightEnabled, sendLight, setLightEnabled } from '../../light/light';
import { senseEnabled, senseState, setSenseEnabled } from '../../sense/sense';
import './Home.css';
/** Les modes principaux, présentés comme les cartes du catalogue « Autres jeux » (icône, nom, une ligne). */
const MODES = [
    { mode: 'x01', title: '301 · 501 · 701', sub: 'Décompte, busts et finitions', icon: 't501', tint: 'classic' },
    { mode: 'cricket', title: 'Cricket', sub: 'Fermer 15 à 20 et le Bull', icon: 'cricket', tint: 'precision' },
    { mode: 'clock', title: 'Horloge', sub: 'Du 1 au 20, dans l’ordre', icon: 'clock', tint: 'quick' },
    { mode: 'random', title: 'Chiffre aléatoire', sub: 'Un numéro tiré au sort par manche', icon: 'dice', tint: 'house' },
    { mode: 'training', title: 'Entraînement', sub: 'On part de 0 et on additionne, sans limite', icon: 'plus', tint: 'team' },
];
export function Home(props) {
    const { account } = props;
    // « Même cible » est toujours proposé d'abord : c'est le cas de la borne.
    const [place, setPlace] = useState('same');
    const [remoteAction, setRemoteAction] = useState('create');
    const [menuOpen, setMenuOpen] = useState(false);
    const [code, setCode] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState(null);
    const [light, setLight] = useState(lightEnabled);
    const [camera, setCamera] = useState(senseEnabled);
    const toggleLight = async () => {
        setLightEnabled(!light);
        setLight(!light);
        if (light)
            return;
        // Effet de test : confirme que le pont tourne sur cet appareil.
        const ok = await sendLight({ effect: 'victory', color: '#FFD24D' });
        if (!ok)
            setError('Pont de l’ampoule injoignable : il doit tourner sur ce PC (npm run pont).');
    };
    const toggleCamera = async () => {
        setSenseEnabled(!camera);
        setCamera(!camera);
        if (camera)
            return;
        if ((await senseState()).status === 'off')
            setError('Dart Sense injoignable : lance trem_sense.py sur ce PC (voir docs/dart-sense.md).');
    };
    const create = async (mode) => {
        setBusy(true);
        setError(null);
        try {
            await props.onNewGame(mode, place);
        }
        catch (e) {
            setError(e instanceof Error ? e.message : 'Serveur en ligne injoignable.');
            setBusy(false);
        }
    };
    const menuItem = (label, action, className) => (_jsx("button", { role: "menuitem", className: className, onClick: () => {
            setMenuOpen(false);
            action();
        }, children: label }));
    return (_jsxs("div", { className: `screen home${props.saloons.fixed ? '' : ' with-rail'}`, children: [!props.saloons.fixed && _jsx(SaloonRail, { state: props.saloons, onAdd: props.onAddSaloon }), _jsxs("header", { className: "home-top", children: [_jsx("div", { className: "home-logo", children: _jsx(Logo, { size: 56 }) }), _jsxs("div", { className: "home-account", children: [_jsxs("button", { className: "home-account-toggle", "aria-haspopup": "menu", "aria-expanded": menuOpen, onClick: () => setMenuOpen((o) => !o), children: [_jsx(Avatar, { avatar: account.avatar, color: account.color, size: 48 }), _jsx("span", { className: "home-account-name", children: account.name }), _jsx("span", { className: "home-account-caret", children: menuOpen ? '▴' : '▾' })] }), menuOpen && (_jsxs(_Fragment, { children: [_jsx("div", { className: "home-menu-backdrop", onClick: () => setMenuOpen(false) }), _jsxs("div", { className: "home-menu", role: "menu", children: [menuItem('Modifier', props.onEditAccount), menuItem('Mes stats', props.onMyStats), menuItem('Mot de passe', props.onPassword), menuItem(props.hasRecovery ? 'Code de secours' : 'Créer mon code de secours', props.onRecovery), props.onImport && menuItem('Récupérer les stats de la borne', props.onImport), menuItem(props.saloons.fixed ? 'Ne plus fixer le saloon sur cet appareil' : 'Fixer ce saloon sur cet appareil (borne)', () => props.saloons.setFixed(!props.saloons.fixed)), menuItem(light ? 'Couper l’ampoule de la borne' : 'Activer l’ampoule de la borne', () => void toggleLight()), menuItem(camera ? 'Couper la caméra Dart Sense' : 'Activer la caméra Dart Sense', () => void toggleCamera()), props.onAdmin && menuItem('Administration', props.onAdmin), menuItem('Déconnexion', props.onLogout, 'home-menu-logout')] })] }))] })] }), _jsx(SaloonHeader, { state: props.saloons, onAdd: props.onAddSaloon, onInfo: props.onSaloonInfo }), props.currentRoom && (_jsxs("button", { className: "btn-gold home-resume", onClick: props.onResume, children: ["Reprendre la partie ", props.currentRoom] })), _jsxs("section", { className: "home-new", children: [_jsxs("div", { className: "home-place", children: [_jsx("div", { className: "segmented", children: ['same', 'remote'].map((p) => (_jsx("button", { className: place === p ? 'selected' : '', onClick: () => setPlace(p), children: PLACE_NAMES[p] }, p))) }), place === 'remote' && (_jsx("div", { className: "home-remote", children: [
                                    ['create', 'Créer'],
                                    ['join', 'Rejoindre'],
                                ].map(([a, label]) => (_jsx("button", { className: remoteAction === a ? 'selected' : '', onClick: () => setRemoteAction(a), children: label }, a))) }))] }), place === 'remote' && remoteAction === 'join' ? (_jsxs("form", { className: "home-join", onSubmit: (e) => {
                            e.preventDefault();
                            if (isValidCode(code))
                                props.onJoin(code);
                        }, children: [_jsx("input", { "aria-label": "Code de la partie", placeholder: "CODE", value: code, maxLength: CODE_LENGTH + 2, autoCapitalize: "characters", autoComplete: "off", onChange: (e) => setCode(normalizeCode(e.target.value)) }), _jsx("button", { type: "submit", className: "btn-gold", disabled: !isValidCode(code), children: "Rejoindre" })] })) : (_jsxs("div", { className: "home-modes", children: [MODES.map((m) => (_jsxs("button", { className: "home-mode", disabled: busy, onClick: () => create(m.mode), children: [_jsx(GameIcon, { def: { icon: m.icon, categories: [m.tint] }, size: 64 }), _jsx("span", { className: "home-mode-title", children: m.title }), _jsx("span", { className: "home-mode-sub", children: m.sub })] }, m.mode))), place === 'same' && (_jsxs("button", { className: "home-mode home-mode-extra", disabled: busy, onClick: props.onOtherGames, children: [_jsx(GameIcon, { def: { icon: 'grid', categories: ['quick'] }, size: 56 }), _jsxs("span", { className: "home-mode-text", children: [_jsx("span", { className: "home-mode-title", children: "Autres jeux" }), _jsx("span", { className: "home-mode-sub", children: "21 jeux de bar : Killer, Golf, Baseball, La Bombe\u2026" })] })] }))] })), error && _jsx("div", { className: "home-warning", children: error })] }), _jsx(LiveGames, { saloonId: props.saloons.current.id, onWatch: props.onWatch, onJoin: props.onJoin, onDeleted: props.onGameDeleted }), _jsxs("div", { className: "home-links", children: [_jsx("button", { onClick: props.onMyStats, children: "Mes stats" }), _jsx("button", { onClick: props.onPlayers, children: "Classement du saloon" })] })] }));
}
const MODE_TITLES = { ...MODE_NAMES, x01: 'X01' };
/**
 * Parties en cours dans le saloon : on peut les regarder, ou reprendre celles où l'on joue ; pour en rejoindre une autre, il faut son code.
 * L'hôte d'une partie (et les administrateurs du saloon) peut la supprimer d'ici, après confirmation.
 */
function LiveGames({ saloonId, onWatch, onJoin, onDeleted, }) {
    const { games, remove } = useLiveGames(saloonId);
    const [confirming, setConfirming] = useState(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    if (games.length === 0)
        return null;
    const doRemove = async (g) => {
        setBusy(true);
        setError('');
        try {
            await remove(g.watchKey);
            setConfirming(null);
            onDeleted(g.code);
        }
        catch (e) {
            setError(e instanceof Error ? e.message : 'Suppression impossible.');
        }
        finally {
            setBusy(false);
        }
    };
    return (_jsxs("section", { className: "home-live", children: [_jsx("div", { className: "label", children: "Parties en cours" }), games.map((g) => (_jsxs("div", { className: `home-live-row${confirming === g.watchKey ? ' confirming' : ''}`, children: [_jsx("span", { className: `home-live-status${g.status === 'playing' ? ' playing' : ''}`, children: g.status === 'playing' ? 'En jeu' : 'Salle d’attente' }), _jsxs("span", { className: "home-live-mode", children: [MODE_TITLES[g.mode], " \u00B7 ", PLACE_NAMES[g.place]] }), _jsx("span", { className: "home-live-players", children: g.players.join(', ') }), g.watchers > 0 && _jsxs("span", { className: "home-live-watchers", children: ["\uD83D\uDC41 ", g.watchers] }), confirming === g.watchKey ? (_jsxs(_Fragment, { children: [_jsx("span", { className: "home-live-confirm", children: "Supprimer cette partie pour tout le monde ?" }), _jsx("button", { className: "home-live-yes", disabled: busy, onClick: () => void doRemove(g), children: "Supprimer" }), _jsx("button", { disabled: busy, onClick: () => setConfirming(null), children: "Annuler" })] })) : (_jsxs(_Fragment, { children: [g.code ? (_jsx("button", { className: "btn-gold", onClick: () => onJoin(g.code), children: "Reprendre" })) : (_jsx("button", { onClick: () => onWatch(g.watchKey), children: "Regarder" })), g.canDelete && (_jsx("button", { className: "home-live-delete", title: "Supprimer la partie", "aria-label": "Supprimer la partie", onClick: () => {
                                    setError('');
                                    setConfirming(g.watchKey);
                                }, children: "\uD83D\uDDD1" }))] }))] }, g.watchKey))), error && _jsx("div", { className: "home-live-error", children: error }), _jsx("div", { className: "home-live-hint", children: "Pour rejoindre une autre partie, demande son code \u00E0 l\u2019h\u00F4te." })] }));
}
