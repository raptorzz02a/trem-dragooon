import type { ReactNode } from 'react';
import { MAX_TEAMS, MIN_TEAMS } from '../../game-engine/engine';
import type { ClockOptions, CricketOptions, RandomOptions, X01Options } from '../../game-engine/types';
import { DEFAULT_SETUP, MODE_NAMES, MODES, TEAM_NOTES, type GameSetup } from '../../game-setup/setup';
import { defaultValues, extraGame, isExtraMode, playersLabel, type ExtraGameDef } from '../../extra-games/catalog';
import { useState } from 'react';
import { GameIcon } from '../components/GameIcon';
import { RulesDialog } from '../components/RulesDialog';
import type { RoomPlace } from '../../online/protocol';
import './Setup.css';

/** Rangée de choix exclusifs. */
export function Choice<T extends string | number | boolean>(props: {
  label: string;
  value: T;
  options: { value: T; label: ReactNode; disabled?: boolean }[];
  onChange: (value: T) => void;
  disabled?: boolean;
}) {
  return (
    <>
      {props.label && <div className="label">{props.label}</div>}
      <div className="segmented">
        {props.options.map((o) => (
          <button
            key={String(o.value)}
            className={props.value === o.value ? 'selected' : ''}
            disabled={props.disabled || o.disabled}
            onClick={() => props.onChange(o.value)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </>
  );
}

type Update = (patch: Partial<GameSetup>) => void;

/** Réglages d'un des « Autres jeux », lus dans sa fiche du catalogue. */
function ExtraRules({ def, setup, update, disabled }: { def: ExtraGameDef; setup: GameSetup; update: Update; disabled: boolean }) {
  const values = setup.extra?.[def.id] ?? defaultValues(def);
  const set = (key: string, value: string | number) =>
    update({ extra: { ...(setup.extra ?? DEFAULT_SETUP.extra), [def.id]: { ...values, [key]: value } } });
  return (
    <>
      {def.settings.map((st) => (
        <Choice
          key={st.key}
          disabled={disabled}
          label={st.label}
          value={values[st.key] ?? st.default}
          options={st.choices.map((c) => ({ value: c.value, label: c.label }))}
          onChange={(v) => set(st.key, v)}
        />
      ))}
    </>
  );
}

function ModeRules({ setup, update, disabled }: { setup: GameSetup; update: Update; disabled: boolean }) {
  if (isExtraMode(setup.mode)) return <ExtraRules def={extraGame(setup.mode)} setup={setup} update={update} disabled={disabled} />;
  switch (setup.mode) {
    case 'x01': {
      const o = setup.x01;
      const set = (p: Partial<X01Options>) => update({ x01: { ...o, ...p } });
      return (
        <>
          <Choice
            disabled={disabled}
            label="Score de départ"
            value={o.startScore}
            options={[301, 501, 701].map((v) => ({ value: v as X01Options['startScore'], label: v }))}
            onChange={(startScore) => set({ startScore })}
          />
          <Choice
            disabled={disabled}
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
            disabled={disabled}
            label="Variante"
            value={o.variant}
            options={[
              { value: 'standard' as const, label: 'Classique' },
              { value: 'cutthroat' as const, label: 'Cut-Throat' },
            ]}
            onChange={(variant) => set({ variant })}
          />
          <Choice
            disabled={disabled}
            label="Bull à fermer"
            value={o.bull}
            options={[
              { value: true, label: 'Avec Bull' },
              { value: false, label: 'Sans Bull' },
            ]}
            onChange={(bull) => set({ bull })}
          />
          <Choice
            disabled={disabled}
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
            disabled={disabled}
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
            disabled={disabled}
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
            disabled={disabled}
            label="Double et triple font avancer de 2 et 3"
            value={o.advanceByMultiplier}
            options={[
              { value: false, label: 'Non' },
              { value: true, label: 'Oui', disabled: o.required !== 'any' },
            ]}
            onChange={(advanceByMultiplier) => set({ advanceByMultiplier })}
          />
          <Choice
            disabled={disabled}
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
    case 'random': {
      const o = setup.random;
      return (
        <Choice
          disabled={disabled}
          label="Nombre de tours"
          value={o.rounds}
          options={[10, 15, 20].map((v) => ({ value: v as RandomOptions['rounds'], label: v }))}
          onChange={(rounds) => update({ random: { ...o, rounds } })}
        />
      );
    }
    case 'training':
      return (
        <div className="setup-note">
          Chaque fléchette rapporte sa valeur, sans bust ni limite. L’hôte termine l’entraînement quand il veut : la partie
          compte dans les statistiques, pas dans les victoires.
        </div>
      );
  }
}

export const PLACE_NAMES: Record<RoomPlace, string> = {
  same: 'Même cible',
  remote: 'En ligne',
};

/**
 * Réglages de la partie dans la salle d'attente. Seul l'hôte les modifie ; les autres les voient en lecture seule.
 * Chaque changement part au serveur, qui le renvoie à tous.
 */
export function SetupPanel(props: {
  setup: GameSetup;
  place: RoomPlace;
  playerCount: number;
  host: boolean;
  onSetup: Update;
  onPlace: (place: RoomPlace) => void;
  onDrawTeams: () => void;
}) {
  const { setup, host } = props;
  const update = props.onSetup;
  const maxTeams = Math.min(MAX_TEAMS, Math.max(MIN_TEAMS, props.playerCount));
  const disabled = !host;

  const extra = isExtraMode(setup.mode) ? extraGame(setup.mode) : null;
  const [rules, setRules] = useState(false);

  return (
    <section className="setup-rules">
      {extra ? (
        <>
          <div className="setup-extra-head">
            <GameIcon def={extra} size={56} />
            <div className="setup-extra-name">
              <strong>{extra.name}</strong>
              <span>
                {playersLabel(extra)} · Même cible uniquement
              </span>
            </div>
            <button onClick={() => setRules(true)}>? Règles</button>
          </div>
          {rules && <RulesDialog def={extra} onClose={() => setRules(false)} />}
        </>
      ) : (
        <>
          <Choice
            disabled={disabled}
            label="Où jouez-vous ?"
            value={props.place}
            options={[
              { value: 'same' as const, label: PLACE_NAMES.same },
              { value: 'remote' as const, label: PLACE_NAMES.remote },
            ]}
            onChange={props.onPlace}
          />
          <div className="setup-note">
            {props.place === 'same'
              ? 'Tout le monde joue sur la même cible : cet appareil saisit les fléchettes de tous.'
              : 'Chacun joue sur sa cible et saisit ses fléchettes sur son téléphone pendant son tour.'}
          </div>

          <Choice
            disabled={disabled}
            label="Jeu"
            value={setup.mode}
            options={MODES.map((m) => ({ value: m, label: m === 'x01' ? '301 · 501 · 701' : MODE_NAMES[m] }))}
            onChange={(mode) => update({ mode })}
          />
        </>
      )}
      <ModeRules setup={setup} update={update} disabled={disabled} />

      {(!extra || extra.teams) && (
        <Choice
          disabled={disabled}
          label="Formule"
          value={setup.teamMode}
          options={[
            { value: false, label: 'Individuel' },
            { value: true, label: 'Équipes' },
          ]}
          onChange={(teamMode) => update({ teamMode })}
        />
      )}
      {setup.teamMode && (
        <>
          <Choice
            disabled={disabled}
            label="Nombre d’équipes"
            value={setup.teamCount}
            options={Array.from({ length: MAX_TEAMS - MIN_TEAMS + 1 }, (_, i) => i + MIN_TEAMS).map((n) => ({
              value: n,
              label: n,
              disabled: n > maxTeams,
            }))}
            onChange={(teamCount) => update({ teamCount })}
          />
          {host && (
            <button className="btn-primary" disabled={props.playerCount < setup.teamCount} onClick={props.onDrawTeams}>
              Tirer les équipes au sort
            </button>
          )}
          <div className="setup-note">{TEAM_NOTES[setup.mode]}</div>
        </>
      )}

      <Choice
        disabled={disabled}
        label="Ordre de passage"
        value={setup.randomizeOrder}
        options={[
          { value: true, label: 'Aléatoire' },
          { value: false, label: 'Ordre de la liste' },
        ]}
        onChange={(randomizeOrder) => update({ randomizeOrder })}
      />
      {extra && host && (
        <button
          className="setup-defaults"
          onClick={() => update({ extra: { ...(setup.extra ?? DEFAULT_SETUP.extra), [extra.id]: defaultValues(extra) }, teamMode: false, randomizeOrder: true })}
        >
          ↺ Règles par défaut
        </button>
      )}
    </section>
  );
}
