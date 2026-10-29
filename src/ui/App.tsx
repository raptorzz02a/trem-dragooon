import { useEffect, useState } from 'react';
import { DEFAULT_SETUP } from '../game-setup/setup';
import type { GameMode } from '../game-engine/types';
import { normalizeCode, type RoomPlace } from '../online/protocol';
import { useAccount } from '../online/useAccount';
import { isInviteToken } from '../online/saloons';
import { useSaloons } from '../online/useSaloons';
import { createOnlineRoom, currentOnlineRoom, setCurrentOnlineRoom } from '../online/useOnlineRoom';
import type { Profile } from '../profiles/types';
import { loadSettings, saveSettings, type AppSettings } from '../settings/settings';
import { PasswordDialog } from './components/PasswordDialog';
import { ProfileEditor } from './components/ProfileEditor';
import { SaloonDialog, SaloonInfo } from './components/Saloons';
import { Admin } from './screens/Admin';
import { Community } from './screens/Community';
import { Home } from './screens/Home';
import { ImportLocal, localData } from './screens/ImportLocal';
import { RoomScreen } from './screens/Room';
import { Welcome } from './screens/Welcome';

// Tout se joue avec des comptes en ligne : sur la même cible (un appareil saisit pour tous) ou à distance.

type Screen = 'home' | 'room' | 'players' | 'import' | 'admin';

/** Code reçu par un lien de partage (?salon=ABC234), retiré de l'adresse une fois lu. */
function sharedCode(): string | null {
  const code = new URLSearchParams(location.search).get('salon');
  if (code) history.replaceState(null, '', location.pathname);
  return code ? normalizeCode(code) : null;
}

const INVITE_KEY = 'trem-dragooon.invitation';

/**
 * Lien d'invitation dans un saloon (?invitation=…) : retiré de l'adresse et gardé de côté, pour entrer dans le saloon
 * dès que le joueur est connecté (il peut d'abord devoir créer son compte).
 */
function readInvite(): void {
  const invite = new URLSearchParams(location.search).get('invitation');
  if (!invite) return;
  history.replaceState(null, '', location.pathname);
  try {
    if (isInviteToken(invite)) sessionStorage.setItem(INVITE_KEY, invite);
  } catch {
    // Sans stockage, le lien reste à rouvrir une fois connecté.
  }
}

function takeInvite(): string | null {
  try {
    const invite = sessionStorage.getItem(INVITE_KEY);
    sessionStorage.removeItem(INVITE_KEY);
    return invite;
  } catch {
    return null;
  }
}

/** L'interface prend la couleur du saloon ouvert ; le saloon public garde le vert d'origine. */
function useSaloonTheme(color: string): void {
  useEffect(() => {
    const root = document.documentElement.style;
    if (color) {
      root.setProperty('--green', `color-mix(in srgb, ${color} 62%, #101713)`);
      root.setProperty('--green-bright', color);
      root.setProperty('--glow-green', `0 0 18px color-mix(in srgb, ${color} 45%, transparent)`);
    } else {
      for (const v of ['--green', '--green-bright', '--glow-green']) root.removeProperty(v);
    }
  }, [color]);
}

export function App() {
  useState(readInvite);
  const accountState = useAccount();
  const account = accountState.account;
  const saloons = useSaloons(account?.id ?? '');
  const [saloonDialog, setSaloonDialog] = useState<'add' | 'info' | null>(null);
  const [saloonMessage, setSaloonMessage] = useState<{ text: string; error?: boolean } | null>(null);
  useSaloonTheme(account ? saloons.current.color : '');

  useEffect(() => {
    if (!saloonMessage) return;
    const timer = setTimeout(() => setSaloonMessage(null), 5000);
    return () => clearTimeout(timer);
  }, [saloonMessage]);

  // Invitation en attente : on entre dans le saloon une fois connecté.
  useEffect(() => {
    if (!account) return;
    const invite = takeInvite();
    if (!invite) return;
    saloons
      .joinByInvite(invite)
      .then((s) => setSaloonMessage({ text: `Bienvenue au saloon ${s.name} !` }))
      .catch((e: Error) => setSaloonMessage({ text: e.message, error: true }));
  }, [account?.id]);
  const [room, setRoom] = useState<string | null>(sharedCode);
  const [screen, setScreen] = useState<Screen>(room ? 'room' : 'home');
  const [editing, setEditing] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [changingPassword, setChangingPassword] = useState(false);
  const [hasLocalStats, setHasLocalStats] = useState(false);
  const [settings, setSettings] = useState<AppSettings>(loadSettings);
  const updateSettings = (patch: Partial<AppSettings>) =>
    setSettings((s) => {
      const next = { ...s, ...patch };
      saveSettings(next);
      return next;
    });

  // Stats enregistrées sur cet appareil avant le passage en ligne (la borne) : on propose de les reprendre.
  useEffect(() => {
    void localData().then((d) => setHasLocalStats(d.profiles.length > 0));
  }, []);

  if (!account) return <Welcome state={accountState} onCreated={() => setEditing(true)} />;

  const enter = (code: string) => {
    setCurrentOnlineRoom(code);
    setRoom(code);
    setScreen('room');
  };
  const home = () => setScreen('home');

  const editor = editing && (
    <ProfileEditor
      title="Mon joueur"
      initial={{ ...account } as Profile}
      takenNames={[]}
      onCancel={() => setEditing(false)}
      onSave={(p) => {
        setEditing(false);
        accountState.update({ name: p.name, color: p.color, avatar: p.avatar }).catch((e: Error) => setEditError(e.message));
      }}
    />
  );

  if (screen === 'room' && room) {
    return (
      <RoomScreen
        key={room}
        code={room}
        identity={{ name: account.name, color: account.color, avatar: account.avatar }}
        settings={settings}
        onLeave={() => {
          setCurrentOnlineRoom(null);
          setRoom(null);
          home();
        }}
        onHome={home}
      />
    );
  }

  if (screen === 'players') return <Community settings={settings} onSettings={updateSettings} onBack={home} />;

  if (screen === 'import') return <ImportLocal onBack={home} />;

  if (screen === 'admin' && accountState.admin) return <Admin myId={account.id} onBack={home} />;

  const current = currentOnlineRoom();
  return (
    <>
      <Home
        account={account}
        currentRoom={current}
        onResume={() => current && enter(current)}
        saloons={saloons}
        onAddSaloon={() => setSaloonDialog('add')}
        onSaloonInfo={() => setSaloonDialog('info')}
        onNewGame={async (mode: GameMode, place: RoomPlace) => enter(await createOnlineRoom(place, { ...DEFAULT_SETUP, mode }, saloons.current.id))}
        onJoin={enter}
        onPlayers={() => setScreen('players')}
        onEditAccount={() => {
          setEditError(null);
          setEditing(true);
        }}
        onPassword={() => setChangingPassword(true)}
        onLogout={accountState.logout}
        onAdmin={accountState.admin ? () => setScreen('admin') : undefined}
        onImport={hasLocalStats ? () => setScreen('import') : undefined}
      />
      {editError && <div className="online-banner online-banner-error">{editError}</div>}
      {saloonMessage && (
        <div className={`online-banner${saloonMessage.error ? ' online-banner-error' : ''}`} onClick={() => setSaloonMessage(null)}>
          {saloonMessage.text}
        </div>
      )}
      {saloonDialog === 'add' && <SaloonDialog state={saloons} myId={account.id} onClose={() => setSaloonDialog(null)} />}
      {saloonDialog === 'info' && <SaloonInfo saloon={saloons.current} state={saloons} myId={account.id} onClose={() => setSaloonDialog(null)} />}
      {editor}
      {changingPassword && <PasswordDialog onSave={accountState.changePassword} onClose={() => setChangingPassword(false)} />}
    </>
  );
}
