import { BULL } from '../../game-engine/darts';
import { targetOf, type RandomState } from '../../game-engine/modes/random';
import type { GameState, RandomOptions } from '../../game-engine/types';
import { RandomInput } from '../components/RandomInput';
import { ListBoard } from './ListBoard';
import type { ModeView } from './types';

const rd = (state: GameState) => state.mode as RandomState;
const name = (n: number) => (n === BULL ? 'Bull' : String(n));

export const randomView: ModeView = {
  title: ({ state }) => `Chiffre aléatoire · ${(state.config.options as RandomOptions).rounds} tours`,
  hero: ({ state }) => ({ label: 'À viser', value: name(rd(state).target) }),
  hint: ({ state }) => {
    const { rounds } = state.config.options as RandomOptions;
    const round = (state.current?.round ?? state.turns.at(-1)?.round ?? 0) + 1;
    return (
      <>
        <span className="label">Tour</span> {round} / {rounds}
        <span className="hint-bar">
          <span style={{ width: `${(100 * round) / rounds}%` }} />
        </span>
      </>
    );
  },
  dartNote: (d) => (d.points > 0 ? `+${d.points}` : '0'),
  volleyTotal: (darts) => String(darts.reduce((a, d) => a + d.points, 0)),
  turnResult: (turn, ctx) => {
    const points = turn.darts.reduce((a, d) => a + d.points, 0);
    const target = targetOf(ctx.state.config.options as RandomOptions, turn.round);
    return { text: `${ctx.nameOf(turn.playerId)} : ${points} point${points > 1 ? 's' : ''} sur le ${name(target)}` };
  },
  rankValue: (r) => `${r.value} pts`,
  board: (ctx) => <ListBoard ctx={ctx} row={(i) => ({ value: rd(ctx.state).scores[i]! })} />,
  input: ({ state }, onDart, disabled) => <RandomInput target={rd(state).target} disabled={disabled} onDart={onDart} />,
  pad: ({ state }) => {
    const t = rd(state).target;
    return t === BULL ? { highlightBull: 'any' } : { highlight: t };
  },
};
