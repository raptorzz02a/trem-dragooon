import { useState } from 'react';
import type { ReactNode } from 'react';
import { DEFAULT_OPTIONS, MAX_PLAYERS, MAX_TEAMS, MIN_TEAMS, validateConfig } from '../../game-engine/engine';
import type {
  ClockOptions,
  CricketOptions,
  GameConfig,
  GameMode,
  ShanghaiOptions,
  X01Options,
} from '../../game-engine/types';
import type { Profile } from '../../profiles/types';
import type { PlayerRef } from '../../storage/currentGame';
import { emptyTeams, individualSides, randomOrder, randomTeams, TEAM_COLORS } from '../../teams/teams';
import { Avatar } from '../components/Avatar';
import { newProfile, ProfileEditor } from '../components/ProfileEditor';
import './Setup.css';

/** Réglages saisis à l'écran, conservés pour « Modifier les joueurs » après une partie. */
export interface GameSetup {
  mode: GameMode;
  x01: X01Options;
  cricket: CricketOptions;
  clock: ClockOptions;
  shanghai: ShanghaiOptions;
  teamMode: boolean;
  teamCount: number;
  randomizeOrder: boolean;
  players: PlayerRef[];
  /** Équipe de chaque joueur (indice), en mode équipe. */
  teamOf: Record<string, number>;
}

export const DEFAULT_SETUP: GameSetup = {
  mode: 'x01',
  x01: { ...DEFAULT_OPTIONS.x01 },
  cricket: { ...DEFAULT_OPTIONS.cricket },
  clock: { ...DEFAULT_OPTIONS.clock },
  shanghai: { ...DEFAULT_OPTIONS.shanghai },
  teamMode: false,
  teamCount: 2,
  randomizeOrder: true,
  players: [],
  teamOf: {},
};

export const MODE_NAMES: Record<GameMode, string> = {
  x01: '301 / 501 / 701',
  cricket: 'Cricket',
  clock: 'Horloge',
  shanghai: 'Shanghai',
};

function modeOptions(setup: GameSetup) {
  switch (setup.mode) {
    case 'x01':
      return { mode: 'x01' as const, options: setup.x01 };
    case 'cricket':
      return { mode: 'cricket' as const, options: setup.cricket };
    case 'clock':
      return { mode: 'clock' as const, options: setup.clock };
    case 'shanghai':
      return { mode: 'shanghai' as const, options: setup.shanghai };
  }
}

export function buildConfig(setup: GameSetup): GameConfig {
  let sides = individualSides(setup.players);
  if (setup.teamMode) {
    sides = emptyTeams(setup.teamCount);
    for (const p of setup.players) sides[setup.teamOf[p.id] ?? 0]!.playerIds.push(p.id);
  }
  if (setup.randomizeOrder) sides = randomOrder(sides);
  return {
    ...modeOptions(setup),
    teamMode: setup.teamMode,
    training: setup.players.length === 1,
    sides,
  };
}

/** Rangée de choix exclusifs. */
function Choice<T extends string | number | boolean>(props: {
  label: string;
  value: T;
  options: { value: T; label: ReactNode; disabled?: boolean }[];
  onChange: (value: T) => void;
}) {
  return (
    <>
      <div className="label">{props.label}</div>
      <div className="segmented">
        {props.options.map((o) => (
          <button
            key={String(o.value)}
            className={props.value === o.value ? 'selected' : ''}
            disabled={o.disabled}
            onClick={() => props.onChange(o.value)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </>
  );
}

function ModeRules({ setup, update }: { setup: GameSetup; update: (patch: Partial<GameSetup>) => void }) {
  switch (setup.mode) {
    case 'x01': {
      const o = setup.x01;
      const set = (p: Partial<X01Options>) => update({ x01: { ...o, ...p } });
      return (
        <>
          <Choice
            label="Score de départ"
            value={o.startScore}
            options={[301, 501, 701].map((v) => ({ value: v as X01Options['startScore'], label: v }))}
            onChange={(startScore) => set({ startScore })}
          />
          <Choice
            label="Sortie"
            value={o.out}
            options={[
              { value: 'straight' as const, label: 'Simple' },
              { value: 'double' as const, label: 'Double' },
            ]}
            onChange={(out) => set({ out })}
          />
        </>
      );
    }
    case 'cricket': {
      const o = setup.cricket;
      const set = (p: Partial<CricketOptions>) => update({ cricket: { ...o, ...p } });
      return (
        <>
          <Choice
            label="Variante"
            value={o.variant}
            options={[
              { value: 'standard' as const, label: 'Classique' },
              { value: 'cutthroat' as const, label: 'Cut-Throat' },
            ]}
            onChange={(variant) => set({ variant })}
          />
          <Choice
            label="Bull à fermer"
            value={o.bull}
            options={[
              { value: true, label: 'Avec Bull' },
              { value: false, label: 'Sans Bull' },
            ]}
            onChange={(bull) => set({ bull })}
          />
          <Choice
            label="Manches maximum"
            value={o.maxRounds}
            options={[15, 20, 25].map((v) => ({ value: v, label: v }))}
            onChange={(maxRounds) => set({ maxRounds })}
          />
        </>
      );
    }
    case 'clock': {
      const o = setup.clock;
      const set = (p: Partial<ClockOptions>) => update({ clock: { ...o, ...p } });
      return (
        <>
          <Choice
            label="Parcours"
            value={o.order}
            options={[
              { value: 'asc' as const, label: '1 → 20' },
              { value: 'desc' as const, label: '20 → 1' },
              { value: 'board' as const, label: 'Cadran' },
            ]}
            onChange={(order) => set({ order })}
          />
          <Choice
            label="Zone à toucher"
            value={o.required}
            options={[
              { value: 'any' as const, label: 'Toutes' },
              { value: 'double' as const, label: 'Doubles' },
              { value: 'triple' as const, label: 'Triples' },
            ]}
            onChange={(required) => set({ required, advanceByMultiplier: required === 'any' && o.advanceByMultiplier })}
          />
          <Choice
            label="Double et triple font avancer de 2 et 3"
            value={o.advanceByMultiplier}
            options={[
              { value: false, label: 'Non' },
              { value: true, label: 'Oui', disabled: o.required !== 'any' },
            ]}
            onChange={(advanceByMultiplier) => set({ advanceByMultiplier })}
          />
          <Choice
            label="Bull final"
            value={o.bullFinish}
            options={[
              { value: 'none' as const, label: 'Aucun' },
              { value: 'any' as const, label: '25 ou 50' },
              { value: 'both' as const, label: '25 puis 50' },
            ]}
            onChange={(bullFinish) => set({ bullFinish })}
          />
        </>
      );
    }
    case 'shanghai': {
      const o = setup.shanghai;
      const set = (p: Partial<ShanghaiOptions>) => update({ shanghai: { ...o, ...p } });
      return (
        <>
          <Choice
            label="Nombre de manches"
            value={o.rounds}
            options={[7, 15, 20].map((v) => ({ value: v as ShanghaiOptions['rounds'], label: v }))}
            onChange={(rounds) => set({ rounds })}
          />
          <Choice
            label="Shanghai (simple + double + triple) = victoire"
            value={o.shanghaiWins}
            options={[
              { value: true, label: 'Oui' },
              { value: false, label: 'Non' },
            ]}
            onChange={(shanghaiWins) => set({ shanghaiWins })}
          />
        </>
      );
    }
  }
}

/** Convention d'équipe à afficher avant le départ (cahier des charges, Horloge et Shanghai). */
const TEAM_NOTES: Record<GameMode, string> = {
  x01: 'Le score est commun à l’équipe.',
  cricket: 'Marques et points sont communs à l’équipe.',
  clock: 'La progression est commune : le numéro à viser est partagé par l’équipe.',
  shanghai: 'Le total est commun ; le Shanghai doit être réussi dans une même volée.',
};

interface Props {
  initial: GameSetup;
  profiles: Profile[];
  onSaveProfile: (profile: Profile) => void;
  onBack: () => void;
  onStart: (setup: GameSetup, config: GameConfig) => void;
}

/** Choix des joueurs parmi les profils existants ; un nouveau profil peut être créé sur place. */
function PlayerPicker(props: {
  profiles: Profile[];
  selected: string[];
  remaining: number;
  onAdd: (profile: Profile) => void;
  onNew: () => void;
  onClose: () => void;
}) {
  const available = props.profiles
    .filter((p) => !p.deleted && !props.selected.includes(p.id))
    .sort((a, b) => a.name.localeCompare(b.name, 'fr'));
  return (
    <div className="overlay">
      <div className="dialog picker">
        <div className="picker-head">
          <h2>Ajouter des joueurs</h2>
          <span className="label">{props.remaining > 0 ? `Encore ${props.remaining} place(s)` : 'Partie complète'}</span>
        </div>
        <div className="picker-grid">
          <button className="picker-tile picker-new btn-primary" disabled={props.remaining <= 0} onClick={props.onNew}>
            <span className="picker-plus">＋</span>
            <span>Nouveau joueur</span>
          </button>
          {available.map((p) => (
            <button key={p.id} className="picker-tile" disabled={props.remaining <= 0} onClick={() => props.onAdd(p)}>
              <Avatar avatar={p.avatar} color={p.color} size={84} />
              <span className="picker-name">{p.name}</span>
            </button>
          ))}
        </div>
        <div className="dialog-actions">
          <button className="btn-gold" onClick={props.onClose}>
            Terminé
          </button>
        </div>
      </div>
    </div>
  );
}

export function Setup({ initial, profiles, onSaveProfile, onBack, onStart }: Props) {
  // Un profil supprimé entre-temps disparaît de la liste ; un profil renommé prend son nouveau nom.
  const [setup, setSetup] = useState(() => ({
    ...initial,
    players: initial.players.flatMap((p) => {
      const profile = profiles.find((x) => x.id === p.id);
      return profile && !profile.deleted ? [{ id: p.id, name: profile.name }] : [];
    }),
  }));
  const [picking, setPicking] = useState(false);
  const [creating, setCreating] = useState<Profile | null>(null);
  const update = (patch: Partial<GameSetup>) => setSetup((s) => ({ ...s, ...patch }));
  const { players } = setup;
  const maxTeams = Math.min(MAX_TEAMS, Math.max(MIN_TEAMS, players.length));
  const profileOf = (id: string) => profiles.find((p) => p.id === id);

  const addPlayer = (profile: Profile) =>
    setSetup((s) => {
      if (s.players.length >= MAX_PLAYERS || s.players.some((p) => p.id === profile.id)) return s;
      // Un nouveau joueur rejoint l'équipe la moins nombreuse.
      const sizes = Array.from({ length: s.teamCount }, (_, t) => s.players.filter((p) => s.teamOf[p.id] === t).length);
      return {
        ...s,
        players: [...s.players, { id: profile.id, name: profile.name }],
        teamOf: { ...s.teamOf, [profile.id]: sizes.indexOf(Math.min(...sizes)) },
      };
    });

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
      config = buildConfig({ ...setup, randomizeOrder: false });
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
        <h2>Nouvelle partie · {MODE_NAMES[setup.mode]}</h2>
      </header>

      <div className="setup-body">
        <section className="setup-rules">
          <ModeRules setup={setup} update={update} />

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
              <div className="setup-note">{TEAM_NOTES[setup.mode]}</div>
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
          <button className="btn-primary" disabled={players.length >= MAX_PLAYERS} onClick={() => setPicking(true)}>
            ＋ Ajouter des joueurs
          </button>
          <ol className="setup-list">
            {players.map((p, i) => {
              const team = setup.teamOf[p.id] ?? 0;
              return (
                <li key={p.id}>
                  <span className="setup-pos">{i + 1}</span>
                  {profileOf(p.id) && <Avatar avatar={profileOf(p.id)!.avatar} color={profileOf(p.id)!.color} size={44} />}
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
        <button className="btn-gold" disabled={!config} onClick={() => onStart(setup, buildConfig(setup))}>
          Lancer la partie
        </button>
      </footer>

      {picking && !creating && (
        <PlayerPicker
          profiles={profiles}
          selected={players.map((p) => p.id)}
          remaining={MAX_PLAYERS - players.length}
          onAdd={addPlayer}
          onNew={() => setCreating(newProfile())}
          onClose={() => setPicking(false)}
        />
      )}
      {creating && (
        <ProfileEditor
          title="Nouveau joueur"
          initial={creating}
          takenNames={profiles.filter((p) => !p.deleted).map((p) => p.name)}
          onCancel={() => setCreating(null)}
          onSave={(profile) => {
            onSaveProfile(profile);
            addPlayer(profile);
            setCreating(null);
          }}
        />
      )}
    </div>
  );
}
