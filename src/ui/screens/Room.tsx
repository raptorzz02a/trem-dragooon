import { useEffect, useMemo, useState } from 'react';
import { MAX_PLAYERS } from '../../game-engine/engine';
import { sessionState } from '../../game-session/session';
import { setupProblem, type GameSetup } from '../../game-setup/setup';
import { passwordProblem, pseudoKey, pseudoProblem, PSEUDO_MAX, type PublicAccount } from '../../online/accounts';
import type { ClientMessage, OnlineIdentity, OnlinePlayer, RoomView } from '../../online/protocol';
import { canThrow, canUndo, startingPlayers } from '../../online/room';
import { loadCommunity } from '../../online/useAccount';
import { useOnlineRoom } from '../../online/useOnlineRoom';
import type { Profile } from '../../profiles/types';
import type { AppSettings } from '../../settings/settings';
import { TEAM_COLORS } from '../../teams/teams';
import { Avatar } from '../components/Avatar';
import { newProfile, ProfileEditor } from '../components/ProfileEditor';
import { Game } from './Game';
import { PLACE_NAMES, SetupPanel } from './Setup';
import './Online.css';

type Send = (message: ClientMessage) => void;

/** Un salon : la salle d'attente (réglages et joueurs), puis la partie. */
export function RoomScreen(props: {
  code: string;
  identity: OnlineIdentity;
  settings: AppSettings;
  /** Quitter le salon pour de bon. */
  onLeave: () => void;
  /** Revenir à l'accueil sans quitter : la partie reste accessible avec son code. */
  onHome: () => void;
}) {
  const { connection, room, playerId, error, closedReason, send, leave } = useOnlineRoom(props.code, props.identity);
  const state = useMemo(() => (room?.session && room.status === 'playing' ? sessionState(room.session) : null), [room?.session, room?.status]);

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
          Retour à l’accueil
        </button>
      </div>
    );
  }

  if (!room || !playerId) {
    return (
      <div className="screen online online-center">
        <div className="label">Connexion à la partie {props.code}…</div>
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
          settings={props.settings}
          myId={playerId}
          canPlay={canThrow(room, playerId)}
          canUndo={canUndo(room, playerId)}
          onDart={(dart) => send({ type: 'dart', dart })}
          onEndTurn={() => send({ type: 'endTurn' })}
          onUndo={() => send({ type: 'undo' })}
          quitMessage={
            host
              ? 'Arrêter la partie ? Elle sera enregistrée comme abandonnée, sans victoire ni défaite.'
              : `Revenir à l’accueil ? Tu pourras reprendre la partie avec le code ${room.code}.`
          }
          quitLabel={host ? 'Arrêter la partie' : 'Accueil'}
          onQuit={host ? () => send({ type: 'abandon' }) : props.onHome}
          onHome={quit}
          onRematch={host ? restart : undefined}
          onEditPlayers={host ? () => send({ type: 'backToLobby' }) : undefined}
          editPlayersLabel="Changer les réglages"
          endNote={host ? undefined : 'L’hôte peut relancer une partie.'}
        />
        {banners}
      </>
    );
  }

  return (
    <div className="screen online lobby">
      <header className="online-top">
        <button onClick={props.onHome}>← Accueil</button>
        <h1>Nouvelle partie · {PLACE_NAMES[room.place]}</h1>
        <button onClick={quit}>{host ? 'Fermer' : 'Quitter'}</button>
      </header>
      <Lobby room={room} playerId={playerId} send={send} error={error} />
      {banners}
    </div>
  );
}

function ShareCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const link = `${location.origin}${location.pathname}?salon=${code}`;
  const share = async () => {
    try {
      if (navigator.share) await navigator.share({ title: 'TREM-DRAGOOON', text: `Rejoins ma partie de fléchettes : code ${code}`, url: link });
      else {
        await navigator.clipboard.writeText(link);
        setCopied(true);
      }
    } catch {
      // Partage annulé : le code reste affiché.
    }
  };
  return (
    <div className="lobby-code">
      <span className="label">Code</span>
      <span className="lobby-code-value">{code}</span>
      <button onClick={share}>{copied ? 'Lien copié' : 'Partager'}</button>
    </div>
  );
}

function Lobby({ room, playerId, send, error }: { room: RoomView; playerId: string; send: Send; error: string | null }) {
  const host = room.hostId === playerId;
  const me = room.players.find((p) => p.id === playerId);
  const [adding, setAdding] = useState(false);
  const starting = startingPlayers(room);
  const problem = setupProblem(room.setup, starting);
  const setSetup = (patch: Partial<GameSetup>) => send({ type: 'setup', setup: { ...room.setup, ...patch } });
  const team = (p: OnlinePlayer) => TEAM_COLORS[room.setup.teamOf[p.id] ?? 0]!;
  const cycleTeam = (p: OnlinePlayer) =>
    setSetup({ teamOf: { ...room.setup.teamOf, [p.id]: ((room.setup.teamOf[p.id] ?? 0) + 1) % room.setup.teamCount } });

  return (
    <>
      <div className="lobby-body">
        <SetupPanel
          setup={room.setup}
          place={room.place}
          playerCount={starting.length}
          host={host}
          onSetup={setSetup}
          onPlace={(place) => send({ type: 'place', place })}
          onDrawTeams={() => send({ type: 'drawTeams' })}
        />

        <section className="lobby-players">
          <ShareCode code={room.code} />
          <div className="label">
            Joueurs ({starting.length}/{MAX_PLAYERS})
          </div>
          <ol className="setup-list">
            {room.players.map((p, i) => (
              <li key={p.id} className={`${p.spectator ? 'spectator' : ''} ${p.connected || p.local ? '' : 'offline'}`}>
                <Avatar avatar={p.avatar} color={p.color} size={44} />
                <span className="setup-name">
                  {p.name}
                  <span className="lobby-tags">
                    {p.id === room.hostId && <span className="online-tag">Hôte</span>}
                    {p.id === playerId && <span className="online-tag">Toi</span>}
                    {p.spectator && <span className="online-tag">Ne joue pas</span>}
                    {!p.connected && !p.local && <span className="online-tag">Absent</span>}
                  </span>
                </span>
                {room.setup.teamMode && !p.spectator && (
                  <button
                    className="setup-team"
                    disabled={!host}
                    style={{ borderColor: team(p).hex, color: team(p).hex }}
                    onClick={() => cycleTeam(p)}
                  >
                    {team(p).name}
                  </button>
                )}
                {host && (
                  <>
                    <button aria-label="Monter" disabled={i === 0} onClick={() => send({ type: 'movePlayer', playerId: p.id, delta: -1 })}>
                      ▲
                    </button>
                    <button
                      aria-label="Descendre"
                      disabled={i === room.players.length - 1}
                      onClick={() => send({ type: 'movePlayer', playerId: p.id, delta: 1 })}
                    >
                      ▼
                    </button>
                    {p.id === playerId ? (
                      <button className="lobby-playing" onClick={() => send({ type: 'setPlaying', playing: !!p.spectator })}>
                        {p.spectator ? 'Je joue' : 'Je ne joue pas'}
                      </button>
                    ) : (
                      <button aria-label="Retirer" className="btn-danger" onClick={() => send({ type: 'removePlayer', playerId: p.id })}>
                        ✕
                      </button>
                    )}
                  </>
                )}
              </li>
            ))}
          </ol>
          {host && (
            <button className="btn-primary" disabled={room.players.length >= MAX_PLAYERS} onClick={() => setAdding(true)}>
              ＋ Ajouter un joueur
            </button>
          )}
          <div className="online-hint">
            {room.place === 'same'
              ? 'Les joueurs tapent leur mot de passe sur cet appareil. Ils peuvent aussi rejoindre avec le code depuis leur téléphone.'
              : 'Les autres joueurs rejoignent avec le code depuis leur téléphone.'}
          </div>
        </section>
      </div>

      <footer className="setup-footer">
        <span className="setup-error">
          {problem ?? (starting.length === 1 ? 'Partie d’entraînement (1 joueur)' : `${starting.length} joueurs`)}
        </span>
        {host ? (
          <button className="btn-gold" disabled={problem !== null} onClick={() => send({ type: 'start' })}>
            Lancer la partie
          </button>
        ) : (
          <span className="online-hint">En attente du lancement par {room.players.find((p) => p.id === room.hostId)?.name ?? 'l’hôte'}…</span>
        )}
      </footer>

      {adding && me && <AddPlayer room={room} send={send} error={error} onClose={() => setAdding(false)} />}
    </>
  );
}

/**
 * Ajout d'un joueur sur l'appareil de l'hôte : on le choisit parmi les comptes et il tape son mot de passe,
 * ou on lui crée un compte sur place.
 */
function AddPlayer({ room, send, error, onClose }: { room: RoomView; send: Send; error: string | null; onClose: () => void }) {
  const [accounts, setAccounts] = useState<PublicAccount[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [chosen, setChosen] = useState<PublicAccount | null>(null);
  const [creating, setCreating] = useState<Profile | null>(null);
  const [newcomer, setNewcomer] = useState<Profile | null>(null);
  const [password, setPassword] = useState('');
  const [filter, setFilter] = useState('');
  /** Pseudo en cours d'ajout : la fenêtre se ferme quand il apparaît dans la partie. */
  const [pending, setPending] = useState<string | null>(null);

  useEffect(() => {
    loadCommunity()
      .then((c) => setAccounts(c.accounts))
      .catch((e: Error) => setLoadError(e.message));
  }, []);

  useEffect(() => {
    if (pending && room.players.some((p) => pseudoKey(p.name) === pseudoKey(pending))) onClose();
  }, [pending, room.players, onClose]);
  // Mot de passe refusé : on peut réessayer.
  useEffect(() => {
    if (error) setPending(null);
  }, [error]);

  const inRoom = new Set(room.players.map((p) => p.id));
  const list = (accounts ?? [])
    .filter((a) => !inRoom.has(a.id) && pseudoKey(a.name).includes(pseudoKey(filter)))
    .sort((a, b) => a.name.localeCompare(b.name, 'fr'));

  if (creating) {
    return (
      <ProfileEditor
        title="Nouveau joueur"
        initial={creating}
        takenNames={(accounts ?? []).map((a) => a.name)}
        onCancel={() => setCreating(null)}
        onSave={(p) => {
          setCreating(null);
          setNewcomer(p);
          setPassword('');
        }}
      />
    );
  }

  const who = chosen ?? newcomer;
  if (who) {
    const problem = newcomer ? (pseudoProblem(newcomer.name) ?? passwordProblem(password)) : password ? null : 'Tape ton mot de passe.';
    const submit = () => {
      if (problem || pending) return;
      setPending(who.name);
      if (newcomer) send({ type: 'createPlayer', name: newcomer.name, password, color: newcomer.color, avatar: newcomer.avatar });
      else send({ type: 'addPlayer', name: who.name, password });
    };
    return (
      <div className="overlay">
        <form
          className="dialog add-player"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <div className="add-player-who">
            <Avatar avatar={who.avatar} color={who.color} size={72} />
            <div>
              <div className="label">{newcomer ? 'Nouveau compte' : 'Joueur'}</div>
              <div className="add-player-name">{who.name}</div>
            </div>
          </div>
          <input
            className="text-input"
            type="password"
            autoFocus
            aria-label="Mot de passe"
            placeholder={newcomer ? 'Choisis un mot de passe' : 'Mot de passe'}
            autoComplete={newcomer ? 'new-password' : 'off'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {newcomer && <div className="online-hint">{password ? (problem ?? 'Retiens-le : il servira à chaque partie.') : 'Au moins 6 caractères.'}</div>}
          {error && <div className="online-error">{error}</div>}
          <div className="dialog-actions">
            <button
              type="button"
              onClick={() => {
                setChosen(null);
                setNewcomer(null);
                setPassword('');
                setPending(null);
              }}
            >
              Retour
            </button>
            <button type="submit" className="btn-gold" disabled={problem !== null || pending !== null}>
              {pending ? 'Vérification…' : 'Ajouter à la partie'}
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="overlay">
      <div className="dialog picker">
        <div className="picker-head">
          <h2>Ajouter un joueur</h2>
          <button onClick={onClose}>Fermer</button>
        </div>
        <input
          className="text-input"
          placeholder="Chercher un pseudo"
          aria-label="Chercher un pseudo"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        <div className="picker-grid">
          <button className="picker-tile picker-new btn-primary" onClick={() => setCreating(newProfile(filter.trim()))}>
            <span className="picker-plus">＋</span>
            <span>Nouveau joueur</span>
          </button>
          {list.map((a) => (
            <button key={a.id} className="picker-tile" onClick={() => setChosen(a)}>
              <Avatar avatar={a.avatar} color={a.color} size={72} />
              <span className="picker-name">{a.name}</span>
            </button>
          ))}
        </div>
        {!accounts && <div className={loadError ? 'online-error' : 'online-hint'}>{loadError ?? 'Chargement des joueurs…'}</div>}
      </div>
    </div>
  );
}
