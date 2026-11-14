import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { DEFAULT_SETUP } from '../game-setup/setup';
import { normalizeCode } from '../online/protocol';
import { api, useAccount } from '../online/useAccount';
import { isInviteToken } from '../online/saloons';
import { useSaloons } from '../online/useSaloons';
import { createOnlineRoom, currentOnlineRoom, setCurrentOnlineRoom } from '../online/useOnlineRoom';
import { loadSettings, saveSettings } from '../settings/settings';
import { PasswordDialog } from './components/PasswordDialog';
import { ProfileEditor } from './components/ProfileEditor';
import { RecoveryCodeDialog, RenewRecoveryDialog } from './components/Recovery';
import { SaloonDialog, SaloonInfo } from './components/Saloons';
import { Admin } from './screens/Admin';
import { Community } from './screens/Community';
import { Home } from './screens/Home';
import { OtherGames } from './screens/OtherGames';
import { ImportLocal, localData } from './screens/ImportLocal';
import { RoomScreen } from './screens/Room';
import { WatchScreen } from './screens/Watch';
import { Welcome } from './screens/Welcome';
/** Code reçu par un lien de partage (?partie=ABC234, ou ?salon= pour les anciens liens), retiré de l'adresse une fois lu. */
function sharedCode() {
    const params = new URLSearchParams(location.search);
    const code = params.get('partie') ?? params.get('salon');
    if (code)
        history.replaceState(null, '', location.pathname);
    return code ? normalizeCode(code) : null;
}
const INVITE_KEY = 'trem-dragooon.invitation';
/**
 * Lien d'invitation dans un saloon (?invitation=…) : retiré de l'adresse et gardé de côté, pour entrer dans le saloon
 * dès que le joueur est connecté (il peut d'abord devoir créer son compte).
 */
function readInvite() {
    const invite = new URLSearchParams(location.search).get('invitation');
    if (!invite)
        return;
    history.replaceState(null, '', location.pathname);
    try {
        if (isInviteToken(invite))
            sessionStorage.setItem(INVITE_KEY, invite);
    }
    catch {
        // Sans stockage, le lien reste à rouvrir une fois connecté.
    }
}
function takeInvite() {
    try {
        const invite = sessionStorage.getItem(INVITE_KEY);
        sessionStorage.removeItem(INVITE_KEY);
        return invite;
    }
    catch {
        return null;
    }
}
/** L'interface prend la couleur du saloon ouvert ; le saloon public garde le vert d'origine. */
function useSaloonTheme(color) {
    useEffect(() => {
        const root = document.documentElement.style;
        if (color) {
            root.setProperty('--green', `color-mix(in srgb, ${color} 62%, #101713)`);
            root.setProperty('--green-bright', color);
            root.setProperty('--glow-green', `0 0 18px color-mix(in srgb, ${color} 45%, transparent)`);
        }
        else {
            for (const v of ['--green', '--green-bright', '--glow-green'])
                root.removeProperty(v);
        }
    }, [color]);
}
export function App() {
    useState(readInvite);
    const accountState = useAccount();
    const account = accountState.account;
    const saloons = useSaloons(account?.id ?? '');
    const [watching, setWatching] = useState(null);
    const [saloonDialog, setSaloonDialog] = useState(null);
    const [saloonMessage, setSaloonMessage] = useState(null);
    useSaloonTheme(account ? saloons.current.color : '');
    useEffect(() => {
        if (!saloonMessage)
            return;
        const timer = setTimeout(() => setSaloonMessage(null), 5000);
        return () => clearTimeout(timer);
    }, [saloonMessage]);
    // Invitation en attente : on entre dans le saloon une fois connecté.
    useEffect(() => {
        if (!account)
            return;
        const invite = takeInvite();
        if (!invite)
            return;
        saloons
            .joinByInvite(invite)
            .then((s) => setSaloonMessage({ text: `Bienvenue au saloon ${s.name} !` }))
            .catch((e) => setSaloonMessage({ text: e.message, error: true }));
    }, [account?.id]);
    const [room, setRoom] = useState(sharedCode);
    const [screen, setScreen] = useState(room ? 'room' : 'home');
    const [editing, setEditing] = useState(false);
    /** Change quand la partie à reprendre est oubliée (supprimée depuis la liste), pour redessiner l'accueil. */
    const [, setForgotten] = useState(0);
    const [editError, setEditError] = useState(null);
    const [changingPassword, setChangingPassword] = useState(false);
    const [renewingRecovery, setRenewingRecovery] = useState(false);
    const [hasLocalStats, setHasLocalStats] = useState(false);
    const [settings, setSettings] = useState(loadSettings);
    const updateSettings = (patch) => setSettings((s) => {
        const next = { ...s, ...patch };
        saveSettings(next);
        return next;
    });
    // Stats enregistrées sur cet appareil avant le passage en ligne (la borne) : on propose de les reprendre.
    useEffect(() => {
        void localData().then((d) => setHasLocalStats(d.profiles.length > 0));
    }, []);
    if (!account)
        return _jsx(Welcome, { state: accountState, onCreated: () => setEditing(true) });
    // Code de secours tout juste créé (compte neuf, mot de passe retrouvé, nouveau code) : montré une seule fois.
    const recovery = accountState.recovery && _jsx(RecoveryCodeDialog, { code: accountState.recovery, onClose: accountState.clearRecovery });
    const enter = (code) => {
        setCurrentOnlineRoom(code);
        setRoom(code);
        setScreen('room');
    };
    const home = () => setScreen('home');
    const editor = editing && (_jsx(ProfileEditor, { title: "Mon joueur", initial: { ...account }, takenNames: [], onCancel: () => setEditing(false), onSave: (p) => {
            setEditing(false);
            accountState.update({ name: p.name, color: p.color, avatar: p.avatar }).catch((e) => setEditError(e.message));
        } }));
    if (screen === 'room' && room) {
        return (_jsx(RoomScreen, { code: room, canSetDefaults: (id) => (saloons.saloons.find((s) => s.id === id)?.role ?? 'member') !== 'member', onSaveDefaults: (id, setup) => api(`/api/saloons/${encodeURIComponent(id)}/defaults`, { method: 'PUT', body: JSON.stringify({ setup }) }).then(() => undefined), identity: { name: account.name, color: account.color, avatar: account.avatar }, settings: settings, onLeave: () => {
                setCurrentOnlineRoom(null);
                setRoom(null);
                home();
            }, onHome: home }, room));
    }
    if (screen === 'watch' && watching) {
        return _jsx(WatchScreen, { ...watching, settings: settings, onBack: home }, watching.watchKey);
    }
    if (screen === 'players' || screen === 'mystats') {
        return (_jsx(Community, { saloon: saloons.current, myId: account.id, mine: screen === 'mystats', settings: settings, onSettings: updateSettings, onBack: home }, screen));
    }
    if (screen === 'games') {
        return (_jsx(OtherGames, { onBack: home, onPlay: async (mode) => enter(await createOnlineRoom('same', { ...DEFAULT_SETUP, mode }, saloons.current.id)) }));
    }
    if (screen === 'import')
        return _jsx(ImportLocal, { onBack: home });
    if (screen === 'admin' && accountState.admin)
        return _jsx(Admin, { myId: account.id, onBack: home });
    const current = currentOnlineRoom();
    return (_jsxs(_Fragment, { children: [_jsx(Home, { account: account, currentRoom: current, onResume: () => current && enter(current), saloons: saloons, onAddSaloon: () => setSaloonDialog('add'), onSaloonInfo: () => setSaloonDialog('info'), onWatch: (watchKey) => {
                    setWatching({ saloonId: saloons.current.id, watchKey });
                    setScreen('watch');
                }, onNewGame: async (mode, place) => enter(await createOnlineRoom(place, { ...DEFAULT_SETUP, mode }, saloons.current.id)), onJoin: enter, onGameDeleted: (code) => {
                    if (code && code === currentOnlineRoom()) {
                        setCurrentOnlineRoom(null);
                        setForgotten((n) => n + 1);
                    }
                }, onOtherGames: () => setScreen('games'), onPlayers: () => setScreen('players'), onMyStats: () => setScreen('mystats'), onRecovery: () => setRenewingRecovery(true), hasRecovery: accountState.hasRecovery, onEditAccount: () => {
                    setEditError(null);
                    setEditing(true);
                }, onPassword: () => setChangingPassword(true), onLogout: accountState.logout, onAdmin: accountState.admin ? () => setScreen('admin') : undefined, onImport: hasLocalStats ? () => setScreen('import') : undefined }), editError && _jsx("div", { className: "online-banner online-banner-error", children: editError }), saloonMessage && (_jsx("div", { className: `online-banner${saloonMessage.error ? ' online-banner-error' : ''}`, onClick: () => setSaloonMessage(null), children: saloonMessage.text })), saloonDialog === 'add' && _jsx(SaloonDialog, { state: saloons, myId: account.id, onClose: () => setSaloonDialog(null) }), saloonDialog === 'info' && _jsx(SaloonInfo, { saloon: saloons.current, state: saloons, myId: account.id, onClose: () => setSaloonDialog(null) }), editor, changingPassword && _jsx(PasswordDialog, { onSave: accountState.changePassword, onClose: () => setChangingPassword(false) }), renewingRecovery && _jsx(RenewRecoveryDialog, { state: accountState, onClose: () => setRenewingRecovery(false) }), recovery] }));
}
