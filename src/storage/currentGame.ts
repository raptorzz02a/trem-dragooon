import type { GameSession } from '../game-session/session';

export interface PlayerRef {
  id: string;
  name: string;
}

/** Ce qui est sauvegardé après chaque action : la partie et les noms de ses joueurs. */
export interface SavedGame {
  version: 1;
  session: GameSession;
  players: PlayerRef[];
}

const KEY = 'trem-dragooon.current-game';

// Le stockage peut être indisponible (navigation privée, stockage bloqué) : l'appli doit continuer à fonctionner.
export function loadCurrentGame(): SavedGame | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw) as SavedGame;
    return saved.version === 1 ? saved : null;
  } catch {
    return null;
  }
}

export function saveCurrentGame(game: SavedGame | null): void {
  try {
    if (game) localStorage.setItem(KEY, JSON.stringify(game));
    else localStorage.removeItem(KEY);
  } catch {
    // Sans stockage, la partie continue mais ne pourra pas être reprise après fermeture.
  }
}
