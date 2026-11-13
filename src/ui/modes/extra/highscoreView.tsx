import type { HighScoreState } from '../../../game-engine/extra/highscore';
import type { GameState, HighScoreOptions } from '../../../game-engine/types';
import { ListBoard } from '../ListBoard';
import type { ModeView } from '../types';

const hs = (state: GameState) => state.mode as HighScoreState;
const sum = (points: number[]) => points.reduce((a, b) => a + b, 0);
const plural = (n: number, word: string) => `${n} ${word}${n > 1 ? 's' : ''}`;
/** Moyenne sur 3 fléchettes, à la française. */
const avg = (state: GameState, side: number) => {
  const n = hs(state).darts[side]!;
  return n
    ? ((3 * hs(state).scores[side]!) / n).toLocaleString('fr-FR', {
        maximumFractionDigits: 1,
      })
    : '–';
};

export const highscoreView: ModeView = {
  title: ({ state }) => `High Score · ${(state.config.options as HighScoreOptions).rounds} manches`,
  hero: ({ state }, side) => ({
    label: 'Total',
    value: hs(state).scores[side]!,
  }),
  hint: ({ state }) => {
    const rounds = hs(state).rounds;
    const round = (state.current?.round ?? state.turns.at(-1)?.round ?? 0) + 1;
    return (
      <>
        <span className="label">Manche</span> {round} / {rounds}
        <span className="hint-bar">
          <span style={{ width: `${(100 * round) / rounds}%` }} />
        </span>
      </>
    );
  },
  dartNote: (d) => `+${d.points}`,
  volleyTotal: (darts) => String(sum(darts.map((d) => d.points))),
  turnResult: (turn, ctx) => ({
    text: `${ctx.nameOf(turn.playerId)} : ${plural(sum(turn.darts.map((d) => d.points)), 'point')}`,
  }),
  endSummary: ({ state }) => {
    if (state.winners.length !== 1) return null;
    return (
      <div className="end-darts">
        Total de <strong>{hs(state).scores[state.winners[0]!]} points</strong> · moy. 3 fl. {avg(state, state.winners[0]!)}
      </div>
    );
  },
  rankValue: (r, { state }) => `${r.value} pts · moy. 3 fl. ${avg(state, r.sideIndex)}`,
  board: (ctx) => (
    <ListBoard
      ctx={ctx}
      row={(i) => ({
        value: hs(ctx.state).scores[i]!,
        detail: `moy. ${avg(ctx.state, i)}`,
      })}
    />
  ),
  pad: () => ({}),
};
