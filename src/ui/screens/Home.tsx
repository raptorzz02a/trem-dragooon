import { Logo } from '../components/Logo';
import './Home.css';

interface Props {
  canResume: boolean;
  onResume: () => void;
  onNewX01: () => void;
}

const SOON = ['Cricket', 'Horloge', 'Shanghai'];

export function Home({ canResume, onResume, onNewX01 }: Props) {
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
        <button className="home-mode btn-primary" onClick={onNewX01}>
          <span className="home-mode-title">301 · 501 · 701</span>
          <span className="home-mode-sub">Décompte, busts et finitions</span>
        </button>
        {SOON.map((name) => (
          <button key={name} className="home-mode" disabled>
            <span className="home-mode-title">{name}</span>
            <span className="home-mode-sub">Bientôt</span>
          </button>
        ))}
      </div>
    </div>
  );
}
