import { describe, expect, it } from 'vitest';
import { computeState } from '../game-engine/engine';
import type { GameConfig, X01Options } from '../game-engine/types';
import { config, events, players, teams } from '../test/helpers';
import type { GameRecord, Profile } from './types';
import {
  clockStats,
  cricketStats,
  favouriteHits,
  playerGames,
  rankings,
  shanghaiStats,
  summary,
  x01Stats,
} from './stats';

let n = 0;
/** Archive une partie jouée avec le script donné (voir helpers.events). */
function record(cfg: GameConfig, script: string, endedAt = `2026-10-${String(10 + (n % 18)).padStart(2, '0')}T20:00:00.000Z`): GameRecord {
  const evs = events(script);
  const state = computeState(cfg, evs);
  n++;
  return {
    id: `g${n}`,
    session: {
      id: `g${n}`,
      config: cfg,
      status: state.status === 'finished' ? 'finished' : 'abandoned',
      events: evs,
      corrections: [],
      createdAt: endedAt,
      startedAt: '2026-10-01T20:00:00.000Z',
      endedAt,
    },
    players: cfg.sides.flatMap((s) => s.playerIds.map((id) => ({ id, name: id }))),
  };
}

const x01 = (o: Partial<X01Options> = {}, sides = players(2)) => config('x01', { startScore: 301, ...o }, sides);

const profile = (id: string, name = id): Profile => ({
  id,
  name,
  color: '#1E5535',
  avatar: { skin: 0, hair: 0, hairColor: 0, facialHair: 0, glasses: 0, hat: 0 },
  createdAt: '2026-10-01T00:00:00.000Z',
});

// 301 Double Out : p1 finit en 3 volées (180 + 81 + 40), p2 joue des 1.
const x01Win = 'T20 T20 T20 S1 S1 S1 T20 T7 / S1 S1 S1 D20';

describe('Statistiques', () => {
  it('ne retient que les parties terminées du joueur, plus récentes en premier', () => {
    const a = record(x01(), x01Win, '2026-10-02T20:00:00.000Z');
    const b = record(x01(), x01Win, '2026-10-05T20:00:00.000Z');
    const abandoned = record(x01(), 'T20');
    const other = record(x01({}, players(3).slice(2)), '');
    const games = playerGames([a, abandoned, b, other], 'p1');
    expect(games.map((g) => g.record.id)).toEqual([b.id, a.id]);
  });

  it('compte victoires, défaites et taux de victoire hors entraînement', () => {
    const training = x01({}, players(1));
    const recs = [record(x01(), x01Win), record(training, 'T20 T20 T20 T20 T7 D20')];
    const s1 = summary(playerGames(recs, 'p1'));
    expect(s1).toMatchObject({ played: 2, competitive: 1, wins: 1, losses: 0, winRate: 100, soloWins: 1 });
    expect(summary(playerGames(recs, 'p2'))).toMatchObject({ wins: 0, losses: 1, winRate: 0 });
  });

  it('une victoire d’équipe compte pour chaque membre', () => {
    // Équipe 1 : p1 et p2 en alternance. p1 lance 180, p3 des 1, p2 lance 81, p3 des 1, p1 finit sur D20.
    const cfg = x01({}, teams(2, 1));
    const rec = record(cfg, 'T20 T20 T20 S1 S1 S1 T20 T7 / S1 S1 S1 D20');
    for (const id of ['p1', 'p2']) expect(summary(playerGames([rec], id))).toMatchObject({ wins: 1, teamWins: 1, soloWins: 0 });
    expect(summary(playerGames([rec], 'p3')).wins).toBe(0);
    expect(playerGames([rec], 'p1', { format: 'solo' })).toHaveLength(0);
  });

  it('filtre par mode et par période', () => {
    const recs = [record(x01(), x01Win, '2026-09-01T00:00:00.000Z'), record(x01(), x01Win, '2026-10-20T00:00:00.000Z')];
    expect(playerGames(recs, 'p1', { from: '2026-10-01' })).toHaveLength(1);
    expect(playerGames(recs, 'p1', { mode: 'cricket' })).toHaveLength(0);
  });

  it('X01 : moyennes, records, 180 et réussite aux doubles', () => {
    const [s] = x01Stats(playerGames([record(x01(), x01Win)], 'p1'));
    expect(s).toMatchObject({
      variant: '301 · Double Out',
      volleys: 3,
      darts: 6,
      bestVolley: 180,
      bestCheckout: 40,
      max180: 1,
      busts: 0,
      doubleRate: 100,
    });
    expect(s!.avgVolley).toBeCloseTo(301 / 3);
    expect(s!.avgDart).toBeCloseTo(301 / 6);
  });

  it('X01 : un bust compte 0 point et les doubles manqués font baisser la réussite', () => {
    // p1 : 180, puis 81 (reste 40), puis S20 S19 (bust à 1, retour à 40), puis D20.
    const script = 'T20 T20 T20 S1 S1 S1 T20 T7 / S1 S1 S1 S20 S19 S1 S1 S1 D20';
    const [s] = x01Stats(playerGames([record(x01(), script)], 'p1'));
    expect(s!.busts).toBe(1);
    expect(s!.volleys).toBe(4);
    expect(s!.avgVolley).toBeCloseTo(301 / 4);
    // Tentatives : à 40 (S20), à 20 (S19), puis à 40 avec D20 réussi.
    expect(s!.doubleRate).toBeCloseTo(100 / 3);
  });

  it('X01 : les variantes sont séparées', () => {
    const recs = [record(x01(), x01Win), record(x01({ out: 'straight' }), 'T20 T20 T20 S1 S1 S1 T20 T20 S1')];
    expect(x01Stats(playerGames(recs, 'p1')).map((s) => s.variant).sort()).toEqual(['301 · Double Out', '301 · Sortie simple']);
  });

  it('Cricket : marques par volée', () => {
    const script = 'T20 T20 S5 S1 S1 S1 T19 S19 / S1 S1 S1';
    const s = cricketStats(playerGames([record(config('cricket', { maxRounds: 2 }), script)], 'p1'));
    expect(s.marks).toBe(6 + 4);
    expect(s.mpr).toBeCloseTo(10 / 2);
  });

  it('Horloge : meilleur parcours en fléchettes', () => {
    const solo = config('clock', { bullFinish: 'none' }, players(1));
    const all20 = Array.from({ length: 20 }, (_, i) => `S${i + 1}`).join(' ');
    const s = clockStats(playerGames([record(solo, all20), record(solo, `S5 ${all20}`)], 'p1'));
    expect(s.completions).toBe(2);
    expect(s.best).toEqual([{ variant: '1→20 · toutes zones · Bull non', darts: 20 }]);
  });

  it('Shanghai : meilleur score et Shanghai réussi', () => {
    const rec = record(config('shanghai', { rounds: 7 }, players(1)), 'S1 D1 T1');
    const s = shanghaiStats(playerGames([rec], 'p1'));
    expect(s).toMatchObject({ games: 1, bestScore: 6, bestVolley: 6, shanghais: 1 });
  });

  it('numéros favoris en triple et en simple', () => {
    const fav = favouriteHits(playerGames([record(x01(), x01Win)], 'p1'));
    expect(fav.triple).toEqual({ segment: 20, share: 80 });
    expect(fav.single).toBeNull();
  });
});

describe('Classements', () => {
  const profiles = [profile('p1', 'Alice'), profile('p2', 'Bruno'), profile('p3', 'Chloé')];
  const p2Wins = 'S1 S1 S1 T20 T20 T20 S1 S1 S1 T20 T7 / S1 S1 S1 D20';

  it('trie par taux de victoire et met à part les joueurs sous le minimum de parties', () => {
    const recs = [
      ...Array.from({ length: 4 }, () => record(x01(), x01Win)),
      record(x01(), p2Wins),
      record(x01({}, [players(3)[0]!, players(3)[2]!]), x01Win),
    ];
    const { ranked, unranked } = rankings(recs, profiles);
    expect(ranked.map((r) => [r.name, r.games, r.wins])).toEqual([
      ['Alice', 6, 5],
      ['Bruno', 5, 1],
    ]);
    expect(unranked.map((r) => r.name)).toEqual(['Chloé']);
  });

  it('exclut l’entraînement et les profils supprimés, et donne la statistique clé du mode', () => {
    const recs = [
      record(x01({}, players(1)), 'T20 T20 T20 T20 T7 D20'),
      record(x01(), x01Win),
    ];
    const { unranked } = rankings(recs, [profiles[0]!, { ...profiles[1]!, deleted: true }], { mode: 'x01' });
    expect(unranked).toHaveLength(1);
    expect(unranked[0]).toMatchObject({ name: 'Alice', games: 1, wins: 1 });
    expect(unranked[0]!.key).toBeCloseTo(301 / 3);
  });
});
