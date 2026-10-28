import { useMemo, useState } from 'react';
import type { GameMode } from '../../game-engine/types';
import { MIN_RANKED_GAMES, rankings, type RankingRow, type StatsFilter } from '../../profiles/stats';
import type { GameRecord, Profile } from '../../profiles/types';
import { Avatar } from '../components/Avatar';
import { num, pct } from '../format';
import { FORMAT_FILTERS, MODE_FILTERS, Segmented } from './Profile';
import './Library.css';

type Period = 'all' | 'year' | 'month' | 'week';

const PERIODS: { value: Period; label: string; days: number | null }[] = [
  { value: 'all', label: 'Depuis le début', days: null },
  { value: 'year', label: '12 mois', days: 365 },
  { value: 'month', label: '30 jours', days: 30 },
  { value: 'week', label: '7 jours', days: 7 },
];

const KEY_LABEL: Record<GameMode, string> = {
  x01: 'Moy. volée',
  cricket: 'Marques/volée',
  clock: 'Record (fl.)',
  shanghai: 'Meilleur score',
};

interface Props {
  profiles: Profile[];
  games: GameRecord[];
  onOpen: (id: string) => void;
  onBack: () => void;
}

export function Rankings({ profiles, games, onOpen, onBack }: Props) {
  const [mode, setMode] = useState<GameMode | 'all'>('all');
  const [period, setPeriod] = useState<Period>('all');
  const [format, setFormat] = useState<NonNullable<StatsFilter['format']>>('all');
  const { ranked, unranked } = useMemo(() => {
    const days = PERIODS.find((p) => p.value === period)!.days;
    const from = days === null ? undefined : new Date(Date.now() - days * 86400000).toISOString();
    return rankings(games, profiles, { mode: mode === 'all' ? undefined : mode, from, format });
  }, [games, profiles, mode, period, format]);
  const profileOf = (id: string) => profiles.find((p) => p.id === id)!;

  const row = (r: RankingRow, pos: string, unrankedRow = false) => {
    const p = profileOf(r.playerId);
    return (
      <button key={r.playerId} className={`ranking-row${unrankedRow ? ' unranked' : ''}`} onClick={() => onOpen(r.playerId)}>
        <span className="ranking-pos">{pos}</span>
        <Avatar avatar={p.avatar} color={p.color} size={48} />
        <span className="ranking-name">{r.name}</span>
        <span className="ranking-num">{r.games}</span>
        <span className="ranking-num">{r.wins}</span>
        <span className="ranking-num">{pct(r.winRate)}</span>
        <span className="ranking-num">{mode === 'all' ? '' : num(r.key, mode === 'cricket' ? 2 : mode === 'x01' ? 1 : 0)}</span>
      </button>
    );
  };

  return (
    <div className="screen library">
      <header className="lib-header">
        <button onClick={onBack}>← Accueil</button>
        <h2>Classements</h2>
      </header>
      <div className="lib-filters">
        <Segmented value={mode} options={MODE_FILTERS} onChange={setMode} />
      </div>
      <div className="lib-filters">
        <Segmented value={period} options={PERIODS} onChange={setPeriod} />
        <Segmented value={format} options={FORMAT_FILTERS} onChange={setFormat} />
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
            <span className="ranking-num">{mode === 'all' ? '' : KEY_LABEL[mode]}</span>
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
