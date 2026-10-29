import { useMemo, useState } from 'react';
import { sessionState } from '../../game-session/session';
import type { Profile } from '../../profiles/types';
import { passwordProblem, pseudoProblem, PSEUDO_MAX, type PublicAccount } from '../../online/accounts';
import { isValidCode, normalizeCode, CODE_LENGTH, type OnlineIdentity, type RoomView } from '../../online/protocol';
import { canUndo, MIN_ONLINE_PLAYERS } from '../../online/room';
import { useAccount, type AccountState } from '../../online/useAccount';
import { createOnlineRoom, setCurrentOnlineRoom, useOnlineRoom } from '../../online/useOnlineRoom';
import { loadSettings } from '../../settings/settings';
import { Avatar } from '../components/Avatar';
import { newProfile, ProfileEditor } from '../components/ProfileEditor';
import { Game } from './Game';
import { Choice } from './Setup';
import './Online.css';

interface Props {
  onHome: () => void;
  /** Classements et fiches des joueurs en ligne. */
  onCommunity: () => void;
  /** Code reçu par un lien partagé (?salon=…) ou salon à reprendre. */
  initialCode: string | null;
  /** true : reconnexion directe au salon (reprise après rechargement). */
  resume: boolean;
}

const identityOf = (a: PublicAccount): OnlineIdentity => ({ name: a.name, color: a.color, avatar: a.avatar });
const asProfile = (a: PublicAccount): Profile => ({ ...a });

/** Jouer en ligne : se connecter à son compte, puis créer un salon ou en rejoindre un avec son code. */
export function Online({ onHome, onCommunity, initialCode, resume }: Props) {
  const accountState = useAccount();
  const me = accountState.account;
  const [codeText, setCodeText] = useState(initialCode ?? '');
  const [room, setRoom] = useState<string | null>(resume ? initialCode : null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const enter = (code: string) => {
    setCurrentOnlineRoom(code);
    setRoom(code);
  };

  if (room && me) {
    return (
      <OnlineRoomScreen
        key={room}
        code={room}
        identity={identityOf(me)}
        onLeave={() => {
          setCurrentOnlineRoom(null);
          setRoom(null);
        }}
        onHome={onHome}
      />
    );
  }

  const code = normalizeCode(codeText);
  const create = async () => {
    setBusy(true);
    setError(null);
    try {
      enter(await createOnlineRoom());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Serveur en ligne injoignable.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="screen online">
      <header className="online-top">
        <h1>Jouer en ligne</h1>
        <button onClick={onHome}>Accueil</button>
      </header>

      <AccountPanel state={accountState} />

      <section className="online-block online-actions">
        <button className="btn-gold online-create" disabled={!me || busy} onClick={create}>
          Créer une partie
        </button>
        <div className="online-join">
          <input
            aria-label="Code de la partie"
            placeholder="CODE"
            value={codeText}
            maxLength={CODE_LENGTH + 2}
            autoCapitalize="characters"
            autoComplete="off"
            onChange={(e) => setCodeText(normalizeCode(e.target.value))}
          />
          <button className="btn-primary" disabled={!me || !isValidCode(code)} onClick={() => enter(code)}>
            Rejoindre
          </button>
        </div>
        {!me && <div className="online-hint">Connecte-toi d’abord à ton compte.</div>}
        {error && <div className="online-error">{error}</div>}
      </section>

      <button className="online-community" onClick={onCommunity}>
        Stats et classements des joueurs en ligne
      </button>
    </div>
  );
}

/** Connexion, création de compte, ou compte connecté avec son avatar. */
function AccountPanel({ state }: { state: AccountState }) {
  const [tab, setTab] = useState<'login' | 'signup'>('login');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const me = state.account;

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      setPassword('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action impossible.');
    } finally {
      setBusy(false);
    }
  };

  if (me) {
    return (
      <section className="online-block">
        <div className="label">Ton compte</div>
        <div className="online-me">
          <Avatar avatar={me.avatar} color={me.color} size={64} />
          <span className="online-me-name">{me.name}</span>
          <button onClick={() => setEditing(true)}>Modifier</button>
          <button onClick={state.logout}>Se déconnecter</button>
        </div>
        {error && <div className="online-error">{error}</div>}
        {editing && (
          <ProfileEditor
            title="Mon joueur en ligne"
            initial={asProfile(me)}
            takenNames={[]}
            onCancel={() => setEditing(false)}
            onSave={(p) => {
              setEditing(false);
              void run(() => state.update({ name: p.name, color: p.color, avatar: p.avatar }));
            }}
          />
        )}
      </section>
    );
  }

  const problem = tab === 'signup' ? (pseudoProblem(name) ?? passwordProblem(password)) : null;
  const submit = () =>
    run(() => {
      if (tab === 'login') return state.login(name, password);
      const look = newProfile(name);
      // Compte créé : on passe directement au choix de l'avatar.
      return state.signup(name.trim(), password, look.color, look.avatar).then(() => setEditing(true));
    });

  return (
    <section className="online-block">
      <div className="label">Ton compte</div>
      <Choice
        label=""
        value={tab}
        options={[
          { value: 'login' as const, label: 'Se connecter' },
          { value: 'signup' as const, label: 'Créer un compte' },
        ]}
        onChange={(t) => {
          setTab(t);
          setError(null);
        }}
      />
      <form
        className="online-login"
        onSubmit={(e) => {
          e.preventDefault();
          if (!busy && !problem) void submit();
        }}
      >
        <input
          aria-label="Pseudo"
          placeholder="Pseudo"
          value={name}
          maxLength={PSEUDO_MAX}
          autoComplete="username"
          autoCapitalize="none"
          onChange={(e) => setName(e.target.value)}
        />
        <input
          aria-label="Mot de passe"
          placeholder="Mot de passe"
          type="password"
          value={password}
          autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button type="submit" className="btn-primary" disabled={busy || !name.trim() || !password || problem !== null}>
          {tab === 'login' ? 'Se connecter' : 'Créer mon compte'}
        </button>
      </form>
      {tab === 'signup' && (
        <div className="online-hint">
          {problem && (name || password) ? problem : 'Un pseudo et un mot de passe suffisent. Tu choisiras ton avatar ensuite.'}
        </div>
      )}
      {error && <div className="online-error">{error}</div>}
    </section>
  );
}

function OnlineRoomScreen(props: { code: string; identity: OnlineIdentity; onLeave: () => void; onHome: () => void }) {
  const { connection, room, playerId, error, closedReason, send, leave } = useOnlineRoom(props.code, props.identity);
  const settings = useMemo(loadSettings, []);
  const state = useMemo(() => (room?.session ? sessionState(room.session) : null), [room?.session]);

  const banners = (
    <>
      {connection === 'reconnecting' && <div className="online-banner">Connexion perdue, reconnexion…</div>}
      {error && <div className="online-banner online-banner-error">{error}</div>}
    </>
  );

  if (connection === 'closed') {
    return (
      <div className="screen online online-center">
        <div className="online-error">{closedReason ?? 'Connexion fermée.'}</div>
        <button className="btn-primary" onClick={props.onLeave}>
          Retour
        </button>
      </div>
    );
  }

  if (!room || !playerId) {
    return (
      <div className="screen online online-center">
        <div className="label">Connexion au salon {props.code}…</div>
        <button onClick={props.onLeave}>Annuler</button>
        {banners}
      </div>
    );
  }

  const host = room.hostId === playerId;
  const quit = () => {
    leave();
    props.onLeave();
  };

  if (room.status === 'playing' && room.session && state) {
    const players = room.players.map((p) => ({ id: p.id, name: p.name }));
    const profiles: Profile[] = room.players.map((p) => ({ ...p, createdAt: '' }));
    const restart = () => {
      send({ type: 'backToLobby' });
      send({ type: 'start' });
    };
    return (
      <>
        <Game
          session={room.session}
          state={state}
          players={players}
          profiles={profiles}
          settings={settings}
          myId={playerId}
          canUndo={canUndo(room, playerId)}
          onDart={(dart) => send({ type: 'dart', dart })}
          onEndTurn={() => send({ type: 'endTurn' })}
          onUndo={() => send({ type: 'undo' })}
          quitMessage={`Quitter la partie ? Tu pourras revenir avec le code ${room.code} tant qu’elle dure.`}
          onQuit={props.onHome}
          onHome={quit}
          onRematch={host ? restart : undefined}
          onEditPlayers={host ? () => send({ type: 'backToLobby' }) : undefined}
          editPlayersLabel="Salle d’attente"
          endNote={host ? undefined : 'L’hôte peut relancer une partie.'}
        />
        {banners}
      </>
    );
  }

  return (
    <div className="screen online">
      <header className="online-top">
        <h1>Salon en ligne</h1>
        <button onClick={quit}>Quitter le salon</button>
      </header>
      <Lobby room={room} playerId={playerId} send={send} />
      {banners}
    </div>
  );
}

function Lobby({ room, playerId, send }: { room: RoomView; playerId: string; send: ReturnType<typeof useOnlineRoom>['send'] }) {
  const host = room.hostId === playerId;
  const present = room.players.filter((p) => p.connected).length;
  const [copied, setCopied] = useState(false);
  const link = `${location.origin}${location.pathname}?salon=${room.code}`;
  const share = async () => {
    try {
      if (navigator.share) await navigator.share({ title: 'TREM-DRAGOOON', text: `Rejoins ma partie de fléchettes : code ${room.code}`, url: link });
      else {
        await navigator.clipboard.writeText(link);
        setCopied(true);
      }
    } catch {
      // Partage annulé : le code reste affiché.
    }
  };
  const o = room.options;
  const setOptions = (patch: Partial<typeof o>) => send({ type: 'options', options: { ...o, ...patch } });

  return (
    <div className="online-lobby">
      <section className="online-block online-code-block">
        <div className="label">Code de la partie</div>
        <div className="online-code">{room.code}</div>
        <button onClick={share}>{copied ? 'Lien copié' : 'Partager le lien'}</button>
      </section>

      <section className="online-block">
        <div className="label">
          Joueurs ({room.players.length})
        </div>
        <ul className="online-players">
          {room.players.map((p) => (
            <li key={p.id} className={p.connected ? '' : 'offline'}>
              <Avatar avatar={p.avatar} color={p.color} size={48} />
              <span className="online-player-name">
                {p.name}
                {p.id === playerId && ' (toi)'}
              </span>
              {p.id === room.hostId && <span className="online-tag">Hôte</span>}
              {!p.connected && <span className="online-tag">Déconnecté</span>}
            </li>
          ))}
        </ul>
      </section>

      <section className="online-block">
        {host ? (
          <>
            <Choice
              label="Partie"
              value={o.startScore}
              options={[301, 501, 701].map((v) => ({ value: v as 301 | 501 | 701, label: v }))}
              onChange={(startScore) => setOptions({ startScore })}
            />
            <Choice
              label="Finir sur"
              value={o.out}
              options={[
                { value: 'straight' as const, label: 'N’importe quoi' },
                { value: 'double' as const, label: 'Un double' },
              ]}
              onChange={(out) => setOptions({ out })}
            />
            <button className="btn-gold online-start" disabled={present < MIN_ONLINE_PLAYERS} onClick={() => send({ type: 'start' })}>
              {present < MIN_ONLINE_PLAYERS ? 'En attente d’un autre joueur…' : 'Lancer la partie'}
            </button>
          </>
        ) : (
          <>
            <div className="online-rules">
              {o.startScore} · {o.out === 'double' ? 'finir sur un double' : 'finir sur n’importe quoi'}
            </div>
            <div className="online-hint">En attente du lancement par l’hôte…</div>
          </>
        )}
      </section>
    </div>
  );
}
