import type { GameMode } from '../../game-engine/types';
import { Logo } from '../components/Logo';
import './Home.css';

interface Props {
  canResume: boolean;
  onResume: () => void;
  onNewGame: (mode: GameMode) => void;
}

const MODES: { mode: GameMode; title: string; sub: string }[] = [
  { mode: 'x01', title: '301 · 501 · 701', sub: 'Décompte, busts et finitions' },
  { mode: 'cricket', title: 'Cricket', sub: 'Fermer 15 à 20 et le Bull' },
  { mode: 'clock', title: 'Horloge', sub: 'Du 1 au 20, dans l’ordre' },
  { mode: 'shanghai', title: 'Shanghai', sub: 'Un numéro par manche' },
];

export function Home({ canResume, onResume, onNewGame }: Props) {
  return (
    <div className="screen home">
      <div className="home-logo">
        <Logo size={84} />
      </div>
      {canResume && (
        <button className="btn-gold home-resume" onClick={onResume}>
          Reprendre la partie en cours
        </button>
      )}
      <div className="home-modes">
        {MODES.map((m) => (
          <button key={m.mode} className="home-mode btn-primary" onClick={() => onNewGame(m.mode)}>
            <span className="home-mode-title">{m.title}</span>
            <span className="home-mode-sub">{m.sub}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
