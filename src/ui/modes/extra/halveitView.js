import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { BULL } from '../../../game-engine/darts';
import { formatTarget } from '../../../game-engine/extra/halveit';
import { ZoneInput } from '../../components/ZoneInput';
import { zone } from '../../../game-engine/extra/zones';
const toZone = (t) => zone(t.segment, t.multiplier === 2 ? 'D' : t.multiplier === 3 ? 'T' : 'any');
import { ListBoard } from '../ListBoard';
const hv = (state) => state.mode;
const roundOf = (state) => state.current?.round ?? state.turns.at(-1)?.round ?? 0;
const plural = (n, word) => `${n} ${word}${n > 1 ? 's' : ''}`;
const halvings = (state, side) => hv(state).log.filter((t) => t.side === side && t.halvedFrom !== undefined).length;
export const halveitView = {
    title: () => 'Halve It',
    hero: ({ state }) => ({
        label: 'À viser',
        value: formatTarget(hv(state).targets[roundOf(state)]),
    }),
    hint: ({ state }) => {
        const round = roundOf(state);
        return (_jsx("span", { className: "target-strip", children: hv(state).targets.map((t, i) => (_jsx("span", { className: i === round ? 'current' : i < round ? 'done' : '', children: formatTarget(t) }, i))) }));
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
            text: `${who} : +${entry?.gained ?? 0} sur le ${formatTarget(hv(ctx.state).targets[turn.round])}`,
        };
    },
    endSummary: ({ state }) => state.winners.length === 1 ? (_jsxs("div", { className: "end-darts", children: [_jsxs("strong", { children: [hv(state).scores[state.winners[0]], " points"] }), " \u00B7 score divis\u00E9", ' ', plural(halvings(state, state.winners[0]), 'fois').replace('foiss', 'fois')] })) : null,
    rankValue: (r, { state }) => `${r.value} pts · ÷2 × ${halvings(state, r.sideIndex)}`,
    board: (ctx) => (_jsx(ListBoard, { ctx: ctx, row: (i) => {
            const last = [...hv(ctx.state).log].reverse().find((t) => t.side === i);
            const extra = last?.halvedFrom !== undefined ? (_jsx("span", { className: "board-chip bad", children: "\u00F72" })) : last ? (_jsxs("span", { className: "board-chip", children: ["+", last.gained] })) : null;
            return { value: hv(ctx.state).scores[i], extra };
        } })),
    input: ({ state }, onDart, disabled) => (_jsx(ZoneInput, { target: toZone(hv(state).targets[roundOf(state)]), disabled: disabled, onDart: onDart })),
    pad: ({ state }) => {
        const t = hv(state).targets[roundOf(state)];
        return t.segment === BULL ? { highlightBull: 'any' } : { highlight: t.segment };
    },
};
