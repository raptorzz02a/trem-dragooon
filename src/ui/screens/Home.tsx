import { useState } from 'react';
import type { GameMode } from '../../game-engine/types';
import type { PublicAccount } from '../../online/accounts';
import { CODE_LENGTH, isValidCode, normalizeCode, type RoomPlace } from '../../online/protocol';
import type { SaloonsState } from '../../online/useSaloons';
import { useLiveGames } from '../../online/useLiveGames';
import { Avatar } from '../components/Avatar';
import { SaloonHeader, SaloonRail } from '../components/Saloons';
import { Logo } from '../components/Logo';
import { PLACE_NAMES } from './Setup';
import './Home.css';

interface Props {
  account: PublicAccount;
  saloons: SaloonsState;
  onAddSaloon: () => void;
  onSaloonInfo: () => void;
  /** Regarder une partie du saloon depuis la liste « Parties en cours ». */
  onWatch: (watchKey: string) => void;
  /** Partie en cours sur cet appareil (quittée sans la fermer, ou page rechargée). */
  currentRoom: string | null;
  onResume: () => void;
  onNewGame: (mode: GameMode, place: RoomPlace) => Promise<void>;
  onJoin: (code: string) => void;
  onPlayers: () => void;
  onMyStats: () => void;
  /** Créer ou renouveler son code de secours (mot de passe oublié). */
  onRecovery: () => void;
  hasRecovery: boolean;
  onEditAccount: () => void;
  onPassword: () => void;
  onLogout: () => void;
  /** Présent si le compte connecté est administrateur. */
  onAdmin?: () => void;
  /** Présent si cet appareil a des stats d'avant le passage en ligne à reprendre. */
  onImport?: () => void;
}

const MODES: { mode: GameMode; title: string; sub: string }[] = [
  { mode: 'x01', title: '301 · 501 · 701', sub: 'Décompte, busts et finitions' },
  { mode: 'cricket', title: 'Cricket', sub: 'Fermer 15 à 20 et le Bull' },
  { mode: 'clock', title: 'Horloge', sub: 'Du 1 au 20, dans l’ordre' },
  { mode: 'random', title: 'Chiffre aléatoire', sub: 'Un numéro tiré au sort par manche' },
];

type RemoteAction = 'create' | 'join';

export function Home(props: Props) {
  const { account } = props;
  // « Même cible » est toujours proposé d'abord : c'est le cas de la borne.
  const [place, setPlace] = useState<RoomPlace>('same');
  const [remoteAction, setRemoteAction] = useState<RemoteAction>('create');
  const [menuOpen, setMenuOpen] = useState(false);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const menuItem = (label: string, action: () => void, className?: string) => (
    <button
      role="menuitem"
      className={className}
      onClick={() => {
        setMenuOpen(false);
        action();
      }}
    >
      {label}
    </button>
  );

  return (
    <div className={`screen home${props.saloons.fixed ? '' : ' with-rail'}`}>
      {/* Saloon fixé sur cet appareil (la borne) : pas de sélecteur. */}
      {!props.saloons.fixed && <SaloonRail state={props.saloons} onAdd={props.onAddSaloon} />}
      <header className="home-top">
        <div className="home-logo">
          <Logo size={56} />
        </div>
        <div className="home-account">
          <button
            className="home-account-toggle"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((o) => !o)}
          >
            <Avatar avatar={account.avatar} color={account.color} size={48} />
            <span className="home-account-name">{account.name}</span>
            <span className="home-account-caret">{menuOpen ? '▴' : '▾'}</span>
          </button>
          {menuOpen && (
            <>
              <div className="home-menu-backdrop" onClick={() => setMenuOpen(false)} />
              <div className="home-menu" role="menu">
                {menuItem('Modifier', props.onEditAccount)}
                {menuItem('Mes stats', props.onMyStats)}
                {menuItem('Mot de passe', props.onPassword)}
                {menuItem(props.hasRecovery ? 'Code de secours' : 'Créer mon code de secours', props.onRecovery)}
                {props.onImport && menuItem('Récupérer les stats de la borne', props.onImport)}
                {menuItem(
                  props.saloons.fixed ? 'Ne plus fixer le saloon sur cet appareil' : 'Fixer ce saloon sur cet appareil (borne)',
                  () => props.saloons.setFixed(!props.saloons.fixed),
                )}
                {props.onAdmin && menuItem('Administration', props.onAdmin)}
                {menuItem('Déconnexion', props.onLogout, 'home-menu-logout')}
              </div>
            </>
          )}
        </div>
      </header>

      <SaloonHeader state={props.saloons} onAdd={props.onAddSaloon} onInfo={props.onSaloonInfo} />

      {props.currentRoom && (
        <button className="btn-gold home-resume" onClick={props.onResume}>
          Reprendre la partie {props.currentRoom}
        </button>
      )}

      <section className="home-new">
        <div className="home-place">
          <div className="segmented">
            {(['same', 'remote'] as const).map((p) => (
              <button key={p} className={place === p ? 'selected' : ''} onClick={() => setPlace(p)}>
                {PLACE_NAMES[p]}
              </button>
            ))}
          </div>
          {/* Sous « En ligne », dans sa colonne : créer une partie ou en rejoindre une avec le code. */}
          {place === 'remote' && (
            <div className="home-remote">
              {(
                [
                  ['create', 'Créer'],
                  ['join', 'Rejoindre'],
                ] as const
              ).map(([a, label]) => (
                <button key={a} className={remoteAction === a ? 'selected' : ''} onClick={() => setRemoteAction(a)}>
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
        {place === 'remote' && remoteAction === 'join' ? (
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
            <button type="submit" className="btn-gold" disabled={!isValidCode(code)}>
              Rejoindre
            </button>
          </form>
        ) : (
          <div className="home-modes">
            {MODES.map((m) => (
              <button key={m.mode} className="home-mode btn-primary" disabled={busy} onClick={() => create(m.mode)}>
                <span className="home-mode-title">{m.title}</span>
                <span className="home-mode-sub">{m.sub}</span>
              </button>
            ))}
          </div>
        )}
        {error && <div className="home-warning">{error}</div>}
      </section>

      <LiveGames saloonId={props.saloons.current.id} onWatch={props.onWatch} onJoin={props.onJoin} />

      <div className="home-links">
        <button onClick={props.onMyStats}>Mes stats</button>
        <button onClick={props.onPlayers}>Classement du saloon</button>
      </div>
    </div>
  );
}

const MODE_TITLES: Record<GameMode, string> = { x01: 'X01', cricket: 'Cricket', clock: 'Horloge', random: 'Chiffre aléatoire' };

/** Parties en cours dans le saloon : on peut les regarder, ou reprendre celles où l'on joue ; pour en rejoindre une autre, il faut son code. */
function LiveGames({ saloonId, onWatch, onJoin }: { saloonId: string; onWatch: (watchKey: string) => void; onJoin: (code: string) => void }) {
  const games = useLiveGames(saloonId);
  if (games.length === 0) return null;
  return (
    <section className="home-live">
      <div className="label">Parties en cours</div>
      {games.map((g) => (
        <div key={g.watchKey} className="home-live-row">
          <span className={`home-live-status${g.status === 'playing' ? ' playing' : ''}`}>{g.status === 'playing' ? 'En jeu' : 'Salle d’attente'}</span>
          <span className="home-live-mode">
            {MODE_TITLES[g.mode]} · {PLACE_NAMES[g.place]}
          </span>
          <span className="home-live-players">{g.players.join(', ')}</span>
          {g.watchers > 0 && <span className="home-live-watchers">👁 {g.watchers}</span>}
          {g.code ? (
            <button className="btn-gold" onClick={() => onJoin(g.code!)}>
              Reprendre
            </button>
          ) : (
            <button onClick={() => onWatch(g.watchKey)}>Regarder</button>
          )}
        </div>
      ))}
      <div className="home-live-hint">Pour rejoindre une autre partie, demande son code à l’hôte.</div>
    </section>
  );
}
