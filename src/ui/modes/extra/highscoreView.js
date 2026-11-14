import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { ListBoard } from '../ListBoard';
const hs = (state) => state.mode;
const sum = (points) => points.reduce((a, b) => a + b, 0);
const plural = (n, word) => `${n} ${word}${n > 1 ? 's' : ''}`;
/** Moyenne sur 3 fléchettes, à la française. */
const avg = (state, side) => {
    const n = hs(state).darts[side];
    return n
        ? ((3 * hs(state).scores[side]) / n).toLocaleString('fr-FR', {
            maximumFractionDigits: 1,
        })
        : '–';
};
export const highscoreView = {
    title: ({ state }) => `High Score · ${state.config.options.rounds} manches`,
    hero: ({ state }, side) => ({
        label: 'Total',
        value: hs(state).scores[side],
    }),
    hint: ({ state }) => {
        const rounds = hs(state).rounds;
        const round = (state.current?.round ?? state.turns.at(-1)?.round ?? 0) + 1;
        return (_jsxs(_Fragment, { children: [_jsx("span", { className: "label", children: "Manche" }), " ", round, " / ", rounds, _jsx("span", { className: "hint-bar", children: _jsx("span", { style: { width: `${(100 * round) / rounds}%` } }) })] }));
    },
    dartNote: (d) => `+${d.points}`,
    volleyTotal: (darts) => String(sum(darts.map((d) => d.points))),
    turnResult: (turn, ctx) => ({
        text: `${ctx.nameOf(turn.playerId)} : ${plural(sum(turn.darts.map((d) => d.points)), 'point')}`,
    }),
    endSummary: ({ state }) => {
        if (state.winners.length !== 1)
            return null;
        return (_jsxs("div", { className: "end-darts", children: ["Total de ", _jsxs("strong", { children: [hs(state).scores[state.winners[0]], " points"] }), " \u00B7 moy. 3 fl. ", avg(state, state.winners[0])] }));
    },
    rankValue: (r, { state }) => `${r.value} pts · moy. 3 fl. ${avg(state, r.sideIndex)}`,
    board: (ctx) => (_jsx(ListBoard, { ctx: ctx, row: (i) => ({
            value: hs(ctx.state).scores[i],
            detail: `moy. ${avg(ctx.state, i)}`,
        }) })),
    pad: () => ({}),
};
