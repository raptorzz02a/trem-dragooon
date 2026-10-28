import { useMemo, useState } from 'react';
import { computeState } from '../../game-engine/engine';
import type { GameMode } from '../../game-engine/types';
import {
  clockStats,
  cricketStats,
  favouriteHits,
  playerGames,
  shanghaiStats,
  summary,
  x01Stats,
  type PlayerGame,
  type StatsFilter,
} from '../../profiles/stats';
import type { GameRecord, Profile as ProfileData } from '../../profiles/types';
import { Avatar } from '../components/Avatar';
import { ProfileEditor } from '../components/ProfileEditor';
import { dateTime, duration, num, pct } from '../format';
import { MODE_VIEWS } from '../modes';
import './Library.css';

type ModeFilter = GameMode | 'all';

export const MODE_FILTERS: { value: ModeFilter; label: string }[] = [
  { value: 'all', label: 'Tous' },
  { value: 'x01', label: '301/501/701' },
  { value: 'cricket', label: 'Cricket' },
  { value: 'clock', label: 'Horloge' },
  { value: 'shanghai', label: 'Shanghai' },
];

export const FORMAT_FILTERS: { value: NonNullable<StatsFilter['format']>; label: string }[] = [
  { value: 'all', label: 'Tout' },
  { value: 'solo', label: 'Individuel' },
  { value: 'team', label: 'Équipes' },
];

export function Segmented<T extends string>(props: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="segmented">
      {props.options.map((o) => (
        <button key={o.value} className={props.value === o.value ? 'selected' : ''} onClick={() => props.onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function ModeCards({ games }: { games: PlayerGame[] }) {
  const cricket = cricketStats(games);
  const clock = clockStats(games);
  const shanghai = shanghaiStats(games);
  return (
    <>
      {x01Stats(games).map((s) => (
        <section key={s.variant} className="stat-card">
          <h3>
            {s.variant} · {s.games} partie{s.games > 1 ? 's' : ''}
          </h3>
          <dl>
            <Stat label="Moyenne par volée" value={num(s.avgVolley)} />
            <Stat label="Moyenne par fléchette" value={num(s.avgDart)} />
            <Stat label="Réussite aux doubles" value={pct(s.doubleRate)} />
            <Stat label="Meilleure volée" value={s.bestVolley ?? '–'} />
            <Stat label="Meilleure finition" value={s.bestCheckout ?? '–'} />
            <Stat label="Busts" value={s.busts} />
            <Stat label="Volées 100+" value={s.over100} />
            <Stat label="Volées 140+" value={s.over140} />
            <Stat label="180" value={s.max180} />
          </dl>
        </section>
      ))}
      {cricket.games > 0 && (
        <section className="stat-card">
          <h3>Cricket · {cricket.games} partie{cricket.games > 1 ? 's' : ''}</h3>
          <dl>
            <Stat label="Marques par volée" value={num(cricket.mpr, 2)} />
            <Stat label="Marques" value={cricket.marks} />
            <Stat label="Durée moyenne" value={duration(cricket.avgDurationMs)} />
          </dl>
        </section>
      )}
      {clock.games > 0 && (
        <section className="stat-card">
          <h3>Horloge · {clock.games} partie{clock.games > 1 ? 's' : ''}</h3>
          <dl>
            <Stat label="Parcours terminés" value={clock.completions} />
            <Stat label="Durée moyenne" value={duration(clock.avgDurationMs)} />
            {clock.best.map((b) => (
              <Stat key={b.variant} label={`Record · ${b.variant}`} value={`${b.darts} fléchettes`} />
            ))}
          </dl>
        </section>
      )}
      {shanghai.games > 0 && (
        <section className="stat-card">
          <h3>Shanghai · {shanghai.games} partie{shanghai.games > 1 ? 's' : ''}</h3>
          <dl>
            <Stat label="Meilleur score" value={shanghai.bestScore ?? '–'} />
            <Stat label="Score moyen" value={num(shanghai.avgScore, 0)} />
            <Stat label="Meilleure volée" value={shanghai.bestVolley ?? '–'} />
            <Stat label="Shanghai réussis" value={shanghai.shanghais} />
            <Stat label="Durée moyenne" value={duration(shanghai.avgDurationMs)} />
          </dl>
        </section>
      )}
    </>
  );
}

/** Historique : toutes les parties du joueur, abandonnées comprises. */
function History({ records, playerId, filter }: { records: GameRecord[]; playerId: string; filter: StatsFilter }) {
  const rows = records
    .filter((r) => {
      const c = r.session.config;
      if (!c.sides.some((s) => s.playerIds.includes(playerId))) return false;
      if (r.session.status !== 'finished' && r.session.status !== 'abandoned') return false;
      if (filter.mode && c.mode !== filter.mode) return false;
      if (filter.format === 'solo' && c.teamMode) return false;
      if (filter.format === 'team' && !c.teamMode) return false;
      return true;
    })
    .sort((a, b) => ((a.session.endedAt ?? a.session.createdAt) < (b.session.endedAt ?? b.session.createdAt) ? 1 : -1))
    .slice(0, 60);
  if (rows.length === 0) return <div className="tile-label">Aucune partie.</div>;
  return (
    <ol className="history-list">
      {rows.map((r) => {
        const { config } = r.session;
        const state = computeState(config, r.session.events);
        const side = config.sides.findIndex((s) => s.playerIds.includes(playerId));
        const nameOf = (id: string) => r.players.find((p) => p.id === id)?.name ?? '?';
        const sideName = (i: number) => (config.teamMode ? config.sides[i]!.name : nameOf(config.sides[i]!.playerIds[0]!));
        const title = MODE_VIEWS[config.mode].title({ state, nameOf, sideName });
        let result = { text: 'Abandonnée', cls: 'muted' };
        if (r.session.status === 'finished') {
          const rank = state.ranking.find((e) => e.sideIndex === side)?.rank ?? 0;
          if (config.training) result = { text: 'Entraînement', cls: 'muted' };
          else if (state.winners.includes(side)) result = { text: 'Victoire', cls: 'win' };
          else result = { text: `${rank}e sur ${config.sides.length}`, cls: '' };
        }
        const others = config.sides.flatMap((s) => s.playerIds).filter((id) => id !== playerId).map(nameOf);
        const team = config.teamMode ? `${config.sides[side]!.name} · ` : '';
        return (
          <li key={r.id}>
            <span className="history-mode">{title}</span>
            <span className={`history-result ${result.cls}`}>{result.text}</span>
            <span className="history-meta">
              {dateTime(r.session.endedAt ?? r.session.createdAt)} · {team}
              {others.length ? `avec ${others.join(', ')}` : 'seul'}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

interface Props {
  profile: ProfileData;
  profiles: ProfileData[];
  games: GameRecord[];
  onSave: (profile: ProfileData) => void;
  onDelete: (id: string) => void;
  onBack: () => void;
}

export function Profile({ profile, profiles, games, onSave, onDelete, onBack }: Props) {
  const [mode, setMode] = useState<ModeFilter>('all');
  const [format, setFormat] = useState<NonNullable<StatsFilter['format']>>('all');
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const filter: StatsFilter = { mode: mode === 'all' ? undefined : mode, format };
  const list = useMemo(() => playerGames(games, profile.id, filter), [games, profile.id, mode, format]);
  const s = summary(list);
  const fav = favouriteHits(list);

  return (
    <div className="screen library">
      <header className="profile-head">
        <button onClick={onBack}>← Joueurs</button>
        <Avatar avatar={profile.avatar} color={profile.color} size={84} />
        <h2>{profile.name}</h2>
        <button onClick={() => setEditing(true)}>Modifier</button>
        <button className="btn-danger" onClick={() => setConfirmDelete(true)}>
          Supprimer
        </button>
      </header>

      <div className="lib-filters">
        <Segmented value={mode} options={MODE_FILTERS} onChange={setMode} />
        <Segmented value={format} options={FORMAT_FILTERS} onChange={setFormat} />
      </div>

      <div className="profile-body">
        <div className="profile-stats">
          <div className="tiles">
            <div className="tile">
              <span className="tile-value">{s.played}</span>
              <span className="tile-label">Parties terminées</span>
            </div>
            <div className="tile">
              <span className="tile-value">{s.wins}</span>
              <span className="tile-label">
                Victoires ({s.soloWins} solo · {s.teamWins} équipe)
              </span>
            </div>
            <div className="tile">
              <span className="tile-value">{pct(s.winRate)}</span>
              <span className="tile-label">Taux de victoire</span>
            </div>
            <div className="tile">
              <span className="tile-value">
                {fav.triple ? `T${fav.triple.segment}` : '–'}
                {fav.single && <span className="tile-label"> · S{fav.single.segment}</span>}
              </span>
              <span className="tile-label">
                Triple {fav.triple ? pct(fav.triple.share) : '–'} · simple {fav.single ? pct(fav.single.share) : '–'}
              </span>
            </div>
          </div>
          {s.played > s.competitive && (
            <div className="tile-label">
              Dont {s.played - s.competitive} partie(s) d’entraînement, comptées dans les statistiques mais pas dans les victoires.
            </div>
          )}
          <ModeCards games={list} />
        </div>
        <div className="profile-history">
          <div className="label">Historique</div>
          <History records={games} playerId={profile.id} filter={filter} />
        </div>
      </div>

      {editing && (
        <ProfileEditor
          title="Modifier le joueur"
          initial={profile}
          takenNames={profiles.filter((p) => !p.deleted && p.id !== profile.id).map((p) => p.name)}
          onCancel={() => setEditing(false)}
          onSave={(p) => {
            onSave(p);
            setEditing(false);
          }}
        />
      )}
      {confirmDelete && (
        <div className="overlay">
          <div className="dialog">
            <strong>Supprimer {profile.name} ?</strong>
            <span className="tile-label" style={{ fontSize: 18, maxWidth: 560 }}>
              Son nom et son avatar seront effacés. Ses parties restent dans l’historique des autres joueurs, sous le nom
              « Joueur supprimé ». Cette action est définitive.
            </span>
            <div className="dialog-actions">
              <button onClick={() => setConfirmDelete(false)}>Annuler</button>
              <button
                className="btn-danger"
                onClick={() => {
                  onDelete(profile.id);
                  onBack();
                }}
              >
                Supprimer définitivement
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
