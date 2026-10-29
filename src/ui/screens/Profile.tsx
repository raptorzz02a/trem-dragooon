import { useMemo, useState } from 'react';
import { computeState } from '../../game-engine/engine';
import type { GameMode } from '../../game-engine/types';
import {
  clockStats,
  cricketStats,
  favouriteHits,
  playerGames,
  randomStats,
  summary,
  x01Stats,
  type PlayerGame,
  type StatsFilter,
} from '../../profiles/stats';
import type { GameRecord, Profile as ProfileData } from '../../profiles/types';
import { Avatar } from '../components/Avatar';
import { ProfileEditor } from '../components/ProfileEditor';
import { dateTime, duration, ND, num, pct } from '../format';
import { MODE_VIEWS } from '../modes';
import { MODES } from '../../game-setup/setup';
import { playerCsv } from '../../profiles/export';
import { isScoredMode, type ScoredMode } from '../../profiles/scores';
import type { AppSettings } from '../../settings/settings';
import { MeterBar } from '../components/Charts';
import { ALL_TIME, PeriodFilter, periodRange, type Period } from '../components/PeriodFilter';
import { ProgressionTab, RecordCards, ScoredModePicker, ScoresTab } from './ProfileTabs';
import './Library.css';

type ModeFilter = GameMode | 'all';

export const MODE_FILTERS: { value: ModeFilter; label: string }[] = [
  { value: 'all', label: 'Tous' },
  { value: 'x01', label: '301/501/701' },
  { value: 'cricket', label: 'Cricket' },
  { value: 'clock', label: 'Horloge' },
  { value: 'random', label: 'Chiffre aléatoire' },
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

/** Seuils de volée suivis (part des volées au moins égales), de 1 à 180. */
function ThresholdsDialog({ values, onSave, onCancel }: { values: number[]; onSave: (v: number[]) => void; onCancel: () => void }) {
  const [draft, setDraft] = useState(values.map(String));
  const parsed = draft.map((v) => Number(v));
  const valid = parsed.every((v) => Number.isInteger(v) && v >= 1 && v <= 180);
  return (
    <div className="overlay">
      <div className="dialog">
        <strong>Seuils de volée suivis</strong>
        <span className="tile-label">Pour chaque seuil, la fiche montre la part des volées qui l’atteignent (de 1 à 180 points).</span>
        <div className="threshold-inputs">
          {draft.map((v, i) => (
            <input
              key={i}
              type="number"
              inputMode="numeric"
              min={1}
              max={180}
              value={v}
              onChange={(e) => setDraft(draft.map((x, j) => (j === i ? e.target.value : x)))}
            />
          ))}
        </div>
        <div className="dialog-actions">
          <button onClick={() => setDraft(['60', '100', '140'])}>Valeurs par défaut</button>
          <button onClick={onCancel}>Annuler</button>
          <button className="btn-gold" disabled={!valid} onClick={() => onSave([...new Set(parsed)].sort((a, b) => a - b))}>
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
}

function ModeCards({ games }: { games: PlayerGame[] }) {
  const cricket = cricketStats(games);
  const clock = clockStats(games);
  const random = randomStats(games);
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
            <Stat label="Meilleure volée" value={s.bestVolley ?? ND} />
            <Stat label="Meilleure finition" value={s.bestCheckout ?? ND} />
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
      {random.games > 0 && (
        <section className="stat-card">
          <h3>Chiffre aléatoire · {random.games} partie{random.games > 1 ? 's' : ''}</h3>
          <dl>
            <Stat label="Meilleur score" value={random.bestScore ?? ND} />
            <Stat label="Score moyen" value={num(random.avgScore, 0)} />
            <Stat label="Meilleure volée" value={random.bestVolley ?? ND} />
            <Stat label="Fléchettes sur le numéro" value={pct(random.hitRate)} />
            <Stat label="Points sur le Bull" value={random.bullRounds ? random.bullPoints : ND} />
            <Stat label="Durée moyenne" value={duration(random.avgDurationMs)} />
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
      if (!MODES.includes(c.mode)) return false; // jeu retiré (ancien Shanghai)
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
  settings: AppSettings;
  onSettings: (patch: Partial<AppSettings>) => void;
  onSave: (profile: ProfileData) => void;
  onDelete: (id: string) => void;
  onBack: () => void;
  /** Fiche d'un autre joueur (en ligne) : ni modification ni suppression. */
  readOnly?: boolean;
  backLabel?: string;
}

type Tab = 'summary' | 'scores' | 'progress' | 'history';

const TABS: { value: Tab; label: string }[] = [
  { value: 'summary', label: 'Résumé' },
  { value: 'scores', label: 'Scores' },
  { value: 'progress', label: 'Progression' },
  { value: 'history', label: 'Historique' },
];

function download(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function Profile({ profile, profiles, games, settings, onSettings, onSave, onDelete, onBack, readOnly = false, backLabel = '← Joueurs' }: Props) {
  const [tab, setTab] = useState<Tab>('summary');
  const [mode, setMode] = useState<ModeFilter>('all');
  const [format, setFormat] = useState<NonNullable<StatsFilter['format']>>('all');
  const [period, setPeriod] = useState<Period>(ALL_TIME);
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editThresholds, setEditThresholds] = useState(false);
  const range = periodRange(period);
  const filter: StatsFilter = { mode: mode === 'all' ? undefined : mode, format, ...range };
  const list = useMemo(() => playerGames(games, profile.id, filter), [games, profile.id, mode, format, range.from, range.to]);
  const s = summary(list);
  const fav = favouriteHits(list);
  // Modes à score joués sur la période, du plus joué au moins joué : le premier sert par défaut aux onglets de score.
  const played = (['x01', 'cricket', 'random'] as const)
    .map((m) => ({ m, n: list.filter((g) => g.state.config.mode === m).length }))
    .filter((x) => x.n > 0)
    .sort((a, b) => b.n - a.n)
    .map((x) => x.m);
  const [scoredChoice, setScoredChoice] = useState<ScoredMode | null>(null);
  const scored: ScoredMode | null = isScoredMode(filter.mode) ? filter.mode : scoredChoice && played.includes(scoredChoice) ? scoredChoice : played[0] ?? null;
  const pickScored = (m: ScoredMode) => (mode === 'all' ? setScoredChoice(m) : setMode(m));

  return (
    <div className="screen library profile-screen">
      <header className="profile-head">
        <button onClick={onBack}>{backLabel}</button>
        <Avatar avatar={profile.avatar} color={profile.color} size={60} />
        <h2>{profile.name}</h2>
        <button className="no-print" onClick={() => download(`${profile.name}-volees.csv`, playerCsv(list), 'text/csv;charset=utf-8')}>
          Exporter CSV
        </button>
        <button className="no-print" onClick={() => window.print()}>
          Imprimer / PDF
        </button>
        {!readOnly && (
          <>
            <button className="no-print" onClick={() => setEditing(true)}>
              Modifier
            </button>
            <button className="btn-danger no-print" onClick={() => setConfirmDelete(true)}>
              Supprimer
            </button>
          </>
        )}
      </header>

      <div className="lib-filters no-print">
        <Segmented value={tab} options={TABS} onChange={setTab} />
        <Segmented value={format} options={FORMAT_FILTERS} onChange={setFormat} />
      </div>
      <div className="lib-filters no-print">
        <Segmented value={mode} options={MODE_FILTERS} onChange={setMode} />
        <PeriodFilter value={period} onChange={setPeriod} />
      </div>
      <div className="print-only">
        {TABS.find((t) => t.value === tab)!.label} ·{' '}
        {MODE_FILTERS.find((m) => m.value === ((tab === 'scores' || tab === 'progress') && mode === 'all' && scored ? scored : mode))!.label} ·{' '}
        {range.from ? `du ${new Date(range.from).toLocaleDateString('fr-FR')} au ${new Date(range.to!).toLocaleDateString('fr-FR')}` : 'tout l’historique'}
      </div>

      <div className="profile-content">
        {tab === 'summary' && (
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
                  <span className="tile-value">{s.losses}</span>
                  <span className="tile-label">Défaites</span>
                </div>
                <div className="tile">
                  <span className={`tile-value ${s.winRate === null ? 'nd' : ''}`}>{pct(s.winRate)}</span>
                  <span className="tile-label">Taux de victoire</span>
                </div>
              </div>
              <MeterBar
                label="Taux de victoire"
                share={s.winRate}
                detail={`${s.wins} victoire${s.wins > 1 ? 's' : ''} sur ${s.competitive} partie${s.competitive > 1 ? 's' : ''} hors entraînement`}
              />
              {s.played > s.competitive && (
                <div className="tile-label">
                  Dont {s.played - s.competitive} partie(s) d’entraînement, comptées dans les statistiques mais pas dans les victoires.
                </div>
              )}
              <RecordCards games={list} modes={isScoredMode(filter.mode) ? [filter.mode] : played} />
            </div>
            <div className="profile-stats">
              <ModeCards games={list} />
              {(fav.triple || fav.single) && (
                <section className="stat-card">
                  <h3>Numéros les plus touchés</h3>
                  <dl>
                    <Stat label="Triple" value={fav.triple ? `T${fav.triple.segment} · ${pct(fav.triple.share)} des triples` : ND} />
                    <Stat label="Simple" value={fav.single ? `S${fav.single.segment} · ${pct(fav.single.share)} des simples` : ND} />
                  </dl>
                  <div className="tile-detail">D’après les fléchettes saisies zone par zone (hors Horloge). Ne dit rien de la cible visée.</div>
                </section>
              )}
              {list.length === 0 && <div className="lib-empty">Aucune partie terminée pour ces filtres.</div>}
            </div>
          </div>
        )}

        {(tab === 'scores' || tab === 'progress') && (
          <>
            {mode === 'clock' ? (
              <div className="lib-empty">
                Non disponible pour l’Horloge : on n’y note que Touché ou Raté, sans score de volée. Les records d’Horloge sont dans le Résumé.
              </div>
            ) : scored === null ? (
              <div className="lib-empty">Aucune partie de 301/501/701, Cricket ou Chiffre aléatoire pour ces filtres.</div>
            ) : (
              <>
                {mode === 'all' && (
                  <div className="lib-filters no-print">
                    <span className="label">Mode affiché</span>
                    <ScoredModePicker value={scored} available={played} onChange={pickScored} />
                  </div>
                )}
                {tab === 'scores' ? (
                  <ScoresTab
                    games={list}
                    mode={scored}
                    settings={settings}
                    onEditThresholds={() => setEditThresholds(true)}
                    onStep={(histogramStep) => onSettings({ histogramStep })}
                  />
                ) : (
                  <ProgressionTab games={list} records={games} playerId={profile.id} mode={scored} filter={filter} />
                )}
              </>
            )}
          </>
        )}

        {tab === 'history' && (
          <div className="profile-history">
            <History records={games} playerId={profile.id} filter={filter} />
          </div>
        )}
      </div>

      {editThresholds && (
        <ThresholdsDialog
          values={settings.statThresholds}
          onCancel={() => setEditThresholds(false)}
          onSave={(statThresholds) => {
            onSettings({ statThresholds });
            setEditThresholds(false);
          }}
        />
      )}
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
