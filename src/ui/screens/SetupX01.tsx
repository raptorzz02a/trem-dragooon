import { useState } from 'react';
import { MAX_PLAYERS, MAX_TEAMS, MIN_TEAMS, validateConfig } from '../../game-engine/engine';
import type { GameConfig, X01Options } from '../../game-engine/types';
import type { PlayerRef } from '../../storage/currentGame';
import { emptyTeams, individualSides, randomOrder, randomTeams, TEAM_COLORS } from '../../teams/teams';
import './SetupX01.css';

/** Réglages saisis à l'écran, conservés pour « Modifier les joueurs » après une partie. */
export interface X01Setup {
  startScore: X01Options['startScore'];
  out: X01Options['out'];
  teamMode: boolean;
  teamCount: number;
  randomizeOrder: boolean;
  players: PlayerRef[];
  /** Équipe de chaque joueur (indice), en mode équipe. */
  teamOf: Record<string, number>;
}

export const DEFAULT_X01_SETUP: X01Setup = {
  startScore: 501,
  out: 'double',
  teamMode: false,
  teamCount: 2,
  randomizeOrder: true,
  players: [],
  teamOf: {},
};

function newId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `p-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function buildX01Config(setup: X01Setup): GameConfig {
  let sides = individualSides(setup.players);
  if (setup.teamMode) {
    sides = emptyTeams(setup.teamCount);
    for (const p of setup.players) sides[setup.teamOf[p.id] ?? 0]!.playerIds.push(p.id);
  }
  if (setup.randomizeOrder) sides = randomOrder(sides);
  return {
    mode: 'x01',
    options: { startScore: setup.startScore, out: setup.out, maxRounds: null },
    teamMode: setup.teamMode,
    training: setup.players.length === 1,
    sides,
  };
}

interface Props {
  initial: X01Setup;
  onBack: () => void;
  onStart: (setup: X01Setup, config: GameConfig) => void;
}

export function SetupX01({ initial, onBack, onStart }: Props) {
  const [setup, setSetup] = useState(initial);
  const [name, setName] = useState('');
  const update = (patch: Partial<X01Setup>) => setSetup((s) => ({ ...s, ...patch }));
  const { players } = setup;
  const maxTeams = Math.min(MAX_TEAMS, Math.max(MIN_TEAMS, players.length));

  const addPlayer = () => {
    const trimmed = name.trim();
    if (!trimmed || players.length >= MAX_PLAYERS) return;
    const id = newId();
    // Un nouveau joueur rejoint l'équipe la moins nombreuse.
    const sizes = Array.from({ length: setup.teamCount }, (_, t) => players.filter((p) => setup.teamOf[p.id] === t).length);
    update({ players: [...players, { id, name: trimmed }], teamOf: { ...setup.teamOf, [id]: sizes.indexOf(Math.min(...sizes)) } });
    setName('');
  };

  const removePlayer = (id: string) => update({ players: players.filter((p) => p.id !== id) });

  const movePlayer = (index: number, delta: number) => {
    const next = players.slice();
    const [moved] = next.splice(index, 1);
    next.splice(index + delta, 0, moved!);
    update({ players: next });
  };

  const cycleTeam = (id: string) =>
    update({ teamOf: { ...setup.teamOf, [id]: ((setup.teamOf[id] ?? 0) + 1) % setup.teamCount } });

  const drawTeams = () => {
    const teams = randomTeams(players.map((p) => p.id), setup.teamCount);
    const teamOf: Record<string, number> = {};
    teams.forEach((t, i) => t.playerIds.forEach((id) => (teamOf[id] = i)));
    update({ teamOf });
  };

  const setTeamCount = (teamCount: number) =>
    update({
      teamCount,
      teamOf: Object.fromEntries(Object.entries(setup.teamOf).map(([id, t]) => [id, Math.min(t, teamCount - 1)])),
    });

  let error: string | null = null;
  let config: GameConfig | null = null;
  if (players.length === 0) error = 'Ajoute au moins un joueur.';
  else {
    try {
      config = buildX01Config({ ...setup, randomizeOrder: false });
      validateConfig(config);
    } catch (e) {
      error = (e as Error).message;
      config = null;
    }
  }

  return (
    <div className="screen setup">
      <header className="setup-header">
        <button onClick={onBack}>← Retour</button>
        <h2>Nouvelle partie · 301 / 501 / 701</h2>
      </header>

      <div className="setup-body">
        <section className="setup-rules">
          <div className="label">Score de départ</div>
          <div className="segmented">
            {([301, 501, 701] as const).map((v) => (
              <button key={v} className={setup.startScore === v ? 'selected' : ''} onClick={() => update({ startScore: v })}>
                {v}
              </button>
            ))}
          </div>

          <div className="label">Sortie</div>
          <div className="segmented">
            <button className={setup.out === 'straight' ? 'selected' : ''} onClick={() => update({ out: 'straight' })}>
              Simple
            </button>
            <button className={setup.out === 'double' ? 'selected' : ''} onClick={() => update({ out: 'double' })}>
              Double
            </button>
          </div>

          <div className="label">Formule</div>
          <div className="segmented">
            <button className={!setup.teamMode ? 'selected' : ''} onClick={() => update({ teamMode: false })}>
              Individuel
            </button>
            <button className={setup.teamMode ? 'selected' : ''} onClick={() => update({ teamMode: true })}>
              Équipes
            </button>
          </div>

          {setup.teamMode && (
            <>
              <div className="label">Nombre d'équipes</div>
              <div className="segmented">
                {Array.from({ length: MAX_TEAMS - MIN_TEAMS + 1 }, (_, i) => i + MIN_TEAMS).map((n) => (
                  <button
                    key={n}
                    className={setup.teamCount === n ? 'selected' : ''}
                    disabled={n > maxTeams}
                    onClick={() => setTeamCount(n)}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <button className="btn-primary" disabled={players.length < setup.teamCount} onClick={drawTeams}>
                Tirer les équipes au sort
              </button>
            </>
          )}

          <div className="label">Ordre de passage</div>
          <div className="segmented">
            <button className={setup.randomizeOrder ? 'selected' : ''} onClick={() => update({ randomizeOrder: true })}>
              Aléatoire
            </button>
            <button className={!setup.randomizeOrder ? 'selected' : ''} onClick={() => update({ randomizeOrder: false })}>
              Ordre de la liste
            </button>
          </div>
        </section>

        <section className="setup-players">
          <div className="label">
            Joueurs ({players.length}/{MAX_PLAYERS})
          </div>
          <form
            className="setup-add"
            onSubmit={(e) => {
              e.preventDefault();
              addPlayer();
            }}
          >
            <input
              value={name}
              maxLength={20}
              placeholder="Nom du joueur"
              onChange={(e) => setName(e.target.value)}
              disabled={players.length >= MAX_PLAYERS}
            />
            <button type="submit" className="btn-primary" disabled={!name.trim() || players.length >= MAX_PLAYERS}>
              Ajouter
            </button>
          </form>
          <ol className="setup-list">
            {players.map((p, i) => {
              const team = setup.teamOf[p.id] ?? 0;
              return (
                <li key={p.id}>
                  <span className="setup-pos">{i + 1}</span>
                  <span className="setup-name">{p.name}</span>
                  {setup.teamMode && (
                    <button
                      className="setup-team"
                      style={{ borderColor: TEAM_COLORS[team]!.hex, color: TEAM_COLORS[team]!.hex }}
                      onClick={() => cycleTeam(p.id)}
                    >
                      {TEAM_COLORS[team]!.name}
                    </button>
                  )}
                  <button aria-label="Monter" disabled={i === 0} onClick={() => movePlayer(i, -1)}>
                    ▲
                  </button>
                  <button aria-label="Descendre" disabled={i === players.length - 1} onClick={() => movePlayer(i, 1)}>
                    ▼
                  </button>
                  <button aria-label="Retirer" className="btn-danger" onClick={() => removePlayer(p.id)}>
                    ✕
                  </button>
                </li>
              );
            })}
          </ol>
        </section>
      </div>

      <footer className="setup-footer">
        <span className="setup-error">{error ?? (players.length === 1 ? 'Partie d’entraînement (1 joueur)' : '')}</span>
        <button className="btn-gold" disabled={!config} onClick={() => onStart(setup, buildX01Config(setup))}>
          Lancer la partie
        </button>
      </footer>
    </div>
  );
}
