import { trainingAverage, type TrainingState } from '../../game-engine/modes/training';
import type { GameState } from '../../game-engine/types';
import { ListBoard } from './ListBoard';
import type { ModeView } from './types';

const tr = (state: GameState) => state.mode as TrainingState;
const sum = (points: number[]) => points.reduce((a, b) => a + b, 0);
/** Moyenne sur 3 fléchettes, à la française. */
const avg = (state: GameState, side: number) => {
  const a = trainingAverage(tr(state), side);
  return a === null ? '–' : a.toLocaleString('fr-FR', { maximumFractionDigits: 1 });
};
const plural = (n: number, word: string) => `${n} ${word}${n > 1 ? 's' : ''}`;

export const trainingView: ModeView = {
  title: () => 'Entraînement',
  hero: ({ state }, side) => ({ label: 'Points', value: tr(state).scores[side]! }),
  hint: ({ state }) => {
    const side = state.current?.sideIndex ?? 0;
    return (
      <>
        <span className="label">Fléchettes</span> {tr(state).darts[side]} · <span className="label">moy. 3 fl.</span> {avg(state, side)}
      </>
    );
  },
  dartNote: (d) => `+${d.points}`,
  volleyTotal: (darts) => String(sum(darts.map((d) => d.points))),
  turnResult: (turn, ctx) => ({ text: `${ctx.nameOf(turn.playerId)} : ${plural(sum(turn.darts.map((d) => d.points)), 'point')}` }),
  winLabel: ({ state }) => (state.config.sides.length > 1 ? 'Entraînement terminé · meilleur total' : 'Entraînement terminé'),
  rankValue: (r, { state }) => `${r.value} pts · ${plural(tr(state).darts[r.sideIndex]!, 'fléchette')} · moy. 3 fl. ${avg(state, r.sideIndex)}`,
  board: (ctx) => (
    <ListBoard ctx={ctx} row={(i) => ({ value: tr(ctx.state).scores[i]!, detail: `moy. ${avg(ctx.state, i)}` })} />
  ),
  pad: () => ({}),
};
