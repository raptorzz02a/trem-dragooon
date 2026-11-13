import { BULL } from '../../../game-engine/darts';
import { formatTarget, type HalveItState } from '../../../game-engine/extra/halveit';
import type { GameState } from '../../../game-engine/types';
import { ZoneInput } from '../../components/ZoneInput';
import { zone } from '../../../game-engine/extra/zones';
import type { HalveTarget } from '../../../game-engine/types';

const toZone = (t: HalveTarget) => zone(t.segment, t.multiplier === 2 ? 'D' : t.multiplier === 3 ? 'T' : 'any');
import { ListBoard } from '../ListBoard';
import type { ModeView } from '../types';

const hv = (state: GameState) => state.mode as HalveItState;
const roundOf = (state: GameState) => state.current?.round ?? state.turns.at(-1)?.round ?? 0;
const plural = (n: number, word: string) => `${n} ${word}${n > 1 ? 's' : ''}`;
const halvings = (state: GameState, side: number) => hv(state).log.filter((t) => t.side === side && t.halvedFrom !== undefined).length;

export const halveitView: ModeView = {
  title: () => 'Halve It',
  hero: ({ state }) => ({
    label: 'À viser',
    value: formatTarget(hv(state).targets[roundOf(state)]!),
  }),
  hint: ({ state }) => {
    const round = roundOf(state);
    return (
      <span className="target-strip">
        {hv(state).targets.map((t, i) => (
          <span key={i} className={i === round ? 'current' : i < round ? 'done' : ''}>
            {formatTarget(t)}
          </span>
        ))}
      </span>
    );
  },
  dartNote: (d) => (d.points > 0 ? `+${d.points}` : '0'),
  volleyTotal: (darts) => {
    const total = darts.reduce((a, d) => a + d.points, 0);
    return total > 0 ? `+${total}` : '0';
  },
  turnResult: (turn, ctx) => {
    const entry = [...hv(ctx.state).log].reverse().find((t) => t.side === turn.sideIndex && t.round === turn.round);
    const who = ctx.nameOf(turn.playerId);
    if (entry?.halvedFrom !== undefined) {
      return {
        text: `${who} rate la cible : ${entry.halvedFrom} ÷ 2 = ${Math.floor(entry.halvedFrom / 2)}`,
        bad: true,
      };
    }
    return {
      text: `${who} : +${entry?.gained ?? 0} sur le ${formatTarget(hv(ctx.state).targets[turn.round]!)}`,
    };
  },
  endSummary: ({ state }) =>
    state.winners.length === 1 ? (
      <div className="end-darts">
        <strong>{hv(state).scores[state.winners[0]!]} points</strong> · score divisé{' '}
        {plural(halvings(state, state.winners[0]!), 'fois').replace('foiss', 'fois')}
      </div>
    ) : null,
  rankValue: (r, { state }) => `${r.value} pts · ÷2 × ${halvings(state, r.sideIndex)}`,
  board: (ctx) => (
    <ListBoard
      ctx={ctx}
      row={(i) => {
        const last = [...hv(ctx.state).log].reverse().find((t) => t.side === i);
        const extra =
          last?.halvedFrom !== undefined ? (
            <span className="board-chip bad">÷2</span>
          ) : last ? (
            <span className="board-chip">+{last.gained}</span>
          ) : null;
        return { value: hv(ctx.state).scores[i]!, extra };
      }}
    />
  ),
  input: ({ state }, onDart, disabled) => (
    <ZoneInput target={toZone(hv(state).targets[roundOf(state)]!)} disabled={disabled} onDart={onDart} />
  ),
  pad: ({ state }) => {
    const t = hv(state).targets[roundOf(state)]!;
    return t.segment === BULL ? { highlightBull: 'any' } : { highlight: t.segment };
  },
};
