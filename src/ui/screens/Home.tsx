import { useState } from 'react';
import type { GameMode } from '../../game-engine/types';
import type { PublicAccount } from '../../online/accounts';
import { CODE_LENGTH, isValidCode, normalizeCode, type RoomPlace } from '../../online/protocol';
import { Avatar } from '../components/Avatar';
import { Logo } from '../components/Logo';
import { PLACE_NAMES } from './Setup';
import './Home.css';

interface Props {
  account: PublicAccount;
  /** Partie en cours sur cet appareil (quittée sans la fermer, ou page rechargée). */
  currentRoom: string | null;
  onResume: () => void;
  onNewGame: (mode: GameMode, place: RoomPlace) => Promise<void>;
  onJoin: (code: string) => void;
  onPlayers: () => void;
  onEditAccount: () => void;
  onLogout: () => void;
  /** Présent si cet appareil a des stats d'avant le passage en ligne à reprendre. */
  onImport?: () => void;
}

const MODES: { mode: GameMode; title: string; sub: string }[] = [
  { mode: 'x01', title: '301 · 501 · 701', sub: 'Décompte, busts et finitions' },
  { mode: 'cricket', title: 'Cricket', sub: 'Fermer 15 à 20 et le Bull' },
  { mode: 'clock', title: 'Horloge', sub: 'Du 1 au 20, dans l’ordre' },
  { mode: 'shanghai', title: 'Shanghai', sub: 'Un numéro par manche' },
];

const PLACE_KEY = 'trem-dragooon.place';

function savedPlace(): RoomPlace {
  try {
    return localStorage.getItem(PLACE_KEY) === 'remote' ? 'remote' : 'same';
  } catch {
    return 'same';
  }
}

export function Home(props: Props) {
  const { account } = props;
  // Le lieu choisi reste d'une fois sur l'autre : « même cible » sur la borne, « à distance » sur un téléphone.
  const [place, setPlace] = useState<RoomPlace>(savedPlace);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const choosePlace = (p: RoomPlace) => {
    setPlace(p);
    try {
      localStorage.setItem(PLACE_KEY, p);
    } catch {
      // Préférence non retenue : sans gravité.
    }
  };

  const create = async (mode: GameMode) => {
    setBusy(true);
    setError(null);
    try {
      await props.onNewGame(mode, place);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Serveur en ligne injoignable.');
      setBusy(false);
    }
  };

  return (
    <div className="screen home">
      <header className="home-top">
        <div className="home-logo">
          <Logo size={56} />
        </div>
        <div className="home-account">
          <Avatar avatar={account.avatar} color={account.color} size={48} />
          <span className="home-account-name">{account.name}</span>
          <button onClick={props.onEditAccount}>Modifier</button>
          <button onClick={props.onLogout}>Déconnexion</button>
        </div>
      </header>

      {props.currentRoom && (
        <button className="btn-gold home-resume" onClick={props.onResume}>
          Reprendre la partie {props.currentRoom}
        </button>
      )}

      <section className="home-new">
        <div className="home-place segmented">
          {(['same', 'remote'] as const).map((p) => (
            <button key={p} className={place === p ? 'selected' : ''} onClick={() => choosePlace(p)}>
              {PLACE_NAMES[p]}
            </button>
          ))}
        </div>
        <div className="home-modes">
          {MODES.map((m) => (
            <button key={m.mode} className="home-mode btn-primary" disabled={busy} onClick={() => create(m.mode)}>
              <span className="home-mode-title">{m.title}</span>
              <span className="home-mode-sub">{m.sub}</span>
            </button>
          ))}
        </div>
        {error && <div className="home-warning">{error}</div>}
      </section>

      <div className="home-links">
        <form
          className="home-join"
          onSubmit={(e) => {
            e.preventDefault();
            if (isValidCode(code)) props.onJoin(code);
          }}
        >
          <input
            aria-label="Code de la partie"
            placeholder="CODE"
            value={code}
            maxLength={CODE_LENGTH + 2}
            autoCapitalize="characters"
            autoComplete="off"
            onChange={(e) => setCode(normalizeCode(e.target.value))}
          />
          <button type="submit" disabled={!isValidCode(code)}>
            Rejoindre
          </button>
        </form>
        <button onClick={props.onPlayers}>Joueurs et classements</button>
        {props.onImport && <button onClick={props.onImport}>Récupérer les stats de la borne</button>}
      </div>
    </div>
  );
}
