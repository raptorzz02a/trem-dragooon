import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { trainingAverage } from '../../game-engine/modes/training';
import { ListBoard } from './ListBoard';
const tr = (state) => state.mode;
const sum = (points) => points.reduce((a, b) => a + b, 0);
/** Moyenne sur 3 fléchettes, à la française. */
const avg = (state, side) => {
    const a = trainingAverage(tr(state), side);
    return a === null ? '–' : a.toLocaleString('fr-FR', { maximumFractionDigits: 1 });
};
const plural = (n, word) => `${n} ${word}${n > 1 ? 's' : ''}`;
export const trainingView = {
    title: () => 'Entraînement',
    hero: ({ state }, side) => ({ label: 'Points', value: tr(state).scores[side] }),
    hint: ({ state }) => {
        const side = state.current?.sideIndex ?? 0;
        return (_jsxs(_Fragment, { children: [_jsx("span", { className: "label", children: "Fl\u00E9chettes" }), " ", tr(state).darts[side], " \u00B7 ", _jsx("span", { className: "label", children: "moy. 3 fl." }), " ", avg(state, side)] }));
    },
    dartNote: (d) => `+${d.points}`,
    volleyTotal: (darts) => String(sum(darts.map((d) => d.points))),
    turnResult: (turn, ctx) => ({ text: `${ctx.nameOf(turn.playerId)} : ${plural(sum(turn.darts.map((d) => d.points)), 'point')}` }),
    winLabel: ({ state }) => (state.config.sides.length > 1 ? 'Entraînement terminé · meilleur total' : 'Entraînement terminé'),
    rankValue: (r, { state }) => `${r.value} pts · ${plural(tr(state).darts[r.sideIndex], 'fléchette')} · moy. 3 fl. ${avg(state, r.sideIndex)}`,
    board: (ctx) => (_jsx(ListBoard, { ctx: ctx, row: (i) => ({ value: tr(ctx.state).scores[i], detail: `moy. ${avg(ctx.state, i)}` }) })),
    pad: () => ({}),
};
