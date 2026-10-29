import { useMemo, useState } from 'react';
import type { Dart } from '../game-engine/darts';
import {
  abandonSession,
  createSession,
  endTurn,
  rematchConfig,
  sessionState,
  startSession,
  throwDart,
  undoLast,
  type GameSession,
} from '../game-session/session';
import { loadSettings, saveSettings, type AppSettings } from '../settings/settings';
import { loadCurrentGame, saveCurrentGame, type SavedGame } from '../storage/currentGame';
import type { GameConfig } from '../game-engine/types';
import type { GameMode } from '../game-engine/types';
import { currentOnlineRoom } from '../online/useOnlineRoom';
import { normalizeCode } from '../online/protocol';
import { Game } from './screens/Game';
import { Online } from './screens/Online';
import { Home } from './screens/Home';
import { Players } from './screens/Players';
import { Profile } from './screens/Profile';
import { Rankings } from './screens/Rankings';
import { useLibrary } from './useLibrary';
import { DEFAULT_SETUP, Setup, type GameSetup } from './screens/Setup';

type Screen = 'home' | 'setup' | 'game' | 'players' | 'profile' | 'rankings' | 'online';

/** Code reçu par un lien de partage (?salon=ABC234), retiré de l'adresse une fois lu. */
function sharedCode(): string | null {
  const code = new URLSearchParams(location.search).get('salon');
  if (code) history.replaceState(null, '', location.pathname);
  return code ? normalizeCode(code) : null;
}

const newGameId = () => `game-${Date.now()}`;

/** Réglages de l'écran de configuration retrouvés depuis une partie (pour « Modifier les joueurs »). */
function setupFrom(game: SavedGame, base: GameSetup): GameSetup {
  const { config } = game.session;
  const teamOf: Record<string, number> = {};
  config.sides.forEach((s, i) => s.playerIds.forEach((id) => (teamOf[id] = i)));
  return {
    ...base,
    mode: config.mode,
    [config.mode]: config.options,
    teamMode: config.teamMode,
    teamCount: config.teamMode ? config.sides.length : base.teamCount,
    players: config.sides.flatMap((s) => s.playerIds).map((id) => game.players.find((p) => p.id === id)!),
    teamOf,
  };
}

export function App() {
  const [game, setGame] = useState<SavedGame | null>(() => loadCurrentGame());
  const [shared] = useState(sharedCode);
  const [screen, setScreen] = useState<Screen>(shared ? 'online' : 'home');
  const [online, setOnline] = useState<{ code: string | null; resume: boolean }>({ code: shared, resume: false });
  const [setup, setSetup] = useState<GameSetup>(DEFAULT_SETUP);
  const [profileId, setProfileId] = useState<string | null>(null);
  /** Écran à retrouver en quittant une fiche joueur. */
  const [profileFrom, setProfileFrom] = useState<Screen>('players');
  const [settings, setSettings] = useState<AppSettings>(loadSettings);
  const updateSettings = (patch: Partial<AppSettings>) =>
    setSettings((s) => {
      const next = { ...s, ...patch };
      saveSettings(next);
      return next;
    });
  const library = useLibrary();
  const state = useMemo(() => (game ? sessionState(game.session) : null), [game]);

  // Chaque action validée est sauvegardée aussitôt, pour pouvoir reprendre après une fermeture.
  // Une partie terminée est archivée pour les statistiques ; si une annulation la rouvre, l'archive est retirée.
  const commit = (next: SavedGame | null) => {
    setGame(next);
    saveCurrentGame(next);
    if (next?.session.status === 'finished') library.archiveGame(next);
    else if (next && game?.session.id === next.session.id && game.session.status === 'finished') {
      library.unarchiveGame(next.session.id);
    }
  };

  const openProfile = (id: string, from: Screen) => {
    setProfileId(id);
    setProfileFrom(from);
    setScreen('profile');
  };

  const act = (fn: (s: GameSession) => GameSession) => {
    if (!game) return;
    try {
      commit({ ...game, session: fn(game.session) });
    } catch (e) {
      console.warn(e); // action refusée par le moteur (ex. partie terminée) : rien ne change
    }
  };

  const start = (config: GameConfig, players: SavedGame['players']) => {
    const session = startSession(createSession(newGameId(), config));
    commit({ version: 1, session, players });
    setScreen('game');
  };

  const leave = () => {
    commit(null);
    setScreen('home');
  };

  if (screen === 'online' && library.ready) {
    return (
      <Online
        initialCode={online.code}
        resume={online.resume}
        profiles={library.profiles}
        onSaveProfile={library.saveProfile}
        onHome={() => setScreen('home')}
      />
    );
  }

  if (screen === 'setup' && library.ready) {
    return (
      <Setup
        initial={setup}
        profiles={library.profiles}
        onSaveProfile={library.saveProfile}
        onBack={() => setScreen('home')}
        onStart={(s, config) => {
          setSetup(s);
          start(config, s.players);
        }}
      />
    );
  }

  if (screen === 'game' && game && state) {
    return (
      <Game
        session={game.session}
        state={state}
        players={game.players}
        profiles={library.profiles}
        settings={settings}
        onDart={(dart: Dart) => act((s) => throwDart(s, dart))}
        onEndTurn={() => act((s) => endTurn(s))}
        onUndo={() => act((s) => undoLast(s))}
        onQuit={() => {
          // Une partie abandonnée apparaît dans l'historique, sans compter ni en victoire ni en défaite.
          if (game.session.events.length > 0) library.archiveGame({ ...game, session: abandonSession(game.session) });
          leave();
        }}
        onRematch={() => start(rematchConfig(game.session.config), game.players)}
        onEditPlayers={() => {
          setSetup(setupFrom(game, setup));
          commit(null);
          setScreen('setup');
        }}
        onHome={leave}
      />
    );
  }

  const profile = library.profiles.find((p) => p.id === profileId);
  if (screen === 'profile' && profile && !profile.deleted) {
    return (
      <Profile
        profile={profile}
        profiles={library.profiles}
        games={library.games}
        settings={settings}
        onSettings={updateSettings}
        onSave={library.saveProfile}
        onDelete={library.deleteProfile}
        onBack={() => setScreen(profileFrom)}
      />
    );
  }

  if (screen === 'players' || screen === 'profile') {
    return (
      <Players
        profiles={library.profiles}
        games={library.games}
        onSaveProfile={library.saveProfile}
        onOpen={(id) => openProfile(id, 'players')}
        onBack={() => setScreen('home')}
      />
    );
  }

  if (screen === 'rankings') {
    return (
      <Rankings
        profiles={library.profiles}
        games={library.games}
        onOpen={(id) => openProfile(id, 'rankings')}
        onBack={() => setScreen('home')}
      />
    );
  }

  const resumable = game !== null && game.session.status === 'in_progress';
  const onlineRoom = currentOnlineRoom();
  const goOnline = (code: string | null, resume: boolean) => {
    setOnline({ code, resume });
    setScreen('online');
  };
  return (
    <Home
      canResume={resumable}
      onlineRoom={onlineRoom}
      onOnline={() => goOnline(null, false)}
      onResumeOnline={() => goOnline(onlineRoom, true)}
      durable={library.durable}
      onPlayers={() => setScreen('players')}
      onRankings={() => setScreen('rankings')}
      onResume={() => setScreen('game')}
      onNewGame={(mode: GameMode) => {
        // Les joueurs et les équipes de la dernière partie restent proposés.
        setSetup((s) => ({ ...s, mode }));
        setScreen('setup');
      }}
    />
  );
}
