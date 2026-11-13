import { useMemo, useState } from 'react';
import type { ExtraMode } from '../../game-engine/types';
import { EXTRA_GAMES, extraGame } from '../../extra-games/catalog';
import { extraPlayerGames, extraSummary, playedExtraModes, type ExtraFilter } from '../../extra-games/stats';
import type { GameRecord } from '../../profiles/types';
import { LineChart, MeterBar } from '../components/Charts';
import { GameIcon } from '../components/GameIcon';
import { dateTime, ND, num, pct } from '../format';
import { MODE_VIEWS } from '../modes';
import { Segmented } from './Profile';

/**
 * Onglet « Autres jeux » de la fiche joueur : statistiques séparées des modes classiques, jeu par jeu.
 * Suit les filtres de format, de période et de saloon de la fiche (pas le filtre de mode classique).
 */
export function ExtrasTab({ records, playerId, filter }: { records: GameRecord[]; playerId: string; filter: ExtraFilter }) {
  const all = useMemo(() => extraPlayerGames(records, playerId, filter), [records, playerId, filter.format, filter.from, filter.to]);
  const played = playedExtraModes(all);
  const [choice, setChoice] = useState<ExtraMode | 'all'>('all');
  const mode = choice !== 'all' && played.includes(choice) ? choice : 'all';
  const games = mode === 'all' ? all : all.filter((g) => g.state.config.mode === mode);
  const s = extraSummary(games, mode === 'all' ? undefined : mode);
  const def = mode === 'all' ? null : extraGame(mode);

  if (all.length === 0) {
    return (
      <div className="lib-empty">
        Aucune partie d’autres jeux terminée pour ces filtres. Lance-en une depuis la tuile « Autres jeux » de l’accueil.
      </div>
    );
  }

  return (
    <div className="profile-body">
      <div className="profile-stats">
        <div className="lib-filters">
          <Segmented
            value={mode}
            options={[
              { value: 'all' as const, label: 'Tous' },
              ...EXTRA_GAMES.filter((g) => played.includes(g.id)).map((g) => ({
                value: g.id,
                label: g.name,
              })),
            ]}
            onChange={setChoice}
          />
        </div>
        <div className="tiles tiles-5">
          <div className="tile">
            <span className="tile-value">{s.played}</span>
            <span className="tile-label">Parties terminées</span>
          </div>
          <div className="tile">
            <span className="tile-value">{s.wins}</span>
            <span className="tile-label">Victoires</span>
          </div>
          <div className="tile">
            <span className="tile-value">{s.losses}</span>
            <span className="tile-label">Défaites</span>
          </div>
          <div className="tile">
            <span className={`tile-value ${s.winRate === null ? 'nd' : ''}`}>{pct(s.winRate)}</span>
            <span className="tile-label">Taux de victoire</span>
          </div>
          <div className="tile">
            <span className="tile-value">{s.darts.toLocaleString('fr-FR')}</span>
            <span className="tile-label">Fléchettes lancées</span>
          </div>
        </div>
        <MeterBar
          label="Taux de victoire"
          share={s.winRate}
          detail={`${s.wins} victoire${s.wins > 1 ? 's' : ''} sur ${s.played} partie${s.played > 1 ? 's' : ''}`}
        />
        {def ? (
          <>
            <div className="tiles tiles-3">
              <div className="tile">
                <span className={`tile-value ${s.best === null ? 'nd' : ''}`}>{s.best ?? ND}</span>
                <span className="tile-label">{def.score.label}</span>
              </div>
              <div className="tile">
                <span className={`tile-value ${s.average === null ? 'nd' : ''}`}>{s.average === null ? ND : num(s.average, 1)}</span>
                <span className="tile-label">Moyenne par partie</span>
              </div>
              <div className="tile">
                <span className={`tile-value ${s.progression === null ? 'nd' : ''}`}>
                  {s.progression === null ? ND : `${s.progression > 0 ? '+' : ''}${num(s.progression, 1)}`}
                </span>
                <span className="tile-label">Progression (5 dernières parties contre les 5 d’avant)</span>
              </div>
            </div>
            {s.series.length > 1 && (
              <LineChart
                title={`${def.score.label.replace(/^Meilleur(e)? /, '')} partie par partie`}
                points={s.series.map((p) => ({
                  label: new Date(p.endedAt).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'short',
                  }),
                  value: p.value,
                  tip: `${p.value} · ${dateTime(p.endedAt)}`,
                }))}
                digits={0}
              />
            )}
          </>
        ) : (
          <div className="tile-detail">Choisis un jeu pour voir son record, sa moyenne et sa progression.</div>
        )}
      </div>
      <div className="profile-stats">
        <h3 className="label">Historique</h3>
        <ol className="history-list">
          {games.slice(0, 60).map((g) => {
            const { config } = g.record.session;
            const nameOf = (id: string) => g.record.players.find((p) => p.id === id)?.name ?? '?';
            const sideName = (i: number) => (config.teamMode ? config.sides[i]!.name : nameOf(config.sides[i]!.playerIds[0]!));
            const gameDef = extraGame(config.mode as ExtraMode);
            const rank = g.state.ranking.find((e) => e.sideIndex === g.sideIndex)?.rank ?? 0;
            const others = config.sides
              .flatMap((x) => x.playerIds)
              .filter((id) => id !== playerId)
              .map(nameOf);
            const value = gameDef.score.of(g.state, g.sideIndex);
            return (
              <li key={g.record.id}>
                <span className="history-mode">
                  <GameIcon def={gameDef} size={28} />{' '}
                  {MODE_VIEWS[config.mode].title({
                    state: g.state,
                    nameOf,
                    sideName,
                  })}
                </span>
                <span className={`history-result ${g.won ? 'win' : ''}`}>{g.won ? 'Victoire' : `${rank}e sur ${config.sides.length}`}</span>
                <span className="history-meta">
                  {dateTime(g.endedAt)} · {gameDef.score.label.replace(/^Meilleur(e)? /, '')} : {value ?? ND} ·{' '}
                  {others.length ? `avec ${others.join(', ')}` : 'seul'}
                </span>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
