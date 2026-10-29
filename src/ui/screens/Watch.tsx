import { useMemo } from 'react';
import { sessionState } from '../../game-session/session';
import { useWatch } from '../../online/useLiveGames';
import type { Profile } from '../../profiles/types';
import type { AppSettings } from '../../settings/settings';
import { Avatar } from '../components/Avatar';
import { Game } from './Game';
import { PLACE_NAMES } from './Setup';
import './Online.css';

const noop = () => undefined;

/** Regarder une partie du saloon en spectateur : on voit tout, on ne saisit rien. */
export function WatchScreen({ saloonId, watchKey, settings, onBack }: { saloonId: string; watchKey: string; settings: AppSettings; onBack: () => void }) {
  const { room, closed } = useWatch(saloonId, watchKey);
  const state = useMemo(() => (room?.session && room.status === 'playing' ? sessionState(room.session) : null), [room?.session, room?.status]);

  if (closed || !room) {
    return (
      <div className="screen online online-center">
        <div className={closed ? 'online-error' : 'label'}>{closed ? 'Cette partie n’est plus en cours.' : 'Connexion à la partie…'}</div>
        <button className="btn-primary" onClick={onBack}>
          Retour à l’accueil
        </button>
      </div>
    );
  }

  const eye = <div className="watch-badge">👁 {room.watchers} · Tu regardes</div>;

  if (room.status === 'playing' && room.session && state) {
    const players = room.players.map((p) => ({ id: p.id, name: p.name }));
    const profiles: Profile[] = room.players.map((p) => ({ ...p, createdAt: '' }));
    return (
      <>
        <Game
          session={room.session}
          state={state}
          players={players}
          profiles={profiles}
          settings={settings}
          myId="spectateur"
          canPlay={false}
          canUndo={false}
          onDart={noop}
          onEndTurn={noop}
          onUndo={noop}
          quitMessage="Arrêter de regarder et revenir à l’accueil ?"
          quitLabel="Accueil"
          onQuit={onBack}
          onHome={onBack}
          endNote="Partie terminée."
        />
        {eye}
      </>
    );
  }

  return (
    <div className="screen online online-center">
      <h1>Salle d’attente · {PLACE_NAMES[room.place]}</h1>
      <div className="label">La partie n’a pas encore commencé.</div>
      <ol className="setup-list">
        {room.players
          .filter((p) => !p.spectator)
          .map((p) => (
            <li key={p.id}>
              <Avatar avatar={p.avatar} color={p.color} size={44} />
              <span className="setup-name">{p.name}</span>
            </li>
          ))}
      </ol>
      <button className="btn-primary" onClick={onBack}>
        Retour à l’accueil
      </button>
      {eye}
    </div>
  );
}
