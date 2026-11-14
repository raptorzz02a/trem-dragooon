import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { suggestCheckout } from '../../game-engine/checkout';
import { formatDart } from '../../game-engine/darts';
import { ListBoard } from './ListBoard';
const x01 = (state) => state.mode;
const sum = (points) => points.reduce((a, b) => a + b, 0);
/** Moyenne par volée d'un côté : points marqués / volées jouées (un bust compte 0). */
export function x01Average(state, sideIndex) {
    const turns = state.turns.filter((t) => t.sideIndex === sideIndex);
    if (turns.length === 0)
        return 0;
    const scored = sum(turns.map((t) => (t.outcome === 'bust' ? 0 : sum(t.darts.map((d) => d.points)))));
    return scored / turns.length;
}
/** Fléchettes lancées par un côté sur toute la partie (une volée en bust compte ses fléchettes). */
export function x01Darts(state, sideIndex) {
    return sum(state.turns.filter((t) => t.sideIndex === sideIndex).map((t) => t.darts.length));
}
const plural = (n, word) => `${n} ${word}${n > 1 ? 's' : ''}`;
export const x01View = {
    title: ({ state }) => {
        const o = state.config.options;
        return `${o.startScore} · ${o.out === 'double' ? 'Double Out' : 'Sortie simple'}`;
    },
    hero: ({ state }, side) => ({ label: 'Restant', value: x01(state).remaining[side] }),
    hint: () => null,
    heroAside: ({ state }) => {
        const current = state.current;
        if (!current)
            return null;
        const o = state.config.options;
        const checkout = suggestCheckout(x01(state).remaining[current.sideIndex], current.dartsLeft, o.out);
        return checkout ? (_jsxs("div", { className: "hero-checkout", children: [_jsx("div", { className: "label", children: "Finition" }), _jsx("div", { className: "hero-checkout-darts", children: checkout.map((d, i) => (_jsx("span", { className: "hero-checkout-dart", children: formatDart(d) }, i))) })] })) : null;
    },
    dartNote: (d) => String(d.points),
    volleyTotal: (darts) => String(sum(darts.map((d) => d.points))),
    turnResult: (turn, ctx) => turn.outcome === 'bust'
        ? { text: `Bust ! ${ctx.nameOf(turn.playerId)} revient à ${x01(ctx.state).remaining[turn.sideIndex]}`, bad: true }
        : { text: `${ctx.nameOf(turn.playerId)} : ${sum(turn.darts.map((d) => d.points))} points` },
    endSummary: ({ state }) => {
        if (state.winners.length !== 1)
            return null;
        const side = state.winners[0];
        const turns = state.turns.filter((t) => t.sideIndex === side);
        const last = turns.at(-1);
        if (!last)
            return null;
        return (_jsxs("div", { className: "end-darts", children: ["Fini en ", _jsx("strong", { children: plural(x01Darts(state, side), 'fléchette') }), " \u00B7 ", plural(turns.length, 'volée'), " \u00B7 finition", ' ', last.darts.map((d) => formatDart(d.dart)).join(' '), " en ", plural(last.darts.length, 'fléchette')] }));
    },
    rankValue: (r, { state }) => `${r.value === 0 ? 'fini' : `reste ${r.value}`} · ${x01Darts(state, r.sideIndex)} fl. · moy. ${x01Average(state, r.sideIndex).toFixed(1)}`,
    board: (ctx) => (_jsx(ListBoard, { ctx: ctx, row: (i) => ({ value: x01(ctx.state).remaining[i], detail: `moy. ${x01Average(ctx.state, i).toFixed(1)}` }) })),
    pad: () => ({}),
};
