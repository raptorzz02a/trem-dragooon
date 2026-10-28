import { useCallback, useEffect, useRef, useState } from 'react';
import { DELETED_NAME, type GameRecord, type Profile } from '../profiles/types';
import { openStore, type Store } from '../storage/db';
import type { SavedGame } from '../storage/currentGame';
import { DEFAULT_AVATAR } from './components/Avatar';

/** Profils et parties archivées, chargés une fois puis tenus à jour en mémoire et dans IndexedDB. */
export interface Library {
  ready: boolean;
  /** false si IndexedDB est indisponible : les données seront perdues à la fermeture. */
  durable: boolean;
  profiles: Profile[];
  games: GameRecord[];
  saveProfile: (profile: Profile) => void;
  /** Efface le nom et l'avatar du joueur, y compris dans les parties archivées. Ses parties restent pour les autres joueurs. */
  deleteProfile: (id: string) => void;
  archiveGame: (game: SavedGame) => void;
  unarchiveGame: (id: string) => void;
}

export function useLibrary(): Library {
  const store = useRef<Store | null>(null);
  const [ready, setReady] = useState(false);
  const [durable, setDurable] = useState(true);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [games, setGames] = useState<GameRecord[]>([]);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const opened = await openStore();
      const [p, g] = await Promise.all([opened.store.listProfiles(), opened.store.listGames()]).catch(() => [[], []] as const);
      if (!alive) return;
      store.current = opened.store;
      setDurable(opened.durable);
      setProfiles([...p]);
      setGames([...g]);
      setReady(true);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const write = (fn: (s: Store) => Promise<void>) => {
    // L'écran est mis à jour tout de suite ; une écriture refusée est signalée dans la console sans bloquer la partie.
    if (store.current) fn(store.current).catch((e) => console.error('Sauvegarde impossible', e));
  };

  const saveProfile = useCallback((profile: Profile) => {
    setProfiles((list) => [...list.filter((p) => p.id !== profile.id), profile]);
    write((s) => s.putProfile(profile));
  }, []);

  const putGame = (record: GameRecord) => {
    setGames((list) => [...list.filter((g) => g.id !== record.id), record]);
    write((s) => s.putGame(record));
  };

  const archiveGame = useCallback((game: SavedGame) => {
    putGame({ id: game.session.id, session: game.session, players: game.players });
  }, []);

  const unarchiveGame = useCallback((id: string) => {
    setGames((list) => list.filter((g) => g.id !== id));
    write((s) => s.deleteGame(id));
  }, []);

  const deleteProfile = useCallback(
    (id: string) => {
      const profile = profiles.find((p) => p.id === id);
      if (!profile) return;
      saveProfile({ ...profile, name: DELETED_NAME, avatar: DEFAULT_AVATAR, deleted: true });
      for (const g of games) {
        if (!g.players.some((p) => p.id === id)) continue;
        putGame({ ...g, players: g.players.map((p) => (p.id === id ? { ...p, name: DELETED_NAME } : p)) });
      }
    },
    [profiles, games, saveProfile],
  );

  return { ready, durable, profiles, games, saveProfile, deleteProfile, archiveGame, unarchiveGame };
}
