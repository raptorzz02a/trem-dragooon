import { useMemo, useState } from 'react';
import type { ExtraMode } from '../../game-engine/types';
import {
  CATEGORIES,
  EXTRA_GAMES,
  UPCOMING_GAMES,
  extraGame,
  type Category,
  type ExtraGameDef,
  type UpcomingGame,
} from '../../extra-games/catalog';
import { GameIcon } from '../components/GameIcon';
import { RulesDialog } from '../components/RulesDialog';
import './OtherGames.css';

interface Props {
  onBack: () => void;
  onPlay: (mode: ExtraMode) => Promise<void>;
}

type Tab = 'all' | 'recent' | Category;
type PlayersFilter = 'any' | 2 | 3 | 5;
type FormatFilter = 'any' | 'solo' | 'teams';

const RECENT_KEY = 'trem.autresJeux.recents';
const RECENT_MAX = 5;

function readRecent(): ExtraMode[] {
  try {
    const v = JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]');
    return Array.isArray(v) ? v.filter((m): m is ExtraMode => EXTRA_GAMES.some((g) => g.id === m)) : [];
  } catch {
    return [];
  }
}

function pushRecent(mode: ExtraMode) {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify([mode, ...readRecent().filter((m) => m !== mode)].slice(0, RECENT_MAX)));
  } catch {
    /* stockage indisponible : pas de récents */
  }
}

const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Catalogue des « Autres jeux » : grille minimaliste, catégories, recherche, filtres. */
export function OtherGames({ onBack, onPlay }: Props) {
  const [tab, setTab] = useState<Tab>('all');
  const [query, setQuery] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [players, setPlayers] = useState<PlayersFilter>('any');
  const [format, setFormat] = useState<FormatFilter>('any');
  const [rules, setRules] = useState<ExtraGameDef | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recent = useMemo(readRecent, []);

  const matches = (g: { name: string; sub: string; categories: Category[] }) =>
    (!query || fold(`${g.name} ${g.sub}`).includes(fold(query))) && (tab === 'all' || tab === 'recent' || g.categories.includes(tab));
  const playable = (tab === 'recent' ? recent.map(extraGame) : EXTRA_GAMES).filter(
    (g) =>
      matches(g) &&
      (players === 'any' || (g.minPlayers <= players && (players < 5 || g.maxPlayers >= 5))) &&
      (format === 'any' || (format === 'teams' ? g.teams : true)),
  );
  // Les jeux à venir n'ont pas encore de règles fixées : ils ne suivent que la recherche et les catégories.
  const upcoming = tab === 'recent' || format === 'teams' ? [] : UPCOMING_GAMES.filter(matches);
  const filterCount = (players !== 'any' ? 1 : 0) + (format !== 'any' ? 1 : 0);

  const play = async (def: ExtraGameDef) => {
    setBusy(true);
    setError(null);
    pushRecent(def.id);
    try {
      await onPlay(def.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Serveur en ligne injoignable.');
      setBusy(false);
    }
  };

  const tabs: { value: Tab; label: string }[] = [
    { value: 'all', label: 'Tous' },
    ...(recent.length ? [{ value: 'recent' as const, label: 'Récents' }] : []),
    ...CATEGORIES,
  ];

  return (
    <div className="screen other-games">
      <header className="og-header">
        <button onClick={onBack}>← Accueil</button>
        <h2>Autres jeux</h2>
        <span className="og-place">Même cible</span>
      </header>

      <div className="og-tools">
        <input
          className="og-search"
          type="search"
          placeholder="Rechercher un jeu"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Rechercher un jeu"
        />
        <button
          className={`og-filters-btn${filterCount ? ' on' : ''}`}
          onClick={() => setFiltersOpen((o) => !o)}
          aria-expanded={filtersOpen}
        >
          Filtres{filterCount ? ` · ${filterCount}` : ''}
        </button>
      </div>
      {filtersOpen && (
        <div className="og-filters">
          <span className="label">Joueurs</span>
          <div className="segmented">
            {(['any', 2, 3, 5] as const).map((v) => (
              <button key={v} className={players === v ? 'selected' : ''} onClick={() => setPlayers(v)}>
                {v === 'any' ? 'Tous' : v === 5 ? '5 et +' : v}
              </button>
            ))}
          </div>
          <span className="label">Formule</span>
          <div className="segmented">
            {(
              [
                ['any', 'Tous'],
                ['solo', 'Individuel'],
                ['teams', 'Équipes'],
              ] as const
            ).map(([v, label]) => (
              <button key={v} className={format === v ? 'selected' : ''} onClick={() => setFormat(v)}>
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      <nav className="og-pills">
        {tabs.map((t) => (
          <button key={t.value} className={tab === t.value ? 'selected' : ''} onClick={() => setTab(t.value)}>
            {t.label}
          </button>
        ))}
      </nav>

      {error && <div className="home-warning">{error}</div>}

      <div className="og-grid">
        {playable.map((g) => (
          <div key={g.id} className="og-card">
            <button className="og-card-main" disabled={busy} onClick={() => void play(g)}>
              <GameIcon def={g} size={64} />
              <span className="og-name">{g.name}</span>
              <span className="og-sub">{g.sub}</span>
            </button>
            <button className="og-info" aria-label={`Règles de ${g.name}`} onClick={() => setRules(g)}>
              i
            </button>
          </div>
        ))}
        {upcoming.map((g: UpcomingGame) => (
          <div key={g.name} className="og-card soon" aria-disabled="true">
            <div className="og-card-main">
              <GameIcon def={g} size={64} />
              <span className="og-name">{g.name}</span>
              <span className="og-sub">{g.sub}</span>
            </div>
            <span className="og-soon">Bientôt</span>
          </div>
        ))}
      </div>
      {playable.length + upcoming.length === 0 && <div className="lib-empty">Aucun jeu pour ces filtres.</div>}

      {rules && (
        <RulesDialog
          def={rules}
          onClose={() => setRules(null)}
          onPlay={() => {
            const def = rules;
            setRules(null);
            void play(def);
          }}
        />
      )}
    </div>
  );
}
