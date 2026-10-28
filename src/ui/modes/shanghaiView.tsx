import { shanghaiRemaining, type ShanghaiState } from '../../game-engine/modes/shanghai';
import type { GameState, ShanghaiOptions } from '../../game-engine/types';
import { ListBoard } from './ListBoard';
import type { ModeView } from './types';

const sh = (state: GameState) => state.mode as ShanghaiState;
const ZONE = { 1: 'Simple', 2: 'Double', 3: 'Triple' } as const;

export const shanghaiView: ModeView = {
  title: ({ state }) => {
    const o = state.config.options as ShanghaiOptions;
    return `Shanghai · ${o.rounds} manches${o.shanghaiWins ? '' : ' · sans victoire au Shanghai'}`;
  },
  hero: ({ state }, side) => ({ label: 'Points', value: sh(state).scores[side]! }),
  hint: ({ state }) => {
    const s = sh(state);
    const missing = shanghaiRemaining(s);
    return (
      <>
        <span className="label">Cible</span> le {s.target}
        {(state.config.options as ShanghaiOptions).shanghaiWins && (
          <span className="hint-chips">
            <span className="label">Shanghai</span>
            {([1, 2, 3] as const).map((m) => (
              <span key={m} className={`hint-chip ${missing.includes(m) ? '' : 'done'}`}>
                {ZONE[m]}
              </span>
            ))}
          </span>
        )}
      </>
    );
  },
  dartNote: (d) => (d.points > 0 ? `+${d.points}` : '0'),
  volleyTotal: (darts) => String(darts.reduce((a, d) => a + d.points, 0)),
  turnResult: (turn, ctx) => {
    const points = turn.darts.reduce((a, d) => a + d.points, 0);
    return turn.outcome === 'win'
      ? { text: `Shanghai ! ${ctx.nameOf(turn.playerId)}` }
      : { text: `${ctx.nameOf(turn.playerId)} : ${points} points sur le ${turn.round + 1}` };
  },
  winLabel: ({ state }) => (state.turns.at(-1)?.outcome === 'win' ? 'Shanghai !' : null),
  rankValue: (r) => `${r.value} pts`,
  board: (ctx) => <ListBoard ctx={ctx} row={(i) => ({ value: sh(ctx.state).scores[i]! })} />,
  pad: ({ state }) => ({ highlight: sh(state).target }),
};
