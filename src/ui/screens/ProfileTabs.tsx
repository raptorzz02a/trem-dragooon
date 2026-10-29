import { useState } from 'react';
import {
  comparePeriods,
  progression,
  scoreProfile,
  scoreRecords,
  VOLLEY_UNIT,
  x01Closure,
  type Granularity,
  type ScoredMode,
} from '../../profiles/scores';
import { x01Stats, type PlayerGame, type StatsFilter } from '../../profiles/stats';
import type { GameRecord } from '../../profiles/types';
import type { AppSettings } from '../../settings/settings';
import { ColumnChart, DataTable, LineChart, MeterBar } from '../components/Charts';
import { dateTime, ND, num, pct, plural, withUnit } from '../format';
import { Segmented } from './Profile';

// Onglets « Scores » et « Progression » de la fiche joueur, et cartes de records du résumé.

const MODE_NAMES: Record<ScoredMode, string> = {
  x01: '301/501/701',
  cricket: 'Cricket',
  shanghai: 'Shanghai',
};

function Tile({ value, label, detail }: { value: string; label: string; detail?: string }) {
  return (
    <div className="tile">
      <span className={`tile-value ${value === ND ? 'nd' : ''}`}>{value}</span>
      <span className="tile-label">{label}</span>
      {detail && <span className="tile-detail">{detail}</span>}
    </div>
  );
}

/** Cartes de records : meilleure volée, meilleure moyenne sur une partie, plus grand checkout. */
export function RecordCards({ games, modes }: { games: PlayerGame[]; modes: ScoredMode[] }) {
  const cards = modes.flatMap((mode) => {
    const r = scoreRecords(games, mode);
    if (!r.bestVolley) return [];
    const unit = VOLLEY_UNIT[mode];
    const out: {
      key: string;
      title: string;
      value: string;
      when?: string;
      note?: string;
    }[] = [
      {
        key: `${mode}-v`,
        title: `Meilleure volée · ${MODE_NAMES[mode]}`,
        value: withUnit(r.bestVolley.value, unit),
        when: r.bestVolley.endedAt,
      },
      {
        key: `${mode}-a`,
        title: `Meilleure moyenne sur une partie · ${MODE_NAMES[mode]}`,
        value: r.bestGameAverage ? withUnit(r.bestGameAverage.value, unit) : ND,
        when: r.bestGameAverage?.endedAt,
        note: r.bestGameAverage ? `sur ${plural(r.bestGameAverage.volleys, 'volée')}` : 'il faut une partie d’au moins 3 volées',
      },
    ];
    if (mode === 'x01') {
      const best = Math.max(0, ...x01Stats(games).map((s) => s.bestCheckout ?? 0));
      out.push({
        key: 'x01-c',
        title: 'Plus grand checkout',
        value: best ? withUnit(best, unit) : ND,
      });
    }
    return out;
  });
  if (cards.length === 0) return null;
  return (
    <div className="record-cards">
      {cards.map((c) => (
        <div key={c.key} className="record-card">
          <span className="record-title">{c.title}</span>
          <span className={`record-value ${c.value === ND ? 'nd' : ''}`}>{c.value}</span>
          <span className="record-when">{c.note ?? (c.when ? `le ${dateTime(c.when).slice(0, 10)}` : '')}</span>
        </div>
      ))}
    </div>
  );
}

/** Choix du mode pour les onglets qui ont besoin d'un score de volée. */
export function ScoredModePicker({
  value,
  available,
  onChange,
}: {
  value: ScoredMode;
  available: ScoredMode[];
  onChange: (m: ScoredMode) => void;
}) {
  return (
    <Segmented
      value={value}
      options={(['x01', 'cricket', 'shanghai'] as const)
        .filter((m) => available.includes(m) || m === value)
        .map((m) => ({ value: m, label: MODE_NAMES[m] }))}
      onChange={onChange}
    />
  );
}

export function ScoresTab(props: {
  games: PlayerGame[];
  mode: ScoredMode;
  settings: AppSettings;
  onEditThresholds: () => void;
  onStep: (step: number) => void;
}) {
  const { games, mode, settings } = props;
  const unit = VOLLEY_UNIT[mode];
  const cricket = mode === 'cricket';
  const thresholds = cricket ? [3, 5, 7] : settings.statThresholds;
  const p = scoreProfile(games, mode, thresholds, settings.histogramStep);
  const closure = mode === 'x01' ? x01Closure(games) : [];
  const closed = closure.filter((c) => c.wins > 0);
  const unclosed = closure.filter((c) => c.wins === 0).map((c) => c.variant);
  if (p.volleys === 0) return <div className="lib-empty">Aucune volée en {MODE_NAMES[mode]} pour ces filtres.</div>;
  return (
    <div className="scores-tab">
      <div className="scores-col">
        <div className="tiles tiles-3">
          <Tile
            value={withUnit(p.average, unit)}
            label="Moyenne par volée"
            detail={`sur ${plural(p.volleys, 'volée')} · ${plural(p.games, 'partie')}`}
          />
          <Tile
            value={p.stdDev === null ? ND : `± ${num(p.stdDev)}`}
            label={`Régularité (écart type, en ${unit.many})`}
            detail="plus c'est petit, plus les volées se ressemblent"
          />
          <Tile
            value={withUnit(p.best, unit)}
            label="Meilleure volée"
            detail={p.best === null ? undefined : p.bestCount > 1 ? `réalisée ${p.bestCount} fois` : 'réalisée 1 fois'}
          />
        </div>
        <section className="stat-card">
          <div className="card-head">
            <h3>Volées au-dessus des seuils</h3>
            {!cricket && (
              <button className="small" onClick={props.onEditThresholds}>
                Modifier les seuils
              </button>
            )}
          </div>
          <div className="meters">
            {p.thresholds.map((t) => (
              <MeterBar
                key={t.threshold}
                label={`${withUnit(t.threshold, unit)} ou plus`}
                share={t.share}
                detail={`${t.count} volée${t.count > 1 ? 's' : ''} sur ${p.volleys}`}
              />
            ))}
          </div>
        </section>
        {closure.length > 0 && (
          <section className="stat-card">
            <h3>Clôture des parties gagnées</h3>
            {closed.length > 0 && (
              <table className="compare-table closure-table">
                <thead>
                  <tr>
                    <th />
                    <th>Victoires</th>
                    <th>Volées (moy.)</th>
                    <th>Fléchettes (moy.)</th>
                    <th>Plus rapide</th>
                  </tr>
                </thead>
                <tbody>
                  {closed.map((c) => (
                    <tr key={c.variant}>
                      <td>{c.variant}</td>
                      <td>{c.wins}</td>
                      <td>{num(c.avgVolleys)}</td>
                      <td>{num(c.avgDarts)}</td>
                      <td>{c.bestDarts === null ? ND : plural(c.bestDarts, 'fl.', 'fl.')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <div className="tile-detail">
              Victoires en individuel seulement : en équipe, la fin dépend aussi des partenaires.
              {unclosed.length > 0 && ` Pas encore de victoire en ${unclosed.join(', ')}.`}
            </div>
          </section>
        )}
      </div>
      <section className="stat-card scores-col">
        <div className="card-head">
          <h3>Répartition des volées</h3>
          {!cricket && (
            <Segmented
              value={String(settings.histogramStep)}
              options={['10', '20', '30'].map((v) => ({
                value: v,
                label: `par ${v}`,
              }))}
              onChange={(v) => props.onStep(Number(v))}
            />
          )}
        </div>
        <ColumnChart
          title={`Nombre de volées par tranche de ${unit.many}`}
          unit={cricket ? 'nombre de volées' : `nombre de volées, tranches de ${settings.histogramStep} ${unit.many}`}
          columns={p.histogram.map((b) => ({
            label: cricket ? String(b.from) : `${b.from}`,
            value: b.count,
            tip: `${cricket ? withUnit(b.from, unit) : `${b.from} à ${b.to} ${unit.many}`} : ${plural(b.count, 'volée')} (${pct(b.share)})`,
          }))}
        />
        <DataTable
          head={['Tranche', 'Volées', 'Part']}
          rows={p.histogram.map((b) => [cricket ? withUnit(b.from, unit) : `${b.from} – ${b.to}`, b.count, pct(b.share)])}
        />
      </section>
    </div>
  );
}

const GRANULARITY: { value: Granularity; label: string }[] = [
  { value: 'week', label: 'Semaine' },
  { value: 'month', label: 'Mois' },
  { value: 'year', label: 'Année' },
];

function bucketLabel(d: Date, g: Granularity, long = false): string {
  if (g === 'year') return String(d.getFullYear());
  if (g === 'month')
    return d.toLocaleDateString('fr-FR', {
      month: long ? 'long' : 'short',
      year: long ? 'numeric' : '2-digit',
    });
  return long ? `semaine du ${d.toLocaleDateString('fr-FR')}` : d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
}

function signed(v: number | null, digits = 1, suffix = ''): string {
  if (v === null) return ND;
  const s = v.toLocaleString('fr-FR', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
  return `${v > 0 ? '+' : ''}${s}${suffix}`;
}

export function ProgressionTab(props: {
  games: PlayerGame[];
  records: GameRecord[];
  playerId: string;
  mode: ScoredMode;
  filter: StatsFilter;
}) {
  const { games, mode } = props;
  const [granularity, setGranularity] = useState<Granularity>('month');
  const unit = VOLLEY_UNIT[mode];
  const pts = progression(games, mode, granularity);
  const from = props.filter.from ?? new Date(Date.now() - 30 * 86400000).toISOString();
  const to = props.filter.to ?? new Date().toISOString();
  const cmp = comparePeriods(props.records, props.playerId, {
    ...props.filter,
    mode,
    from,
    to,
  });
  const span = Math.round((Date.parse(to) - Date.parse(from)) / 86400000);
  const rows: { label: string; cur: string; prev: string; delta: string }[] = [
    {
      label: 'Parties terminées',
      cur: String(cmp.current.games),
      prev: String(cmp.previous.games),
      delta: signed(cmp.current.games - cmp.previous.games, 0),
    },
    {
      label: 'Victoires',
      cur: String(cmp.current.wins),
      prev: String(cmp.previous.wins),
      delta: signed(cmp.current.wins - cmp.previous.wins, 0),
    },
    {
      label: 'Taux de victoire',
      cur: pct(cmp.current.winRate),
      prev: pct(cmp.previous.winRate),
      delta:
        cmp.current.winRate !== null && cmp.previous.winRate !== null
          ? signed(
              cmp.current.winRate - cmp.previous.winRate,
              0,
              Math.abs(Math.round(cmp.current.winRate - cmp.previous.winRate)) < 2 ? ' pt' : ' pts',
            )
          : ND,
    },
    {
      label: `Moyenne par volée (${unit.many})`,
      cur: num(cmp.current.average),
      prev: num(cmp.previous.average),
      delta: cmp.averageDelta === null ? ND : `${signed(cmp.averageDelta)} (${signed(cmp.averageDeltaPct, 0, ' %')})`,
    },
    {
      label: `Meilleure volée (${unit.many})`,
      cur: cmp.current.best === null ? ND : String(cmp.current.best),
      prev: cmp.previous.best === null ? ND : String(cmp.previous.best),
      delta: cmp.current.best !== null && cmp.previous.best !== null ? signed(cmp.current.best - cmp.previous.best, 0) : ND,
    },
  ];
  return (
    <div className="scores-tab">
      <section className="stat-card scores-col">
        <div className="card-head">
          <h3>Moyenne par volée, en {unit.many}</h3>
          <Segmented value={granularity} options={GRANULARITY} onChange={setGranularity} />
        </div>
        {pts.length === 0 ? (
          <div className="tile-label">Aucune volée en {MODE_NAMES[mode]} pour ces filtres.</div>
        ) : (
          <>
            <LineChart
              title={`Moyenne par volée par ${GRANULARITY.find((g) => g.value === granularity)!.label.toLowerCase()}`}
              digits={mode === 'cricket' ? 2 : 1}
              points={pts.map((p) => ({
                label: bucketLabel(p.start, granularity),
                value: p.average,
                tip: `${bucketLabel(p.start, granularity, true)} : ${withUnit(p.average, unit)} par volée · ${plural(p.games, 'partie')}, ${plural(p.volleys, 'volée')}`,
              }))}
            />
            <DataTable
              head={['Période', 'Parties', 'Volées', 'Moyenne', 'Évolution']}
              rows={pts.map((p, i) => [
                bucketLabel(p.start, granularity, true),
                p.games,
                p.volleys,
                num(p.average, mode === 'cricket' ? 2 : 1),
                i === 0 ? '' : signed(p.average - pts[i - 1]!.average),
              ])}
            />
          </>
        )}
      </section>
      <section className="stat-card scores-col">
        <h3>Période actuelle et précédente</h3>
        <div className="tile-detail">
          {props.filter.from ? '' : 'Aucune période choisie : comparaison des 30 derniers jours. '}
          {span} jours, du {new Date(from).toLocaleDateString('fr-FR')} au {new Date(to).toLocaleDateString('fr-FR')}, contre les {span}{' '}
          jours d’avant.
        </div>
        <table className="compare-table">
          <thead>
            <tr>
              <th />
              <th>Actuelle</th>
              <th>Précédente</th>
              <th>Évolution</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label}>
                <td>{r.label}</td>
                <td>{r.cur}</td>
                <td>{r.prev}</td>
                <td className={r.delta.startsWith('+') ? 'up' : r.delta.startsWith('-') ? 'down' : ''}>{r.delta}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {cmp.averageDeltaPct !== null && Math.round(cmp.averageDeltaPct) !== 0 && (
          <div className="compare-summary">
            Moyenne {cmp.averageDeltaPct > 0 ? 'en hausse' : 'en baisse'} de {num(Math.abs(cmp.averageDeltaPct), 0)} % par rapport à la
            période précédente.
          </div>
        )}
      </section>
    </div>
  );
}
