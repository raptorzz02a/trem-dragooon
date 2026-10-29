import { useMemo, useState } from 'react';
import type { GameMode } from '../../game-engine/types';
import { isScoredMode, scoreRankings, VOLLEY_UNIT, type RankingSort, type ScoreRankingRow } from '../../profiles/scores';
import { MIN_RANKED_GAMES, type StatsFilter } from '../../profiles/stats';
import type { GameRecord, Profile } from '../../profiles/types';
import { Avatar } from '../components/Avatar';
import { ALL_TIME, PeriodFilter, periodRange, type Period } from '../components/PeriodFilter';
import { ND, num, pct } from '../format';
import { FORMAT_FILTERS, MODE_FILTERS, Segmented } from './Profile';
import './Library.css';

const KEY_LABEL: Record<GameMode, string> = {
  x01: 'Moy. volée',
  cricket: 'Marques/volée',
  clock: 'Record (fl.)',
  shanghai: 'Meilleur score',
};

const SORTS: { value: RankingSort; label: string }[] = [
  { value: 'winRate', label: 'Victoires' },
  { value: 'average', label: 'Moyenne' },
  { value: 'bestVolley', label: 'Record de volée' },
  { value: 'progression', label: 'Progression' },
];

interface Props {
  profiles: Profile[];
  games: GameRecord[];
  onOpen: (id: string) => void;
  onBack: () => void;
  /** Titre et bouton retour (classements des joueurs en ligne). */
  title?: string;
  backLabel?: string;
}

export function Rankings({ profiles, games, onOpen, onBack, title = 'Classements', backLabel = '← Accueil' }: Props) {
  const [mode, setMode] = useState<GameMode | 'all'>('all');
  const [period, setPeriod] = useState<Period>(ALL_TIME);
  const [format, setFormat] = useState<NonNullable<StatsFilter['format']>>('all');
  const [sortChoice, setSort] = useState<RankingSort>('winRate');
  const scored = isScoredMode(mode === 'all' ? undefined : mode);
  // Moyenne, record et progression n'ont de sens que pour un mode à score.
  const sort: RankingSort = scored ? sortChoice : 'winRate';
  const range = periodRange(period);
  const { ranked, unranked } = useMemo(
    () => scoreRankings(games, profiles, { mode: mode === 'all' ? undefined : mode, format, ...range }, sort),
    [games, profiles, mode, range.from, range.to, format, sort],
  );
  const profileOf = (id: string) => profiles.find((p) => p.id === id)!;
  const unit = mode !== 'all' && isScoredMode(mode) ? VOLLEY_UNIT[mode].many : '';
  const digits = mode === 'cricket' ? 2 : 1;

  const sortValue = (r: ScoreRankingRow): string => {
    if (sort === 'average') return num(r.average, digits);
    if (sort === 'bestVolley') return r.bestVolley === null ? ND : String(r.bestVolley);
    if (sort === 'progression') {
      if (r.progression === null) return ND;
      const v = r.progression.toLocaleString('fr-FR', { minimumFractionDigits: digits, maximumFractionDigits: digits });
      return r.progression > 0 ? `+${v}` : v;
    }
    return mode === 'all' ? '' : num(r.key, mode === 'cricket' ? 2 : mode === 'x01' ? 1 : 0);
  };
  const lastHead =
    sort === 'average' ? `Moyenne (${unit})` : sort === 'bestVolley' ? `Record (${unit})` : sort === 'progression' ? `Progression (${unit})` : mode === 'all' ? '' : KEY_LABEL[mode];

  const row = (r: ScoreRankingRow, pos: string, unrankedRow = false) => {
    const p = profileOf(r.playerId);
    const v = sortValue(r);
    return (
      <button key={r.playerId} className={`ranking-row${unrankedRow ? ' unranked' : ''}`} onClick={() => onOpen(r.playerId)}>
        <span className="ranking-pos">{pos}</span>
        <Avatar avatar={p.avatar} color={p.color} size={48} />
        <span className="ranking-name">{r.name}</span>
        <span className="ranking-num">{r.games}</span>
        <span className="ranking-num">{r.wins}</span>
        <span className="ranking-num">{pct(r.winRate)}</span>
        <span className={`ranking-num ${v === ND ? 'nd' : ''}`}>{v}</span>
      </button>
    );
  };

  return (
    <div className="screen library rankings-screen">
      <header className="lib-header">
        <button onClick={onBack}>{backLabel}</button>
        <h2>{title}</h2>
      </header>
      <div className="lib-filters">
        <Segmented value={mode} options={MODE_FILTERS} onChange={setMode} />
        <Segmented value={format} options={FORMAT_FILTERS} onChange={setFormat} />
      </div>
      <div className="lib-filters">
        <PeriodFilter value={period} onChange={setPeriod} />
      </div>
      <div className="lib-filters">
        <span className="label">Classer par</span>
        <div className="segmented">
          {SORTS.map((o) => (
            <button
              key={o.value}
              className={sort === o.value ? 'selected' : ''}
              disabled={o.value !== 'winRate' && !scored}
              onClick={() => setSort(o.value)}
            >
              {o.label}
            </button>
          ))}
        </div>
        <span className="tile-label">
          {!scored
            ? 'Choisissez 301/501/701, Cricket ou Shanghai pour classer par moyenne, record ou progression.'
            : sort === 'progression'
              ? range.from
                ? 'Écart de moyenne avec la période précédente de même durée.'
                : 'Choisissez une période pour mesurer la progression.'
              : ''}
        </span>
      </div>

      {ranked.length + unranked.length === 0 ? (
        <div className="lib-empty">Aucune partie terminée pour ces filtres (l’entraînement ne compte pas).</div>
      ) : (
        <div className="ranking-table">
          <div className="ranking-row head">
            <span>#</span>
            <span />
            <span>Joueur</span>
            <span className="ranking-num">Parties</span>
            <span className="ranking-num">Victoires</span>
            <span className="ranking-num">% victoires</span>
            <span className="ranking-num">{lastHead}</span>
          </div>
          {ranked.map((r, i) => row(r, String(i + 1)))}
          {unranked.length > 0 && (
            <>
              <div className="label ranking-sep">Moins de {MIN_RANKED_GAMES} parties : pas encore classés</div>
              {unranked.map((r) => row(r, '–', true))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
