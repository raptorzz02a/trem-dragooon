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
import { GameX01 } from './screens/GameX01';
import { Home } from './screens/Home';
import { DEFAULT_X01_SETUP, SetupX01, type X01Setup } from './screens/SetupX01';

type Screen = 'home' | 'setup' | 'game';

const newGameId = () => `game-${Date.now()}`;

/** Réglages de l'écran de configuration retrouvés depuis une partie (pour « Modifier les joueurs »). */
function setupFrom(game: SavedGame): X01Setup {
  const { config } = game.session;
  const teamOf: Record<string, number> = {};
  config.sides.forEach((s, i) => s.playerIds.forEach((id) => (teamOf[id] = i)));
  const options = config.mode === 'x01' ? config.options : DEFAULT_X01_SETUP;
  return {
    ...DEFAULT_X01_SETUP,
    startScore: options.startScore,
    out: options.out,
    teamMode: config.teamMode,
    teamCount: config.teamMode ? config.sides.length : 2,
    players: config.sides.flatMap((s) => s.playerIds).map((id) => game.players.find((p) => p.id === id)!),
    teamOf,
  };
}

export function App() {
  const [game, setGame] = useState<SavedGame | null>(() => loadCurrentGame());
  const [screen, setScreen] = useState<Screen>('home');
  const [setup, setSetup] = useState<X01Setup>(DEFAULT_X01_SETUP);
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
      <SetupX01
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
      <GameX01
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
          setSetup(setupFrom(game));
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
      onNewX01={() => setScreen('setup')}
    />
  );
}
