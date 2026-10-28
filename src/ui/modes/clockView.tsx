import { currentStep, isFinished, type ClockState, type ClockStep } from '../../game-engine/modes/clock';
import type { ClockOptions, GameState } from '../../game-engine/types';
import { ClockInput } from '../components/ClockInput';
import { ListBoard } from './ListBoard';
import type { ModeView } from './types';

const ck = (state: GameState) => state.mode as ClockState;

function stepLabel(step: ClockStep | null): string {
  if (!step) return 'Fini';
  if ('number' in step) return String(step.number);
  return step.bull === 'any' ? 'Bull' : `Bull ${step.bull}`;
}

const REQUIRED = { any: '', double: ' · doubles', triple: ' · triples' } as const;
const ORDER = { asc: '1 → 20', desc: '20 → 1', board: 'ordre du cadran' } as const;

export const clockView: ModeView = {
  title: ({ state }) => {
    const o = state.config.options as ClockOptions;
    return `Horloge · ${ORDER[o.order]}${REQUIRED[o.required]}`;
  },
  hero: ({ state }, side) => ({ label: 'À viser', value: stepLabel(currentStep(ck(state), side)) }),
  hint: ({ state }) => {
    const s = ck(state);
    const side = state.current?.sideIndex;
    if (side === undefined) return null;
    const total = s.steps.length;
    return (
      <>
        <span className="label">Progression</span> {s.progress[side]} / {total}
        <span className="hint-bar">
          <span style={{ width: `${(100 * s.progress[side]!) / total}%` }} />
        </span>
      </>
    );
  },
  dartLabel: (d) => (d.points > 0 ? `✓ ${d.dart.segment === 25 ? 'Bull' : d.dart.segment}` : '✗'),
  dartNote: () => '',
  volleyTotal: (darts) => `+${darts.reduce((a, d) => a + d.points, 0)}`,
  turnResult: (turn, ctx) => {
    const advance = turn.darts.reduce((a, d) => a + d.points, 0);
    if (isFinished(ck(ctx.state), turn.sideIndex) && turn.outcome === 'done') {
      return { text: `${ctx.nameOf(turn.playerId)} a fini le parcours !` };
    }
    return { text: `${ctx.nameOf(turn.playerId)} : ${advance === 0 ? 'pas de progression' : `avance de ${advance}`}` };
  },
  rankValue: (r, { state }) =>
    isFinished(ck(state), r.sideIndex) ? `${r.value} fléchettes` : `arrêté au ${stepLabel(currentStep(ck(state), r.sideIndex))}`,
  board: (ctx) => (
    <ListBoard
      ctx={ctx}
      row={(i) => {
        const s = ck(ctx.state);
        return { value: stepLabel(currentStep(s, i)), detail: `${s.dartsUsed[i]} fl.` };
      }}
    />
  ),
  input: ({ state }, onDart, disabled) => {
    const s = ck(state);
    const side = state.current?.sideIndex ?? state.turns.at(-1)?.sideIndex ?? 0;
    return (
      <ClockInput
        options={state.config.options as ClockOptions}
        steps={s.steps}
        progress={s.progress[side]!}
        disabled={disabled}
        onDart={onDart}
      />
    );
  },
  pad: ({ state }) => {
    const side = state.current?.sideIndex;
    const step = side === undefined ? null : currentStep(ck(state), side);
    if (!step) return {};
    if ('number' in step) return { highlight: step.number };
    return { highlightBull: step.bull };
  },
};
