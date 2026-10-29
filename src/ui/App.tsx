import { useEffect, useState } from 'react';
import { DEFAULT_SETUP } from '../game-setup/setup';
import type { GameMode } from '../game-engine/types';
import { normalizeCode, type RoomPlace } from '../online/protocol';
import { useAccount } from '../online/useAccount';
import { createOnlineRoom, currentOnlineRoom, setCurrentOnlineRoom } from '../online/useOnlineRoom';
import type { Profile } from '../profiles/types';
import { loadSettings, saveSettings, type AppSettings } from '../settings/settings';
import { PasswordDialog } from './components/PasswordDialog';
import { ProfileEditor } from './components/ProfileEditor';
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

export function App() {
  const accountState = useAccount();
  const account = accountState.account;
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
        onNewGame={async (mode: GameMode, place: RoomPlace) => enter(await createOnlineRoom(place, { ...DEFAULT_SETUP, mode }))}
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
      {editor}
      {changingPassword && <PasswordDialog onSave={accountState.changePassword} onClose={() => setChangingPassword(false)} />}
    </>
  );
}
