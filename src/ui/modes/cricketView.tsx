import { BULL } from '../../game-engine/darts';
import { CRICKET_NUMBERS, type CricketState } from '../../game-engine/modes/cricket';
import type { CricketOptions, GameState, ThrownDart } from '../../game-engine/types';
import type { ModeView, ViewContext } from './types';

const cr = (state: GameState) => state.mode as CricketState;
const MARK = ['', '╱', '✕', 'ⓧ'];
const label = (n: number) => (n === BULL ? 'Bull' : String(n));

/** Marques réellement posées par une fléchette (0 si le numéro ne compte pas). */
function marksOf(d: ThrownDart, state: GameState): number {
  return cr(state).targets.includes(d.dart.segment) ? d.dart.multiplier : 0;
}

function CricketBoard({ ctx }: { ctx: ViewContext }) {
  const { state } = ctx;
  const s = cr(state);
  const sides = state.config.sides;
  const active = state.current?.sideIndex;
  return (
    <table className="cricket">
      <thead>
        <tr>
          <th />
          {sides.map((side, i) => (
            <th key={side.id} className={i === active ? 'active' : ''} style={{ color: side.color }}>
              {ctx.sideName(i)}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {s.targets.map((n, t) => {
          const closedByAll = s.marks.every((row) => row[t]! >= 3);
          return (
            <tr key={n} className={closedByAll ? 'closed' : ''}>
              <th>{label(n)}</th>
              {sides.map((side, i) => (
                <td key={side.id} className={`mark mark-${s.marks[i]![t]} ${i === active ? 'active' : ''}`}>
                  {MARK[s.marks[i]![t]!]}
                </td>
              ))}
            </tr>
          );
        })}
        <tr className="cricket-points">
          <th>Pts</th>
          {sides.map((side, i) => (
            <td key={side.id} className={i === active ? 'active' : ''}>
              {s.points[i]}
            </td>
          ))}
        </tr>
      </tbody>
    </table>
  );
}

export const cricketView: ModeView = {
  title: ({ state }) => {
    const o = state.config.options as CricketOptions;
    return `Cricket${o.variant === 'cutthroat' ? ' Cut-Throat' : ''}${o.bull ? '' : ' · sans Bull'}`;
  },
  hero: ({ state }, side) => ({ label: 'Points', value: cr(state).points[side]! }),
  hint: ({ state }) => {
    const side = state.current?.sideIndex;
    if (side === undefined) return null;
    const s = cr(state);
    const open = s.targets.filter((_, t) => s.marks[side]![t]! < 3);
    return open.length ? (
      <>
        <span className="label">À fermer</span> {open.map(label).join(' · ')}
      </>
    ) : (
      'Tout est fermé : marque des points !'
    );
  },
  dartNote: (d, { state }) => (d.points > 0 ? `+${d.points}` : marksOf(d, state) ? MARK[marksOf(d, state)]! : '—'),
  volleyTotal: (darts, { state }) => `${darts.reduce((a, d) => a + marksOf(d, state), 0)} m.`,
  turnResult: (turn, ctx) => {
    const marks = turn.darts.reduce((a, d) => a + marksOf(d, ctx.state), 0);
    const points = turn.darts.reduce((a, d) => a + d.points, 0);
    return { text: `${ctx.nameOf(turn.playerId)} : ${marks} marque${marks > 1 ? 's' : ''}${points ? `, ${points} points` : ''}` };
  },
  rankValue: (r) => `${r.value} pts`,
  board: (ctx) => <CricketBoard ctx={ctx} />,
  pad: () => ({ numbers: [...CRICKET_NUMBERS] }),
};
