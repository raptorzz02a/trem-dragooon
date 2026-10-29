import { computeState } from '../game-engine/engine';
import type { GameConfig } from '../game-engine/types';
import type { GameRecord, Profile } from '../profiles/types';
import { events } from './helpers';

let n = 0;
/** Archive une partie jouée avec le script donné (voir helpers.events). Terminée ou, sinon, abandonnée. */
export function record(cfg: GameConfig, script: string, endedAt = `2026-10-${String(10 + (n % 18)).padStart(2, '0')}T20:00:00.000Z`): GameRecord {
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

export const profile = (id: string, name = id): Profile => ({
  id,
  name,
  color: '#1E5535',
  avatar: { skin: 0, hair: 0, hairColor: 0, facialHair: 0, glasses: 0, hat: 0 },
  createdAt: '2026-10-01T00:00:00.000Z',
});
