import { suggestCheckout } from '../../game-engine/checkout';
import { formatDart } from '../../game-engine/darts';
import type { X01State } from '../../game-engine/modes/x01';
import type { GameState, X01Options } from '../../game-engine/types';
import { ListBoard } from './ListBoard';
import type { ModeView } from './types';

const x01 = (state: GameState) => state.mode as X01State;
const sum = (points: number[]) => points.reduce((a, b) => a + b, 0);

/** Moyenne par volée d'un côté : points marqués / volées jouées (un bust compte 0). */
export function x01Average(state: GameState, sideIndex: number): number {
  const turns = state.turns.filter((t) => t.sideIndex === sideIndex);
  if (turns.length === 0) return 0;
  const scored = sum(turns.map((t) => (t.outcome === 'bust' ? 0 : sum(t.darts.map((d) => d.points)))));
  return scored / turns.length;
}

/** Fléchettes lancées par un côté sur toute la partie (une volée en bust compte ses fléchettes). */
export function x01Darts(state: GameState, sideIndex: number): number {
  return sum(state.turns.filter((t) => t.sideIndex === sideIndex).map((t) => t.darts.length));
}

const plural = (n: number, word: string) => `${n} ${word}${n > 1 ? 's' : ''}`;

export const x01View: ModeView = {
  title: ({ state }) => {
    const o = state.config.options as X01Options;
    return `${o.startScore} · ${o.out === 'double' ? 'Double Out' : 'Sortie simple'}`;
  },
  hero: ({ state }, side) => ({ label: 'Restant', value: x01(state).remaining[side]! }),
  hint: () => null,
  heroAside: ({ state }) => {
    const current = state.current;
    if (!current) return null;
    const o = state.config.options as X01Options;
    const checkout = suggestCheckout(x01(state).remaining[current.sideIndex]!, current.dartsLeft, o.out);
    return checkout ? (
      <div className="hero-checkout">
        <div className="label">Finition</div>
        <div className="hero-checkout-darts">
          {checkout.map((d, i) => (
            <span key={i} className="hero-checkout-dart">
              {formatDart(d)}
            </span>
          ))}
        </div>
      </div>
    ) : null;
  },
  dartNote: (d) => String(d.points),
  volleyTotal: (darts) => String(sum(darts.map((d) => d.points))),
  turnResult: (turn, ctx) =>
    turn.outcome === 'bust'
      ? { text: `Bust ! ${ctx.nameOf(turn.playerId)} revient à ${x01(ctx.state).remaining[turn.sideIndex]}`, bad: true }
      : { text: `${ctx.nameOf(turn.playerId)} : ${sum(turn.darts.map((d) => d.points))} points` },
  endSummary: ({ state }) => {
    if (state.winners.length !== 1) return null;
    const side = state.winners[0]!;
    const turns = state.turns.filter((t) => t.sideIndex === side);
    const last = turns.at(-1);
    if (!last) return null;
    return (
      <div className="end-darts">
        Fini en <strong>{plural(x01Darts(state, side), 'fléchette')}</strong> · {plural(turns.length, 'volée')} · finition{' '}
        {last.darts.map((d) => formatDart(d.dart)).join(' ')} en {plural(last.darts.length, 'fléchette')}
      </div>
    );
  },
  rankValue: (r, { state }) =>
    `${r.value === 0 ? 'fini' : `reste ${r.value}`} · ${x01Darts(state, r.sideIndex)} fl. · moy. ${x01Average(state, r.sideIndex).toFixed(1)}`,
  board: (ctx) => (
    <ListBoard
      ctx={ctx}
      row={(i) => ({ value: x01(ctx.state).remaining[i]!, detail: `moy. ${x01Average(ctx.state, i).toFixed(1)}` })}
    />
  ),
  pad: () => ({}),
};
