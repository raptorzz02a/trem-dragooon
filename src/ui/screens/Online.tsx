import { useMemo, useState } from 'react';
import { sessionState } from '../../game-session/session';
import type { Profile } from '../../profiles/types';
import { isValidCode, normalizeCode, CODE_LENGTH, type OnlineIdentity, type RoomView } from '../../online/protocol';
import { canUndo, MIN_ONLINE_PLAYERS } from '../../online/room';
import { createOnlineRoom, setCurrentOnlineRoom, useOnlineRoom } from '../../online/useOnlineRoom';
import { loadSettings } from '../../settings/settings';
import { Avatar } from '../components/Avatar';
import { newProfile, ProfileEditor } from '../components/ProfileEditor';
import { Game } from './Game';
import { Choice } from './Setup';
import './Online.css';

interface Props {
  profiles: Profile[];
  onSaveProfile: (profile: Profile) => void;
  onHome: () => void;
  /** Code reçu par un lien partagé (?salon=…) ou salon à reprendre. */
  initialCode: string | null;
  /** true : reconnexion directe au salon (reprise après rechargement). */
  resume: boolean;
}

const ME_KEY = 'trem-dragooon.online.me';

function rememberedProfile(profiles: Profile[]): Profile | null {
  try {
    const id = localStorage.getItem(ME_KEY);
    return profiles.find((p) => p.id === id && !p.deleted) ?? null;
  } catch {
    return null;
  }
}

function rememberProfile(id: string): void {
  try {
    localStorage.setItem(ME_KEY, id);
  } catch {
    // Il faudra simplement rechoisir son profil la prochaine fois.
  }
}

const identityOf = (p: Profile): OnlineIdentity => ({ name: p.name, color: p.color, avatar: p.avatar });

/** Jouer en ligne : choisir qui joue sur cet appareil, puis créer un salon ou en rejoindre un avec son code. */
export function Online({ profiles, onSaveProfile, onHome, initialCode, resume }: Props) {
  const active = profiles.filter((p) => !p.deleted);
  const [me, setMe] = useState<Profile | null>(() => rememberedProfile(profiles));
  const [creating, setCreating] = useState<Profile | null>(null);
  const [codeText, setCodeText] = useState(initialCode ?? '');
  const [room, setRoom] = useState<string | null>(resume ? initialCode : null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const enter = (code: string) => {
    setCurrentOnlineRoom(code);
    setRoom(code);
  };
  const choose = (p: Profile) => {
    rememberProfile(p.id);
    setMe(p);
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

      <section className="online-block">
        <div className="label">Qui joue sur cet appareil ?</div>
        <div className="online-profiles">
          {active.map((p) => (
            <button key={p.id} className={`online-profile ${me?.id === p.id ? 'selected' : ''}`} onClick={() => choose(p)}>
              <Avatar avatar={p.avatar} color={p.color} size={56} />
              <span>{p.name}</span>
            </button>
          ))}
          <button className="online-profile online-new" onClick={() => setCreating(newProfile())}>
            <span className="online-plus">+</span>
            <span>Nouveau joueur</span>
          </button>
        </div>
      </section>

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
        {!me && <div className="online-hint">Choisis d’abord ton joueur.</div>}
        {error && <div className="online-error">{error}</div>}
      </section>

      {creating && (
        <ProfileEditor
          title="Nouveau joueur"
          initial={creating}
          takenNames={active.map((p) => p.name)}
          onCancel={() => setCreating(null)}
          onSave={(profile) => {
            onSaveProfile(profile);
            choose(profile);
            setCreating(null);
          }}
        />
      )}
    </div>
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
