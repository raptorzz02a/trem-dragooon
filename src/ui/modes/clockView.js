import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { currentStep, isFinished } from '../../game-engine/modes/clock';
import { ClockInput } from '../components/ClockInput';
import { ListBoard } from './ListBoard';
const ck = (state) => state.mode;
function stepLabel(step) {
    if (!step)
        return 'Fini';
    if ('number' in step)
        return String(step.number);
    return step.bull === 'any' ? 'Bull' : `Bull ${step.bull}`;
}
const REQUIRED = { any: '', double: ' · doubles', triple: ' · triples' };
const ORDER = { asc: '1 → 20', desc: '20 → 1', board: 'ordre du cadran' };
export const clockView = {
    title: ({ state }) => {
        const o = state.config.options;
        return `Horloge · ${ORDER[o.order]}${REQUIRED[o.required]}`;
    },
    hero: ({ state }, side) => ({ label: 'À viser', value: stepLabel(currentStep(ck(state), side)) }),
    hint: ({ state }) => {
        const s = ck(state);
        const side = state.current?.sideIndex;
        if (side === undefined)
            return null;
        const total = s.steps.length;
        return (_jsxs(_Fragment, { children: [_jsx("span", { className: "label", children: "Progression" }), " ", s.progress[side], " / ", total, _jsx("span", { className: "hint-bar", children: _jsx("span", { style: { width: `${(100 * s.progress[side]) / total}%` } }) })] }));
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
    rankValue: (r, { state }) => isFinished(ck(state), r.sideIndex) ? `${r.value} fléchettes` : `arrêté au ${stepLabel(currentStep(ck(state), r.sideIndex))}`,
    board: (ctx) => (_jsx(ListBoard, { ctx: ctx, row: (i) => {
            const s = ck(ctx.state);
            return { value: stepLabel(currentStep(s, i)), detail: `${s.dartsUsed[i]} fl.` };
        } })),
    input: ({ state }, onDart, disabled) => {
        const s = ck(state);
        const side = state.current?.sideIndex ?? state.turns.at(-1)?.sideIndex ?? 0;
        return (_jsx(ClockInput, { options: state.config.options, steps: s.steps, progress: s.progress[side], disabled: disabled, onDart: onDart }));
    },
    pad: ({ state }) => {
        const side = state.current?.sideIndex;
        const step = side === undefined ? null : currentStep(ck(state), side);
        if (!step)
            return {};
        if ('number' in step)
            return { highlight: step.number };
        return { highlightBull: step.bull };
    },
};
