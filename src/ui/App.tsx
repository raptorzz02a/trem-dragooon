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
import { loadSettings } from '../settings/settings';
import { loadCurrentGame, saveCurrentGame, type SavedGame } from '../storage/currentGame';
import type { GameConfig } from '../game-engine/types';
import type { GameMode } from '../game-engine/types';
import { Game } from './screens/Game';
import { Home } from './screens/Home';
import { DEFAULT_SETUP, Setup, type GameSetup } from './screens/Setup';

type Screen = 'home' | 'setup' | 'game';

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
  const [screen, setScreen] = useState<Screen>('home');
  const [setup, setSetup] = useState<GameSetup>(DEFAULT_SETUP);
  const settings = useMemo(loadSettings, []);
  const state = useMemo(() => (game ? sessionState(game.session) : null), [game]);

  // Chaque action validée est sauvegardée aussitôt, pour pouvoir reprendre après une fermeture.
  const commit = (next: SavedGame | null) => {
    setGame(next);
    saveCurrentGame(next);
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

  if (screen === 'setup') {
    return (
      <Setup
        initial={setup}
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
        settings={settings}
        onDart={(dart: Dart) => act((s) => throwDart(s, dart))}
        onEndTurn={() => act((s) => endTurn(s))}
        onUndo={() => act((s) => undoLast(s))}
        onQuit={() => {
          // L'abandon sera archivé avec les statistiques (lot 4) ; pour l'instant la partie est simplement fermée.
          abandonSession(game.session);
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

  const resumable = game !== null && game.session.status === 'in_progress';
  return (
    <Home
      canResume={resumable}
      onResume={() => setScreen('game')}
      onNewGame={(mode: GameMode) => {
        // Les joueurs et les équipes de la dernière partie restent proposés.
        setSetup((s) => ({ ...s, mode }));
        setScreen('setup');
      }}
    />
  );
}
