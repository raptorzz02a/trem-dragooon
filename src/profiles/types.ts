import type { GameSession } from '../game-session/session';
import type { PlayerRef } from '../storage/currentGame';

export interface AvatarConfig {
  skin: number;
  hair: number;
  hairColor: number;
  facialHair: number;
  glasses: number;
  hat: number;
}

export interface Profile {
  /** Identifiant technique : deux joueurs peuvent porter le même nom. */
  id: string;
  name: string;
  /** Couleur de fond de l'avatar. */
  color: string;
  avatar: AvatarConfig;
  createdAt: string;
  /** Profil supprimé : le nom est effacé mais les résultats des autres joueurs restent justes. */
  deleted?: boolean;
}

/**
 * Une partie archivée : la session complète (configuration + lancers) et les noms des joueurs au moment de la partie.
 * Les statistiques et classements sont toujours recalculés à partir de ces archives.
 */
export interface GameRecord {
  id: string;
  session: GameSession;
  players: PlayerRef[];
}

export const DELETED_NAME = 'Joueur supprimé';
